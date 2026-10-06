import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  /** 读一个 key，没有就返回 null */
  async getString(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },

  /** 写一个 key，值必须是字符串（别超约 2KB，大了平台可能拒收） */
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },

  /** 删一个 key */
  async delete(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};