// État du service (KAN-41 / KAN-42) : déplacé de l'accueil vers « À propos » avec le design Figma,
// qui ne prévoit pas d'indicateur technique sur l'accueil.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { fetchHealth, type Health } from '@/api/client';
import { t } from '@/i18n';
import { radius, spacing, typography, useTheme } from '@/theme';

import { Button } from './Button';

type HealthState = 'checking' | Health['status'];

export function HealthStatus() {
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
    <View style={styles.wrapper}>
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={statusText}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        testID="health-status"
      >
        {health === 'checking' && <ActivityIndicator color={theme.primary} />}
        <Text style={[typography.bodyStrong, { color: statusColor }]}>{statusText}</Text>
      </View>
      {health === 'degraded' && (
        <Button label={t('health.retry')} accessibilityHint={t('health.retry.hint')} onPress={retry} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  card: {
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
