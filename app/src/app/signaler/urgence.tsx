// KAN-12 CA4 — Type d'urgence : écran bloquant « Composez le 911 ». Aucune action ne permet de
// poursuivre le signalement (seuls l'appel au 911 et le retour à la liste sont proposés).
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, spacing, useTheme } from '@/theme';

export default function EmergencyScreen() {
  const theme = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View accessible accessibilityRole="alert" style={[styles.banner, { backgroundColor: theme.danger }]}>
        <Text style={[styles.bannerTitle, { color: theme.onDanger }]}>{t('emergency.title')}</Text>
        <Text style={[styles.bannerCall, { color: theme.onDanger }]}>{t('emergency.call')}</Text>
      </View>
      <Text style={[styles.body, { color: theme.text }]}>{t('emergency.body')}</Text>
      <Pressable
        testID="call-911"
        accessibilityRole="button"
        accessibilityLabel={t('emergency.call.button')}
        accessibilityHint={t('emergency.call.hint')}
        onPress={() => Linking.openURL('tel:911')}
        style={[styles.button, { backgroundColor: theme.danger }]}
      >
        <Text style={[styles.buttonText, { color: theme.onDanger }]}>{t('emergency.call.button')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('emergency.back')}
        accessibilityHint={t('emergency.back.hint')}
        onPress={() => router.back()}
        style={[styles.button, { borderColor: theme.primary, borderWidth: 2 }]}
      >
        <Text style={[styles.buttonText, { color: theme.primary }]}>{t('emergency.back')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  banner: { borderRadius: 16, padding: spacing.lg, gap: spacing.xs },
  bannerTitle: { fontSize: 22, fontWeight: '700' },
  bannerCall: { fontSize: 30, fontWeight: '800' },
  body: { fontSize: 17, lineHeight: 24 },
  button: { minHeight: MIN_TOUCH_TARGET, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  buttonText: { fontSize: 18, fontWeight: '700' },
});
