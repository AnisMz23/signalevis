import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { t } from '@/i18n';
import { spacing, typography, useTheme } from '@/theme';
import { HealthStatus } from '@/ui/HealthStatus';

export default function AboutScreen() {
  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? '0.0.0';
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={[typography.title, { color: theme.text }]}>
        {t('app.name')}
      </Text>
      <Text style={[typography.body, { color: theme.text }]}>{t('about.body')}</Text>
      <Text style={[typography.body, { color: theme.textMuted }]}>{t('about.hosting')}</Text>
      <HealthStatus />
      <Text style={[typography.caption, { color: theme.textMuted }]}>{t('about.version', { version })}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
});
