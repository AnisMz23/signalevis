// Onglet « Mes signalements » (Figma 08). Liste réelle : KAN-30, après l'envoi (KAN-17).
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { radius, spacing, typography, useTheme } from '@/theme';

export default function MyReportsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top + 16, 64) }]}
    >
      <Text accessibilityRole="header" style={[typography.display, { color: theme.text }]}>
        {t('reports.title')}
      </Text>
      <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[typography.body, { color: theme.textMuted }]}>{t('reports.empty')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, gap: 20 },
  empty: { borderRadius: radius.card, borderWidth: 1, padding: spacing.md },
});
