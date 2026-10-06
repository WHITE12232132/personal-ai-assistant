import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import MarkdownText from '@/markdown/MarkdownText';
import type { Message } from '../types';

/** 打字机光标：闪烁的 ▍（streaming 中挂在正文尾巴上） */
function BlinkCursor() {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.2, duration: 480, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 480, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return <Animated.Text style={{ color: colors.textSecondary, opacity }}>▍</Animated.Text>;
}

export default function MessageBubble({ message }: { message: Message }) {
    const { colors } = useTheme();
    const isUser = message.role === 'user';
    const isError = message.status === 'error';
    const isThinking = message.status === 'sending';   // '...' 占位期（MiMo 思考 ~0.5s）
    const isStreaming = message.status === 'streaming';

    return (
        <View style={[styles.row, isUser && styles.rowUser]}>
            <View
                style={[
                    styles.bubble,
                    {
                        backgroundColor: isError
                            ? colors.error
                            : isUser
                                ? colors.primary
                                : colors.surface,
                        borderColor: isError ? colors.error : colors.border,
                    },
                ]}>
                {isThinking ? (
                    <Text style={{ color: colors.textTertiary }}>思考中…</Text>
                ) : isError || isUser || isStreaming ? (
                    // 用户/错误/流式中：纯文本（流式每帧重解析 Markdown 不值当，落定再排版）
                    <Text style={{ color: isError || isUser ? '#ffffff' : colors.text }}>
                        {message.content}
                        {isStreaming && <BlinkCursor />}
                    </Text>
                ) : (
                    // bot 落定消息：Markdown 排版（标题/列表/代码块/链接）
                    <MarkdownText content={message.content} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'flex-start',   // AI：靠左
        paddingHorizontal: 12,
        marginVertical: 4,
    },
    rowUser: {
        justifyContent: 'flex-end',     // 用户：靠右
    },
    bubble: {
        maxWidth: '80%',                // 气泡不许超过屏宽 80%
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
    },
});
