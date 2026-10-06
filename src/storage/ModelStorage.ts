import { storage } from './StorageUtils';
import { secureStorage } from './SecureStorage';
import { MIMO_MODELS } from './PreferenceStorage';
import { ENV_CONFIG } from '@/api/env';
export type ProviderConfig = {
  id: string;          // 条目唯一 id，也用来拼保险箱里的 key 名
  name: string;        // 显示名，如 'MiMo'
  baseUrl: string;     // OpenAI 兼容接口地址，如 'https://api.xiaomimimo.com/v1'
  modelIds: string[];  // 该服务商下的模型名列表
};

const providersKey = 'beaster/providers';
let currentProviders: ProviderConfig[] | undefined;

function isProviderConfig(value: unknown): value is ProviderConfig {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.baseUrl === 'string' &&
    Array.isArray(p.modelIds) &&
    p.modelIds.every((m) => typeof m === 'string')
  );
}


// ─── 获取账本（三段式：缓存 → 读盘 → 校验）───
export async function getProviders(): Promise<ProviderConfig[]> {
  if (currentProviders !== undefined) {
    return currentProviders;               // 缓存命中
  }
  const raw = await storage.getString(providersKey);
  if (!raw) {
    currentProviders = [];                 // 没存过 = 空账本
    return currentProviders;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    // 整表校验：只留长得对的条目，坏数据不致崩
    currentProviders = Array.isArray(parsed) ? parsed.filter(isProviderConfig) : [];
  } catch {
    currentProviders = [];                 // JSON 坏了当空账本
  }
  return currentProviders;
}


// 内部用：整表落盘（三段式：先缓存后落盘）
async function saveProviders(providers: ProviderConfig[]): Promise<void> {
  currentProviders = providers;                               // 1. 先更新缓存
  currentSelection = undefined;                               // ★ 账本变了 → 便利贴缓存作废
  await storage.set(providersKey, JSON.stringify(providers)); // 2. 再落盘
}


// ─── id 生成（拍板：不装 uuid）───
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── key 的读写：key 名 beaster-provider-key-<id>（只含字母数字和 . - _，合规）───
function providerKeyTag(id: string): string {
  return `beaster-provider-key-${id}`;
}

export async function getProviderApiKey(id: string): Promise<string> {
  return (await secureStorage.getString(providerKeyTag(id))) ?? ''; // '' = 没存过
}

export async function saveProviderApiKey(id: string, apiKey: string): Promise<void> {
  await secureStorage.set(providerKeyTag(id), apiKey);
}

export async function deleteProvider(id: string): Promise<void> {
  const providers = await getProviders();
  await saveProviders(providers.filter((p) => p.id !== id));
  await secureStorage.delete(providerKeyTag(id)); // 连带删保险箱里的 key
}

export async function upsertProvider(input: {
  id?: string;        // 带 id = 编辑；不带 = 新增
  name: string;
  baseUrl: string;
  modelIds: string[];
  apiKey?: string;    // 不传 = 不动保险箱里的 key（编辑时用户没改 key 就不传）
}): Promise<ProviderConfig> {
  const providers = await getProviders();
  const id = input.id ?? generateId();
  const config: ProviderConfig = {
    id,
    name: input.name.trim(),
    baseUrl: input.baseUrl.trim().replace(/\/+$/, ''), // 对标样例 saveKeys：去尾斜杠，防 '.../v1//'
    modelIds: input.modelIds.map((m) => m.trim()).filter(Boolean),
  };
  const index = providers.findIndex((p) => p.id === id);
  const next =
    index >= 0
      ? providers.map((p) => (p.id === id ? config : p)) // 编辑：替换那一条
      : [...providers, config];                           // 新增：追加
  await saveProviders(next);
  if (input.apiKey !== undefined) {
    await saveProviderApiKey(id, input.apiKey);           // 才碰保险箱
  }
  return config;
}


export type ModelSelection = {
  providerId: string; // 谁家
  modelId: string;    // 哪个
};

const selectionKey = 'beaster/selectedModel';

let currentSelection: ModelSelection | null | undefined; // 缓存变量（三态，下面讲）


export async function saveSelection(sel: ModelSelection): Promise<void> {
  currentSelection = sel;                               // 1. 先更新缓存
  await storage.set(selectionKey, JSON.stringify(sel)); // 2. 再落盘
}

function isModelSelection(value: unknown): value is ModelSelection {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return typeof s.providerId === 'string' && typeof s.modelId === 'string';
}

export async function getSelection(): Promise<ModelSelection | null> {
  if (currentSelection !== undefined) {
    return currentSelection;               // ① 缓存命中：不碰仓库
  }

  const providers = await getProviders();  // ② 查账本（它自己有缓存，不慢）

  // ③ 兜底候选：第一家「有模型」的服务商
  const first = providers.find((p) => p.modelIds.length > 0);
  if (!first) {
    currentSelection = null;               //    账本空 / 都没配模型 → 没得选
    return currentSelection;
  }
  const fallback: ModelSelection = {
    providerId: first.id,
    modelId: first.modelIds[0],
  };

  // ④ 读便利贴（可能没有、可能 JSON 坏）
  let parsed: unknown = null;
  const raw = await storage.getString(selectionKey);
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;                       //    JSON 坏了 → 当没读到
    }
  }

  // ⑤ 查账本核对两关：先拿「格式对的便利贴」（const 定死类型，不靠别名反推）
  const sel = isModelSelection(parsed) ? parsed : null;

  if (
    sel !== null &&
    providers.some(
      (p) => p.id === sel.providerId && p.modelIds.includes(sel.modelId)
    )
  ) {
    currentSelection = sel;      // ⑥a 核对通过：用便利贴
  } else {
    currentSelection = fallback; // ⑥b 核对不过：用兜底
  }
  return currentSelection;
}

// ─── 迁移 L9 旧配置（对标样例 migrateOpenAICompatConfig：搬家 + 删旧）───
const l9ApiKeyKey = 'beaster/apiKey';
const l9ModelKey = 'beaster/model';

export async function migrateL9Config(): Promise<void> {
  // ① 已有账本 = 搬过了/用户自己配好了，不重复搬
  const providers = await getProviders();
  if (providers.length > 0) return;

  // ② 直读旧 key 的原始值（不用 L9 的 getter：getSelectedModel 没存过也返回默认值，
  //    分不清"用户选的"和"兜底的"，原始读取才诚实）
  const oldKey = await storage.getString(l9ApiKeyKey);
  const oldModel = await storage.getString(l9ModelKey);
  if (!oldKey && !oldModel) return; // 全新安装，没得搬

  // ③ 造「MiMo」条目：baseUrl 抄 env，模型抄五个实测的；key 一起搬进保险箱
  const config = await upsertProvider({
    name: 'MiMo',
    baseUrl: ENV_CONFIG.baseUrl,
    modelIds: [...MIMO_MODELS],
    apiKey: oldKey || undefined, // ''（没存过）→ 不写保险箱，继续走 env 兜底
  });

  // ④ 旧选中模型搬进便利贴（先验货：必须是五个之一）
  if (oldModel && MIMO_MODELS.some((m) => m === oldModel)) {
    await saveSelection({ providerId: config.id, modelId: oldModel });
  }

  // ⑤ 拆旧房子（对标样例最后 storage.delete 三连）
  await storage.delete(l9ApiKeyKey);
  await storage.delete(l9ModelKey);
}