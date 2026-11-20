// KAN-12 CA4 — Urgence (bloquant) (Figma 09). Aucune action ne permet de poursuivre le signalement :
// appeler le 911, ou revenir au choix du type (« Ce n'est pas une urgence »).
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { radius, spacing, typography, useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';

export default function EmergencyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 96, 140) }]}>
        <View style={[styles.alert, { backgroundColor: theme.dangerSoft }]}>
          <Icon name="alert-40" color={theme.danger} />
        </View>
        <Text accessibilityRole="header" style={[typography.title, styles.center, { color: theme.text }]}>
          {t('emergency.title')}
        </Text>
        <Text style={[typography.body, styles.center, { color: theme.textMuted }]}>{t('emergency.body')}</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          testID="call-911"
          variant="danger"
          icon="phone-20"
          label={t('emergency.call.button')}
          accessibilityHint={t('emergency.call.hint')}
          onPress={() => Linking.openURL('tel:911')}
        />
        <Button
          variant="outline"
          label={t('emergency.back')}
          accessibilityHint={t('emergency.back.hint')}
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md, alignItems: 'center' },
  alert: { width: 84, height: 84, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 12, gap: 12 },
});
