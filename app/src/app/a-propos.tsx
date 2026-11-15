import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { t } from '@/i18n';
import { spacing, useTheme } from '@/theme';

export default function AboutScreen() {
  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? '0.0.0';
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {t('app.name')}
      </Text>
      <Text style={[styles.body, { color: theme.text }]}>{t('about.body')}</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{t('about.hosting')}</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{t('about.version', { version })}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 24 },
});
