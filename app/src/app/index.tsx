import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchHealth, type Health } from '@/api/client';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, spacing, useTheme } from '@/theme';

type HealthState = 'checking' | Health['status'];

export default function HomeScreen() {
  const theme = useTheme();
  const [health, setHealth] = useState<HealthState>('checking');

  // Vérification au montage : l'état initial est déjà « checking ».
  useEffect(() => {
    let active = true;
    fetchHealth().then((result) => {
      if (active) setHealth(result.status);
    });
    return () => {
      active = false;
    };
  }, []);

  const retry = useCallback(async () => {
    setHealth('checking');
    const result = await fetchHealth();
    setHealth(result.status);
  }, []);

  const statusText =
    health === 'checking' ? t('health.checking') : health === 'ok' ? t('health.ok') : t('health.down');
  const statusColor = health === 'ok' ? theme.success : health === 'degraded' ? theme.danger : theme.textMuted;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={[styles.headline, { color: theme.text }]}>
        {t('home.headline')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('home.subtitle')}</Text>

      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={statusText}
        style={[styles.card, { backgroundColor: theme.surface }]}
        testID="health-status"
      >
        {health === 'checking' && <ActivityIndicator color={theme.primary} />}
        <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
      </View>

      {health === 'degraded' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('health.retry')}
          accessibilityHint={t('health.retry.hint')}
          onPress={retry}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.buttonText, { color: theme.onPrimary }]}>{t('health.retry')}</Text>
        </Pressable>
      )}

      <Link href="/signaler/type" asChild>
        <Pressable
          testID="report-button"
          accessibilityRole="button"
          accessibilityLabel={t('home.report')}
          accessibilityHint={t('home.report.hint')}
          style={StyleSheet.flatten([styles.button, { backgroundColor: theme.primary }])}
        >
          <Text style={[styles.buttonText, { color: theme.onPrimary }]}>{t('home.report')}</Text>
        </Pressable>
      </Link>

      <Link href="/a-propos" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('home.about')}
          accessibilityHint={t('home.about.hint')}
          style={StyleSheet.flatten([styles.button, { borderColor: theme.primary, borderWidth: 2 }])}
        >
          <Text style={[styles.buttonText, { color: theme.primary }]}>{t('home.about')}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  headline: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24 },
  card: { padding: spacing.md, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  status: { fontSize: 17, fontWeight: '600' },
  button: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
});
