// KAN-12 — Confirmation du type choisi. Les étapes suivantes (photos KAN-13, position KAN-14,
// description KAN-16) viendront s'ajouter ici.
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { t } from '@/i18n';
import { spacing, useTheme } from '@/theme';

export default function SelectedTypeScreen() {
  const theme = useTheme();
  const { label, recipient } = useLocalSearchParams<{ code: string; label: string; recipient: string }>();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {label}
      </Text>
      <Text style={[styles.body, { color: theme.text }]}>{t('type.recipient', { name: recipient ?? '' })}</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{t('selected.next')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 24 },
});
