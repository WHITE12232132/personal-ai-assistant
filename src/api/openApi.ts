import type { ApiMessage, StreamCallbacks } from './types';
import { fetch } from 'expo/fetch';
import { getApiConfig } from './config';



type ChatChunk = {                 // 给"对象形状"起名叫 ChatChunk
  choices?: Array<{              // choices?: 可能没有；有则是个数组
    delta?: {                  // 数组每项是个对象，里面有 delta（也可能没有）
      content?: string | null;           // 字符串 或 null 或不存在
      reasoning_content?: string | null; // 同上
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type ParseResult = {
  content: string;   // 必有，文本（本批新解析出的正文）
  done: boolean;     // 必有，真/假
  error?: string;    // 可有可无：没出错就整个字段不存在
  carry: string;     // 必有，文本（半帧残余；没有残余就是空串 ""）
};

export function parseStreamData(chunk: string, carry: string): ParseResult {
  const frames = (carry + chunk).split('\n\n');   // ① 先拼后切
  const rest = frames.pop() ?? '';                // ② 最后一段 = 可能的半帧，拿走存好
  let content = '';                  // 正文增量累加器
  let done = false;                  // 见到 [DONE] 置真
  let error: string | undefined;     // 不赋值 = undefined = ParseResult.error 的"可有可无"

  for (const raw of frames) {
    const frame = raw.trim();
    if (!frame) continue;                          // 空帧（如情况 1 尾部的 ""）跳过

    // 一帧可能有多行（SSE 规范）：只认 data: 行；": processing" 心跳、event: 行一律无视
    const payload = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n')
      .trim();
    if (!payload) continue;                        // 纯注释/心跳帧 → 跳过
    if (payload === '[DONE]') { done = true; continue; }   // 哨兵帧：结束信号
    if (!payload.startsWith('{')) continue;        // "processing" 这类标记文本 → 跳过

    try {
      const json = JSON.parse(payload) as ChatChunk;   // 字符串 → 对象（照画像认字段）
      const delta = json.choices?.[0]?.delta;
      if (delta?.content) content += delta.content;  // 正文增量进累加器
    } catch {
      error = 'SSE 帧解析失败: ' + payload.slice(0, 100);  // 真·坏 JSON：记一笔，不炸整个流
    }
  }

  return { content, done, error, carry: rest };
}


export async function chatStream(
  messages: ApiMessage[],   // 对话历史（时间正序，调用方负责排好）
  cb: StreamCallbacks,      // 三个生命节点回调
  signal: AbortSignal,      // 中断令牌（8/3 的停止键用）
): Promise<void> {
  let full = '';    // 累积全文——onChunk 传的就是它
  let carry = '';   // 粘包记忆——喂回 parseStreamData 的第二参数

  const cfg = await getApiConfig();

  if (!cfg.apiKey) {
    cb.onError('未配置 API Key，请到 设置 → 服务商管理 填写');
    return;
  }

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,             // 原样透传，不加工
      stream: true,
    }),
    signal,                   // ← 中断入口，接通 AbortController
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn('[chatStream] HTTP错误', res.status, body);   // console 通道也开一扇门
    cb.onError(`HTTP ${res.status}: ${body}`);
    return;                   // 错误也是一种完整交代，就此收工
  }
  if (!res.body) {
    console.warn('[chatStream] res.body 为空');
    cb.onError('res.body 为空');
    return;
  }
  //从响应体里一块块读字节
  const reader = res.body.getReader();
  // 创建一个 TextDecoder 实例，用于将字节流转换为文本
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // 将字节流转换为文本 且为stream 模式
      const text = decoder.decode(value, { stream: true });
      const parsed = parseStreamData(text, carry);
      carry = parsed.carry;                 // ① 半帧记忆存回

      if (parsed.error) {
        console.warn('[chatStream]', parsed.error);   // 气泡会显示，console 也留档
        cb.onError(parsed.error);         // ② 坏帧：交代后收工
        return;
      }
      if (parsed.content) {
        full += parsed.content;            // ③ 先攒
        cb.onChunk(full);                  //   再汇报全量
      }
      if (parsed.done) {
        cb.onDone(full);                   // ④ [DONE]：正式收官
        return;
      }
    }
    cb.onDone(full);      // ⑤ 循环自然结束（服务端没发 [DONE] 就断）——也算完
  } catch (e) {
    if (signal.aborted) {
      cb.onDone(full);                     // 用户主动停止：半截正文保留，按完成收
    } else {
      console.warn('[chatStream] 网络错误', e);
      cb.onError('网络错误: ' + String(e));  // 真炸了：断网、DNS、超时……
    }
  }
}
