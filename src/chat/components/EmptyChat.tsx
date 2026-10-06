import { Keyboard, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme, type ColorScheme } from '@/theme';

const isAndroid = Platform.OS === 'android';

// 空状态：messages 为空时由 FlatList 的 ListEmptyComponent 渲染
export default function EmptyChat() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    // 点空白处收起键盘（参考项目同款交互）
    <Pressable style={styles.container} onPress={Keyboard.dismiss}>
      <Text style={styles.greetingText}>开始新对话</Text>
    </Pressable>
  );
}

// 样式跟着主题走 → 用函数生成，而不是静态 StyleSheet（L2 学过的模式）
const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    greetingText: {
      fontSize: 16,
      fontWeight: '500',
      paddingHorizontal: 16,
      textAlign: 'center',
      color: colors.textSecondary,
      // inverted 列表整体 scaleY:-1 翻转：消息行会被行渲染器翻回来，
      // 但 ListEmptyComponent 不走行渲染器，得自己翻回来，否则文字是倒的。
      // Android 还要多翻一次横向 —— 参考项目的实测结论，照抄
      transform: [{ scaleY: -1 }, { scaleX: isAndroid ? -1 : 1 }],
    },
  });