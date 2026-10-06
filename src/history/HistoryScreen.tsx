import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { Stack } from 'expo-router';
import type { SessionMeta } from '@/chat/types';
import { useTheme } from '@/theme';
import { router } from 'expo-router';
import { getSessionMetas, setCurrentSessionId, deleteSession, createSession } from '@/storage/ChatStorage';
export default function HistoryScreen() {
    const { colors } = useTheme();
    const [metas, setMetas] = useState<SessionMeta[]>([]);

    const handleSelect = (id: string) => {
        setCurrentSessionId(id);   // 便利贴改成选中的会话（这就是「切换」的全部真相）
        router.back();             // 回聊天页
    };

    const handleCreate = async () => {
        const meta = await createSession();   // 目录加一行
        setCurrentSessionId(meta.id);         // 建完即选中（复用轮 2 的切换逻辑）
        router.back();                        // 回聊天页开聊
    };

    const handleDelete = (id: string) => {
        deleteSession(id);                                    // 存储层三连（①②③）
        setMetas((prev) => prev.filter((m) => m.id !== id));   // UI 立刻划掉那行
    };

    // 进场读一次目录（切换/删除的刷新下一轮加）
    useEffect(() => {
        getSessionMetas().then(setMetas);
    }, []);

    return (
        <>
            <Stack.Screen options={{
                title: '历史会话',
                headerRight: () => (
                    <Pressable onPress={handleCreate} hitSlop={8}>
                        <Text style={{ color: colors.primary }}>新建</Text>
                    </Pressable>
                ),
            }} />
            <View style={[styles.page, { backgroundColor: colors.background }]}>
                <FlatList
                    data={metas}
                    keyExtractor={(meta) => meta.id}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.row}
                            onPress={() => handleSelect(item.id)}
                            onLongPress={() => {
                                Alert.alert('删除会话', '删除后无法恢复', [
                                    { text: '取消', style: 'cancel' },
                                    { text: '删除', style: 'destructive', onPress: () => handleDelete(item.id) },
                                ]);
                            }}
                        >
                            <Text style={{ color: colors.text }} numberOfLines={1}>
                                {item.title}
                            </Text>
                        </Pressable>
                    )}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    page: { flex: 1 },
    row: { paddingHorizontal: 16, paddingVertical: 14 },
});