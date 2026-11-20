import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { t } from '@/i18n';
import { typography, useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();
  // Police du design Figma (Nunito 400 / 600 / 700). Écran vide le temps du chargement.
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold });
  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="a-propos"
          options={{
            headerShown: true,
            title: t('about.title'),
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: typography.subtitle,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="signaler/type" />
        <Stack.Screen name="signaler/urgence" options={{ gestureEnabled: true }} />
        <Stack.Screen name="signaler/choisi" />
      </Stack>
    </>
  );
}
