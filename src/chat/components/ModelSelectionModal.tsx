import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import {
    getProviders, getSelection, saveSelection,
    type ProviderConfig, type ModelSelection,
} from '@/storage/ModelStorage';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSelect: (sel: ModelSelection) => void; // 选完通知顶栏刷新按钮文案
};

// 聊天页模型选择弹窗（对标样例 ModelSelectionModal：遮罩关闭 / 选完即关 / 高度 360）
// 差异：按 Provider 分组（样例是平铺 + 使用频率排序）；无图标无动画（个人工具够用）
export default function ModelSelectionModal({ visible, onClose, onSelect }: Props) {
    const { colors } = useTheme();
    const [providers, setProviders] = useState<ProviderConfig[]>([]);
    const [selection, setSelection] = useState<ModelSelection | null>(null);

    // 每次打开都现读（设置页可能刚改过账本；ModelStorage 自带缓存，快）
    useEffect(() => {
        if (!visible) return;
        getProviders().then(setProviders);
        getSelection().then(setSelection);
    }, [visible]);

    const handlePick = async (providerId: string, modelId: string) => {
        const sel = { providerId, modelId };
        await saveSelection(sel);  // 持久化（缓存 + 落盘）→ 下一条消息立即生效
        setSelection(sel);
        onSelect(sel);             // 顶栏按钮文案跟新
        onClose();                 // 对标样例：选完即关
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}>
            {/* 点遮罩关闭（对标样例 TouchableWithoutFeedback 遮罩） */}
            <Pressable style={styles.overlay} onPress={onClose}>
                {/* 卡片自己吞掉触摸：点卡片空白处不触发遮罩的关闭 */}
                <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => {}}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>选择模型</Text>
                        <Pressable onPress={onClose} hitSlop={8}>
                            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>×</Text>
                        </Pressable>
                    </View>

                    <ScrollView>
                        {providers.length === 0 && (
                            <Text style={{ color: colors.textSecondary, paddingVertical: 12 }}>
                                暂无服务商配置{'\n'}去「设置 → 服务商管理」添加
                            </Text>
                        )}
                        {providers.map((p) => (
                            <View key={p.id}>
                                <Text style={[styles.group, { color: colors.textSecondary }]}>{p.name}</Text>
                                {p.modelIds.map((m) => {
                                    const selected = selection?.providerId === p.id && selection?.modelId === m;
                                    return (
                                        <Pressable
                                            key={m}
                                            onPress={() => handlePick(p.id, m)}
                                            style={[styles.rowItem, { borderBottomColor: colors.border }]}>
                                            <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{m}</Text>
                                            {selected && <Text style={{ color: colors.primary }}>✓</Text>}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'flex-start',
        paddingTop: 100,        // 从顶栏下方弹出（对标样例 top 定位）
        alignItems: 'center',
    },
    card: {
        width: 260,
        maxHeight: 360,         // 对标样例 MODAL_HEIGHT = 360
        borderRadius: 10,
        padding: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
    },
    group: {
        fontSize: 12,
        marginTop: 8,
        marginBottom: 2,
    },
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
