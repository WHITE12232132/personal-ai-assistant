export type Role = 'user' | 'assistant';

export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error';

export interface Message {
    id: string;
    role: Role;
    content: string;
    createdAt: number;
    status: MessageStatus;
}

// 会话元数据（对标源码 Chat 类型：目录里只有简介，消息本体在别的 key）
export interface SessionMeta {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}