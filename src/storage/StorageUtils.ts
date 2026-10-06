import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  /** 读一个 key，没有就返回 null */
  async getString(key: string): Promise<string | null> {
      return AsyncStorage.getItem(key);
  },

  /** 写一个 key，值必须是字符串 */
  async set(key: string, value: string): Promise<void> {
      await AsyncStorage.setItem(key, value);
  },

  /** 删一个 key */
  async delete(key: string): Promise<void> {
      await AsyncStorage.removeItem(key);
  },
};