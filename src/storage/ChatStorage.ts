
import type { Message, SessionMeta } from '@/chat/types';
import { storage } from './StorageUtils';


export async function saveMessages(sessionId: string, messages: Message[]): Promise<void> {
  await storage.set(sessionPrefix + sessionId, JSON.stringify(messages));
}



export async function loadMessages(sessionId: string): Promise<Message[]> {
  const raw = await storage.getString(sessionPrefix + sessionId);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}
/** 清空聊天记录 */



// 钥匙1：目录。正文钥匙 beaster/session/<id> 等下再加
const sessionListKey = 'beaster/sessionList';

function isSessionMeta(value: unknown): value is SessionMeta {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.title === 'string' &&
    typeof s.createdAt === 'number' &&
    typeof s.updatedAt === 'number'
  );
}

export async function getSessionMetas(): Promise<SessionMeta[]> {
  const raw = await storage.getString(sessionListKey);   // ① 读盘，拿到原始字符串
  if (!raw) return [];                                   // ② 没存过 = 空目录，直接返回
  try {
    const parsed = JSON.parse(raw) as unknown;           // ③ 字符串 → JS 对象
    const metas = Array.isArray(parsed) ? parsed.filter(isSessionMeta) : []; // ④ 校验
    return metas.sort((a, b) => b.updatedAt - a.updatedAt);                  // ⑤ 近聊的排前
  } catch {
    return [];                                           // ⑥ JSON 坏了也不崩，当空目录
  }
}

async function saveSessionMetas(metas: SessionMeta[]): Promise<void> {
  await storage.set(sessionListKey, JSON.stringify(metas));
}

const sessionPrefix = 'beaster/session/';
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 新建会话：目录加一行
export async function createSession(title = '新会话'): Promise<SessionMeta> {
  const now = Date.now();
  const meta: SessionMeta = { id: generateId(), title, createdAt: now, updatedAt: now };
  const metas = await getSessionMetas();
  await saveSessionMetas([...metas, meta]);   // 旧目录 + 新的一行
  return meta;
}

// 删除会话：目录划一行 + 正文撕掉
export async function deleteSession(id: string): Promise<void> {
  const metas = await getSessionMetas();
  await saveSessionMetas(metas.filter((m) => m.id !== id)); // ① 账本划掉
  await storage.delete(sessionPrefix + id);                 // ② 正文撕掉
  if ((await getCurrentSessionId()) === id) {
    await setCurrentSessionId(null);                        // ③ 别留悬空便利贴
  }
}


const currentSessionIdKey = 'beaster/currentSessionId';  // 钥匙3

// 读便利贴：没贴过就返回 null
export async function getCurrentSessionId(): Promise<string | null> {
  return storage.getString(currentSessionIdKey);
}

// 写便利贴：传 null = 撕掉（不留悬空指针）
export async function setCurrentSessionId(id: string | null): Promise<void> {
  if (id === null) {
    await storage.delete(currentSessionIdKey);
  } else {
    await storage.set(currentSessionIdKey, id);
  }
}


// 标题生成（对标源码 saveMessageList：首条消息前 50 字，换行转空格）
export function makeSessionTitle(content: string): string {
  return content.slice(0, 50).replace(/\n/g, ' ');
}

// 发消息时调用：带 title = 第一条消息，定标题；不带 = 只刷最后发言时间
export async function touchSession(id: string, title?: string): Promise<void> {
  const metas = await getSessionMetas();
  const now = Date.now();
  await saveSessionMetas(
    metas.map((m) => (m.id === id ? { ...m, title: title ?? m.title, updatedAt: now } : m)),
  );
}

const legacyMessagesKey = 'beaster/messages';

export async function migrateSingleSession(): Promise<void> {
  // ① 已有目录 = 搬过了，不重复搬（幂等：跑几遍都安全）
  const metas = await getSessionMetas();
  if (metas.length > 0) return;

  // ② 直读旧 key（不用旧 getter，原始读取才诚实——同 migrateL9Config 的注释）
  const raw = await storage.getString(legacyMessagesKey);
  if (!raw) return; // 全新安装，没得搬

  // ③ 解析旧消息（坏了当空数组，反正旧房子都要拆）
  let messages: Message[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    messages = Array.isArray(parsed) ? (parsed as Message[]) : [];
  } catch {
    messages = [];
  }

  // ④ 搬家：造一个会话，旧消息塞进它的正文
  if (messages.length > 0) {
    // 标题照旧规矩：最早那条 user 消息。数组是最新在前，reverse 后第一条 user 就是最早的
    const firstUser = [...messages].reverse().find((m) => m.role === 'user');
    const meta = await createSession(firstUser ? makeSessionTitle(firstUser.content) : '新会话');
    await saveMessages(meta.id, messages);
    await setCurrentSessionId(meta.id); // 搬完直接进这个会话（便利贴第一次派上用场）
  }

  // ⑤ 拆旧房子（对标 migrateL9Config 最后的 storage.delete）
  await storage.delete(legacyMessagesKey);
}