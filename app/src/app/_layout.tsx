import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { t } from '@/i18n';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: t('home.title') }} />
        <Stack.Screen name="a-propos" options={{ title: t('about.title') }} />
        <Stack.Screen name="signaler/type" options={{ title: t('type.title') }} />
        <Stack.Screen name="signaler/urgence" options={{ title: t('emergency.call') }} />
        <Stack.Screen name="signaler/choisi" options={{ title: t('selected.title') }} />
      </Stack>
    </>
  );
}
