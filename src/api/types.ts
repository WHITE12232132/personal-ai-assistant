export interface ApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 流式过程的三个生命节点，各自一个回调 */
export interface StreamCallbacks {
  onChunk: (accumulated: string) => void;  // 每解析出一帧：传「到目前为止的完整文本」
  onDone: (finalText: string) => void;     // 流正常走完
  onError: (message: string) => void;      // 网络炸/协议错
}