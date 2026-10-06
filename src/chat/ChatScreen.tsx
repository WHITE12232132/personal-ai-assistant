import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
    loadMessages,
    saveMessages,
    getCurrentSessionId,
    setCurrentSessionId,
    createSession,
    touchSession,
    makeSessionTitle,
} from '@/storage/ChatStorage';
import { useTheme } from '@/theme';
import MessageBubble from './components/MessageBubble';
import MessageInput from './components/MessageInput';
import type { Message } from './types';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import EmptyChat from './components/EmptyChat';
import ScrollToBottomButton from './components/ScrollToBottomButton';
import { router, Stack, useFocusEffect } from 'expo-router';
import { chatStream } from '@/api/openApi';
import type { ApiMessage } from '@/api/types';
import ModelSelectionModal from './components/ModelSelectionModal';
import { getSelection } from '@/storage/ModelStorage';
import type { ModelSelection } from '@/storage/ModelStorage';
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const SCROLL_TO_BOTTOM_OFFSET = 200;

export default function ChatScreen() {

    const { colors } = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const listRef = useRef<FlatList<Message>>(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);  // 当前开着哪本会话
    const streamRef = useRef<{ botId: string; controller: AbortController; stopped: boolean } | null>(null);
    const [modelLabel, setModelLabel] = useState('');           // 顶栏按钮文案（当前模型）
    const [pickerVisible, setPickerVisible] = useState(false);  // 模型弹窗开关

    const patchBot = (botId: string, patch: Partial<Message>) => {
        setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, ...patch } : m)),  // 只动目标，其余原样
        );
    };

    const runStream = (botId: string, history: Message[]) => {
        // ① 最新在前 → API 时间正序（slice 扔占位 → reverse → map 转形状，顺序不能乱）
        const apiMessages: ApiMessage[] = history
            .slice(1)                                    // 扔掉 index 0：bot 占位 '...' 不能发给 API
            .reverse()                                   // 翻转：[user, ...旧] → [...旧, user]
            .map((m) => ({ role: m.role, content: m.content }));

        // ② 开流
        const controller = new AbortController();
        const stream = { botId, controller, stopped: false };   // 本条流的档案
        streamRef.current = stream;
        chatStream(
            apiMessages,
            {
                onChunk: (full) => {
                    patchBot(botId, { content: full, status: 'streaming' });   // 状态机第二棒
                },
                onDone: (full) => {
                    patchBot(botId, {                                      // 状态机第三棒
                        content: stream.stopped
                            ? (full ? `${full}\n\n(已停止)` : '(已停止)')   // 谁触发谁上色
                            : full,
                        status: 'done',
                    });
                },
                onError: (message) => {
                    patchBot(botId, { content: message, status: 'error' });  // 错误也是一种落定
                },
            },
            controller.signal,
        );
    };

    // 停止开关：先翻牌子（让 onDone 认得），再掐流
    const stopStream = () => {
        if (!streamRef.current) return;
        streamRef.current.stopped = true;
        streamRef.current.controller.abort();
    };


    // 落盘：只存 done/error 的真相，写进「当前会话」的正文
    useEffect(() => {
        if (loading || !sessionId) return;                             // 读盘没完成/还没会话别反写
        saveMessages(sessionId, messages.filter((m) => m.status === 'done' || m.status === 'error'));
    }, [messages, loading, sessionId]);

    // 读盘：每次页面获得焦点（首开、从历史页回来）都按便利贴重读 → 切换会话即刷新
    useFocusEffect(
        useCallback(() => {
            (async () => {
                let id = await getCurrentSessionId();     // ① 看便利贴：现在该开哪本
                if (!id) {
                    const meta = await createSession();   // ② 没有会话（全新安装/被删光）→ 自动开一本
                    await setCurrentSessionId(meta.id);
                    id = meta.id;
                }
                const stored = await loadMessages(id);    // ③ 按 id 翻正文
                setSessionId(id);
                setMessages(stored);
                setLoading(false);
            })();
        }, []),
    );

    // 进场读一次当前选中，顶栏按钮显示模型名（null = 没配置，走 env 兜底）
    useEffect(() => {
        getSelection().then((s) => setModelLabel(s ? s.modelId : '默认模型'));
    }, []);


    // inverted 列表：offset 0 = 最底部（最新消息），往上翻时 y 变大
    const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
        setShowScrollBottom(event.nativeEvent.contentOffset.y > SCROLL_TO_BOTTOM_OFFSET);
    };

    const scrollToBottom = () => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const handleSend = (text: string) => {
        const userMsg: Message = {
            id: makeId(),
            role: 'user',
            content: text,
            createdAt: Date.now(),
            status: 'done',
        };
        const botMsg: Message = {          // 占位气泡（对标源码 createBotMessage + textPlaceholder '...'）
            id: makeId(),
            role: 'assistant',
            content: '...',                // 源码同款：等待中的哑剧
            createdAt: Date.now(),
            status: 'sending',             // 状态机第一棒
        };

        const next = [botMsg, userMsg, ...messages];  // 最新在前：bot 在头（index 0）
        setMessages(next);
        // 碰一碰：本会话第一条消息定标题（前 50 字），以后只刷最后发言时间
        if (sessionId) {
            touchSession(sessionId, messages.length === 0 ? makeSessionTitle(text) : undefined);
        }
        // 落盘交给全职 effect（只存 done/error 的真相，占位 '...' 不落盘）
        runStream(botMsg.id, next);
    };

    // 最新一条在等/在流 → 显示停止按钮
    const isStreaming =
        messages[0]?.status === 'sending' || messages[0]?.status === 'streaming';

    if (loading) {
        return null;    // 读盘中：先啥都不画（几十毫秒，用户无感）
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: '聊天',
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <Pressable onPress={() => router.push('/history')} hitSlop={8}>
                                <Text style={{ color: colors.textSecondary }}>历史</Text>
                            </Pressable>
                            <Pressable onPress={() => setPickerVisible(true)} hitSlop={8}>
                                <Text style={{ color: colors.primary }} numberOfLines={1}>
                                    {(modelLabel.length > 14 ? modelLabel.slice(0, 12) + '…' : modelLabel) || '模型'} ▾
                                </Text>
                            </Pressable>
                            <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
                                <Text style={{ color: colors.textSecondary }}>设置</Text>
                            </Pressable>
                        </View>
                    ),
                }}
            />
            <KeyboardAvoidingView
                style={[styles.page, { backgroundColor: colors.background }]}
                behavior="padding"
                keyboardVerticalOffset={114}
            >
                <View style={styles.listArea}>
                    <FlatList
                        ref={listRef}
                        style={styles.list}
                        data={messages}
                        ListEmptyComponent={<EmptyChat />}
                        keyExtractor={(message) => message.id}
                        renderItem={({ item }) => <MessageBubble message={item} />}
                        inverted
                        contentContainerStyle={styles.listContent}
                        onScroll={handleScroll}
                        scrollEventThrottle={100}
                    />
                    <ScrollToBottomButton
                        visible={showScrollBottom}
                        onPress={scrollToBottom}
                        style={styles.scrollButton}
                    />
                </View>
                {isStreaming && (
                    <Pressable onPress={stopStream} style={styles.stopBar}>
                        <Text style={{ color: colors.textSecondary }}>■ 停止</Text>
                    </Pressable>
                )}
                <MessageInput onSend={handleSend} />
            </KeyboardAvoidingView>

            {/* 10/3：模型选择弹窗（选中持久化，下一条消息立即生效） */}
            <ModelSelectionModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={(sel: ModelSelection) => setModelLabel(sel.modelId)}
            />
        </>


    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    list: {
        flex: 1,               // 列表吃满剩余空间，把输入框挤到最底
    },
    listArea: {
        flex: 1,               // 列表 + 浮动按钮的容器，给按钮做定位参照
    },
    scrollButton: {
        right: 16,
        bottom: 16,            // 按钮 position:'absolute' 在组件里，这里只定位置
    },
    listContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingVertical: 15,
    },
    stopBar: {
        alignItems: 'center',
        paddingVertical: 6,   // 流式中悬在输入框上方的一条"停止"
    },
});
