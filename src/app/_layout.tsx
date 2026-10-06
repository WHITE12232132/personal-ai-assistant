import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '@/theme';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import { migrateL9Config } from '@/storage/ModelStorage';
import { migrateSingleSession } from '@/storage/ChatStorage';
import PrivacyGate from '@/privacy/PrivacyGate';
function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

export default function RootLayout() {

  useEffect(() => {
    migrateL9Config();        // 启动跑一次搬家（对标样例 App.tsx）
    migrateSingleSession();   // ← 加这行：旧单会话消息搬进多会话新家
}, []);

    return (
    <ThemeProvider>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <PrivacyGate>
          <RootNavigator />
        </PrivacyGate>
      </KeyboardProvider>
    </ThemeProvider>
  );
}