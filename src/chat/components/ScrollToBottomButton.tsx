import { Platform, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

// 回到底部按钮：向上翻看历史时出现，点它滚回最新消息
export default function ScrollToBottomButton({ visible, onPress, style }: ScrollToBottomButtonProps) {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        style,
      ]}
      onPress={onPress}
      hitSlop={8}>
      {/* 参考项目用图片 scroll_down.png，我们没 assets，用文字箭头 */}
      <Text style={[styles.arrow, { color: colors.textSecondary }]}>↓</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 1,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  arrow: {
    fontSize: 18,
    fontWeight: '600',
  },
});
