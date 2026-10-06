
import { storage } from './StorageUtils';
import type { ThemeMode } from '@/theme';
const themeModeKey = 'beaster/themeMode';

let currentThemeMode: ThemeMode | undefined;

// 验证
function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

// 保存
export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  currentThemeMode = mode;               // 1. 先更新缓存
  await storage.set(themeModeKey, mode); // 2. 再落盘
}


// 获取
export async function getThemeMode(): Promise<ThemeMode> {
  if (currentThemeMode !== undefined) {
    return currentThemeMode;               // 缓存命中：不碰仓库
  }
  const raw = await storage.getString(themeModeKey); // 未命中：读盘
  currentThemeMode = isThemeMode(raw) ? raw : 'system'; // 校验 + 顺手填缓存
  return currentThemeMode;
}

const apiKeyKey = 'beaster/apiKey';
let currentApiKey: string | undefined;

export async function saveApiKey(apiKey: string): Promise<void> {
  currentApiKey = apiKey;                // 1. 先更新缓存
  await storage.set(apiKeyKey, apiKey);  // 2. 再落盘
}

// 清空
export async function clearApiKey(): Promise<void> {
  currentApiKey = '';                    // 1. 缓存置空（注意：不是 undefined！）
  await storage.delete(apiKeyKey);       // 2. 落盘删除
}

// 获取
export async function getApiKey(): Promise<string> {
  if (currentApiKey !== undefined) {     // ⚠️ 不能写 if (currentApiKey)
    return currentApiKey;                // 缓存命中：不碰仓库
  }
  currentApiKey = (await storage.getString(apiKeyKey)) ?? ''; // 未命中：读盘
  return currentApiKey;                  // '' = 没存过/已清空 → 上层拿它回落 env
}

export const MIMO_MODELS = [
  'mimo-v2.5',
  'mimo-v2.5-pro',
  'mimo-v2.6-flash',
  'mimo-v2.6-pro',
  'mimo-v2.6-pro-ultraspeed',
] as const;

export type ModelId = (typeof MIMO_MODELS)[number];

const modelKey = 'beaster/model';
let currentModel: ModelId | undefined;

// 验证
function isModelId(value: string | null): value is ModelId {
  return MIMO_MODELS.some((m) => m === value);
}

// 保存
export async function saveSelectedModel(model: ModelId): Promise<void> {
  currentModel = model;                  // 1. 先更新缓存
  await storage.set(modelKey, model);    // 2. 再落盘
}

// 获取
export async function getSelectedModel(): Promise<ModelId> {
  if (currentModel !== undefined) {
    return currentModel;                 // 缓存命中
  }
  const raw = await storage.getString(modelKey); // 未命中：读盘
  currentModel = isModelId(raw) ? raw : 'mimo-v2.6-flash'; // 校验 + 兜底默认
  return currentModel;
}
