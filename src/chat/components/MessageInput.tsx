import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme';

interface MessageInputProps {
    onSend: (text: string) => void;
}


export default function MessageInput({ onSend }: MessageInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');            // 发完清空输入框
  };

  return (
    <View
      style={[
        styles.container,
        { borderTopColor: colors.border, backgroundColor: colors.background },
      ]}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={text}
        onChangeText={setText}
        placeholder="发消息…"
        placeholderTextColor={colors.textTertiary}
        multiline
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: colors.primary,
            opacity: canSend ? (pressed ? 0.7 : 1) : 0.4,
          },
        ]}>
        <Text style={styles.sendText}>发送</Text>
      </Pressable>
    </View>
  );
}



const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
    },
    sendButton: {
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 20,
    },
    sendText: {
        color: '#ffffff',
        fontWeight: '600',
    },
});