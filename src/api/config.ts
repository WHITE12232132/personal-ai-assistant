import { getSelection, getProviders, getProviderApiKey } from '@/storage/ModelStorage';
import { ENV_CONFIG } from './env';

export type ApiConfig = {
  baseUrl: string;
  model: string;   // L10 起是任意模型名（不再限 MiMo 五个）
  apiKey: string;
};

// 10/4：按「当前选中 (providerId, modelId)」路由到所属 Provider 的 baseUrl/key
export async function getApiConfig(): Promise<ApiConfig> {
  const sel = await getSelection();

  // 没有任何配置（空账本）→ 回落 env 兜底层（L9 原样保留）
  if (!sel) {
    return {
      baseUrl: ENV_CONFIG.baseUrl,
      model: process.env.EXPO_PUBLIC_MIMO_MODEL ?? 'mimo-v2.6-flash',
      apiKey: ENV_CONFIG.apiKey,
    };
  }

  const providers = await getProviders();
  const provider = providers.find((p) => p.id === sel.providerId);

  // 理论到不了（getSelection 已校验过 providerId）；防御一下，仍回落 env
  if (!provider) {
    return {
      baseUrl: ENV_CONFIG.baseUrl,
      model: sel.modelId,
      apiKey: ENV_CONFIG.apiKey,
    };
  }

  const key = await getProviderApiKey(provider.id);
  return {
    baseUrl: provider.baseUrl,
    model: sel.modelId,
    apiKey: key || ENV_CONFIG.apiKey, // 该 Provider 没存 key → env 兜底（L9 习惯）
  };
}
