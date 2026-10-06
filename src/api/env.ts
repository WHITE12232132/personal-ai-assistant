// ─── env 兜底层：打包时定死，只当兜底，不再是主配置 ───
// 独立成「叶模块」（谁也不 import）：
// ModelStorage（L9 迁移要抄 baseUrl）和 config（读取链路兜底）都用它，
// 若放 config.ts 里会形成 ModelStorage ↔ config 的循环 require。
export const ENV_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_MIMO_BASE_URL ?? 'https://api.xiaomimimo.com/v1',
  apiKey: process.env.EXPO_PUBLIC_MIMO_API_KEY ?? '',
} as const;
