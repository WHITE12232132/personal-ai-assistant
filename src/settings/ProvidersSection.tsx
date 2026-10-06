import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme';
import {
    getProviders, deleteProvider, upsertProvider, getProviderApiKey,
    type ProviderConfig,
} from '@/storage/ModelStorage';
import { fetchModels } from '@/api/models';


export type Draft = {
    id?: string;             // 有 = 编辑，无 = 新增
    name: string;
    baseUrl: string;
    apiKey: string;          // 规则：留空 = 不改保险箱里的 key
    modelIds: string[];      // 勾选结果（这家店备哪些菜）
    candidates: string[];    // 「拉取模型」拉到的候选（⑤ 用）
    fetchState: 'idle' | 'loading' | 'success' | 'error'; // 拉取小状态机（⑤ 用）
    fetchError: string;
};

const emptyDraft: Draft = {
    name: '', baseUrl: '', apiKey: '',
    modelIds: [], candidates: [],
    fetchState: 'idle', fetchError: '',
};


export default function ProvidersSection() {
    const { colors } = useTheme();
    const [providers, setProviders] = useState<ProviderConfig[]>([]); // 账本（列表态渲染它）
    const [editing, setEditing] = useState<Draft | null>(null);       // null = 列表态，有值 = 表单态
    const [keyVisible, setKeyVisible] = useState(false); // key 明文/密文切换
    const [manual, setManual] = useState('');            // 手填模型名
    const [formError, setFormError] = useState('');      // 保存校验红字
    // 进场读账本（ModelStorage 自带缓存，快）
    useEffect(() => {
        getProviders().then(setProviders);
    }, []);

    const refresh = () => getProviders().then(setProviders);
    const patch = (partial: Partial<Draft>) =>
        setEditing((d) => (d ? { ...d, ...partial } : d));

    const handleAdd = () => setEditing(emptyDraft);

    // 编辑 → 把条目拷成草稿进表单态（key 不拷，规则"留空不改"）
    const handleEdit = (p: ProviderConfig) =>
        setEditing({
            ...emptyDraft,        // 打底：临时字段（candidates 等）都归零
            id: p.id,             // 带 id = 编辑模式
            name: p.name,
            baseUrl: p.baseUrl,
            modelIds: [...p.modelIds], // 拷一份（防直接引用账本对象）
        });

    // 删除 → 先弹确认框，确认了才删
    const handleDelete = (p: ProviderConfig) => {
        Alert.alert(
            '删除服务商',
            `确定删除「${p.name}」？此操作不可恢复。`,
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',          // iOS 上红字
                    onPress: async () => {
                        await deleteProvider(p.id); // ModelStorage 内部会连带删保险箱的 key
                        refresh();                  // 刷新列表 UI
                    },
                },
            ]
        );
    };

    // 「拉取模型」：用表单里现填的地址/key（还没落账本）
    const handleFetch = async () => {
        if (!editing) return;
        const baseUrl = editing.baseUrl.trim();
        if (!baseUrl) {
            patch({ fetchState: 'error', fetchError: '先填地址再拉取' });
            return;
        }
        patch({ fetchState: 'loading', fetchError: '' });
        // key 优先用草稿的；编辑模式留空 → 拿已保存的 key 去拉
        let key = editing.apiKey.trim();
        if (!key && editing.id) key = await getProviderApiKey(editing.id);
        try {
            const ids = await fetchModels(baseUrl, key);
            patch({ candidates: ids, fetchState: 'success' });
        } catch (e) {
            patch({ fetchState: 'error', fetchError: e instanceof Error ? e.message : String(e) });
        }
    };

    // 勾选/取消一个模型（chips 点击）
    const toggleModel = (id: string) => {
        if (!editing) return;
        const has = editing.modelIds.includes(id);
        patch({
            modelIds: has
                ? editing.modelIds.filter((m) => m !== id)
                : [...editing.modelIds, id],
        });
    };

    // 手填兜底：往草稿里加一个模型名
    const handleAddManual = () => {
        if (!editing) return;
        const id = manual.trim();
        if (!id) return;
        patch({
            modelIds: editing.modelIds.includes(id) ? editing.modelIds : [...editing.modelIds, id],
        });
        setManual('');
    };

    // 保存 → 落账本（key 留空 = 不改保险箱）
    const handleSave = async () => {
        if (!editing) return;
        if (!editing.name.trim() || !editing.baseUrl.trim()) {
            setFormError('名称和地址都要填');
            return;
        }
        await upsertProvider({
            id: editing.id,
            name: editing.name,
            baseUrl: editing.baseUrl,
            modelIds: editing.modelIds,
            apiKey: editing.apiKey.trim() || undefined, // '' → 不传 → 不动 key
        });
        setFormError('');
        setEditing(null);
        refresh();
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.block}>
                <Text style={[styles.label, { color: colors.text }]}>服务商管理</Text>

                {editing === null ? (
                    // ─── 列表态 ───
                    <>
                        {providers.map((p) => (
                            <View key={p.id} style={[styles.item, { borderColor: colors.border }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.itemName, { color: colors.text }]}>{p.name}</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{p.baseUrl}</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                        {p.modelIds.length} 个模型
                                    </Text>
                                </View>
                                <View style={styles.btnRow}>
                                    <Pressable
                                        onPress={() => handleEdit(p)}
                                        style={[styles.btn, { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
                                        <Text style={{ color: colors.primary }}>编辑</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleDelete(p)}
                                        style={[styles.btn, { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
                                        <Text style={{ color: colors.textSecondary }}>删除</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}

                        <Pressable onPress={handleAdd} style={[styles.btn, { backgroundColor: colors.primary }]}>
                            <Text style={{ color: '#fff' }}>+ 新增服务商</Text>
                        </Pressable>
                    </>
                ) : (
                    // ─── 表单态 ───
                    <>
                        <Text style={[styles.label, { color: colors.text }]}>
                            {editing.id ? '编辑服务商' : '新增服务商'}
                        </Text>

                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>名称</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            value={editing.name}
                            onChangeText={(t) => patch({ name: t })}
                            placeholder="如 MiMo / DeepSeek"
                            placeholderTextColor={colors.textSecondary}
                        />

                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>地址（baseUrl）</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            value={editing.baseUrl}
                            onChangeText={(t) => patch({ baseUrl: t })}
                            placeholder="https://api.xxx.com/v1"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>API Key</Text>
                        <View style={styles.keyRow}>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                value={editing.apiKey}
                                onChangeText={(t) => patch({ apiKey: t })}
                                placeholder={editing.id ? '留空 = 不改已保存的 key' : '粘贴 key'}
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry={!keyVisible}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Pressable onPress={() => setKeyVisible((v) => !v)} style={styles.eyeBtn}>
                                <Text style={{ color: colors.primary, fontSize: 12 }}>
                                    {keyVisible ? '隐藏' : '显示'}
                                </Text>
                            </Pressable>
                        </View>

                        {/* ── 拉取模型（小状态机：idle/loading/success/error）── */}
                        <View style={styles.keyRow}>
                            <Pressable
                                onPress={handleFetch}
                                disabled={editing.fetchState === 'loading'}
                                style={[styles.btn, { backgroundColor: colors.primary }]}>
                                <Text style={{ color: '#fff' }}>
                                    {editing.fetchState === 'loading' ? '拉取中…' : '拉取模型'}
                                </Text>
                            </Pressable>
                            {editing.fetchState === 'success' && (
                                <Text style={{ color: colors.success, fontSize: 12 }}>
                                    ✓ 已拉到 {editing.candidates.length} 个，点选保留
                                </Text>
                            )}
                        </View>
                        {editing.fetchState === 'error' && (
                            <Text style={{ color: colors.error, fontSize: 12 }}>
                                拉取失败：{editing.fetchError}（不影响，可手填模型名）
                            </Text>
                        )}

                        {/* ── 模型 chips（候选 ∪ 已选，点选/取消）── */}
                        <View style={styles.options}>
                            {[...new Set([...editing.candidates, ...editing.modelIds])].map((id) => {
                                const selected = editing.modelIds.includes(id);
                                return (
                                    <Pressable
                                        key={id}
                                        onPress={() => toggleModel(id)}
                                        style={[
                                            styles.chip,
                                            { borderColor: colors.border },
                                            selected && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                                        ]}>
                                        <Text style={{ color: selected ? colors.primary : colors.textSecondary }}>
                                            {selected ? '✓ ' : ''}{id}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* ── 手填兜底（拉不到也不堵死）── */}
                        <View style={styles.keyRow}>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                value={manual}
                                onChangeText={setManual}
                                placeholder="手填模型名（拉不到就自己写）"
                                placeholderTextColor={colors.textSecondary}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Pressable
                                onPress={handleAddManual}
                                style={[styles.btn, { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
                                <Text style={{ color: colors.primary }}>添加</Text>
                            </Pressable>
                        </View>

                        {/* ── 保存 / 取消 ── */}
                        {formError !== '' && (
                            <Text style={{ color: colors.error, fontSize: 12 }}>{formError}</Text>
                        )}
                        <View style={styles.btnRow}>
                            <Pressable onPress={handleSave} style={[styles.btn, { backgroundColor: colors.primary }]}>
                                <Text style={{ color: '#fff' }}>保存</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setEditing(null)}
                                style={[styles.btn, { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
                                <Text style={{ color: colors.textSecondary }}>取消</Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </View>
        </View>
    );


}

const styles = StyleSheet.create({
    card: {
        marginTop: 24,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
    },
    block: {
        paddingVertical: 14,
        gap: 8,
    },
    label: {
        fontSize: 16,
    },
    item: {
        flexDirection: 'row',      // 左文字右按钮
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth, // 条目间细分隔线
    },
    itemName: {
        fontSize: 15,
        fontWeight: '500',
    },
    btnRow: {
        flexDirection: 'row',
        gap: 8,
    },
    btn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    input: {
        height: 44, borderRadius: 6,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 10,
    },
    keyRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    eyeBtn: {
        paddingHorizontal: 8, paddingVertical: 6,
    },
    options: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    },
    chip: {
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    },
});