import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

// 同意状态存 AsyncStorage；将来隐私政策改版可换值（如 '2'）让老用户重新同意
const CONSENT_KEY = 'beaster/privacyConsent';
const CONSENT_VALUE = '1';

const DEBUG_FORCE_PRIVACY = true; // ⚠️ 调试用：true=每次启动都弹；验证完改 false

type Props = { children: React.ReactNode };

export default function PrivacyGate({ children }: Props) {
  // loading: 读存储中 / pending: 未同意，弹窗 / agreed: 已同意
  const [state, setState] = useState<'loading' | 'pending' | 'agreed'>('loading');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    if (DEBUG_FORCE_PRIVACY) {
      AsyncStorage.removeItem(CONSENT_KEY); // 清掉同意记录 → 必弹
    }
    AsyncStorage.getItem(CONSENT_KEY).then((v) => {
      setState(v === CONSENT_VALUE ? 'agreed' : 'pending');
    });
  }, []);

  const handleAgree = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, CONSENT_VALUE);
    setState('agreed');
  };

  const handleReject = () => BackHandler.exitApp();

  return (
    <View style={styles.flex}>
      {children}
      <Modal
        visible={state === 'pending'}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={handleReject} // Android 返回键 = 拒绝，防绕过
      >
        <View
          style={[
            styles.screen,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>隐私政策提示</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            在使用本应用前，请阅读并同意《隐私政策》。{'\n\n'}
            本应用是 AI 聊天工具：您输入的内容会发送给您所选择的第三方
            LLM 服务商（如 OpenAI 等）进行处理，我们不存储、不收集这些内容；
            聊天记录仅保存在您的设备本地。{'\n\n'}
            拒绝将退出应用。
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleAgree}
          >
            <Text style={styles.primaryText}>同意并继续</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={handleReject}>
            <Text style={[styles.secondaryText, { color: colors.error }]}>拒绝并退出</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: {
    color: '#fff', // 故意固定：primary 深浅色同为 #0a84ff，蓝底白字两档都对
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 16,
  },
});