import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import type { ThemeMode } from '@/theme';
import ProvidersSection from './ProvidersSection';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: '跟随系统' },
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
];

export default function SettingsScreen() {
    const { colors, themeMode, setThemeMode } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>

            <Stack.Screen options={{ title: '设置' }} />

            <View
                style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>外观</Text>
                    <View style={styles.options}>
                        {THEME_OPTIONS.map((opt) => {
                            const selected = opt.value === themeMode;
                            return (
                                <Pressable
                                    key={opt.value}
                                    onPress={() => setThemeMode(opt.value)}
                                    style={[
                                        styles.chip,
                                        { borderColor: colors.border },
                                        selected && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                                    ]}>
                                    <Text style={{ color: selected ? colors.primary : colors.textSecondary }}>
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>版本</Text>
                    <Text style={{ color: colors.textSecondary }}>1.0.0</Text>
                </View>
            </View>

            {/* L9 的「API Key / 默认模型」两卡退役，升级为 Provider 管理区（L10） */}
            <ProvidersSection />

        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        marginTop: 24,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
    },
    label: {
        fontSize: 16,
    },
    options: {
        flexDirection: 'row',
        flexWrap: 'wrap',   // 放不下自动换行
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,       // 药丸圆角
        borderWidth: StyleSheet.hairlineWidth,
    },
});
