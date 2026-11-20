// KAN-12 — Type choisi : étape 2/5 provisoire. L'écran Photos (Figma 03) viendra avec KAN-13.
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { radius, spacing, typography, useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { domainIcon, Icon } from '@/ui/Icon';
import { StepHeader } from '@/ui/StepHeader';

export default function SelectedTypeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { label, recipient, domain, domainLabel } = useLocalSearchParams<{
    code: string;
    label: string;
    recipient: string;
    domain: string;
    domainLabel: string;
  }>();
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <StepHeader title={t('selected.title')} step={2} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.chip, { backgroundColor: theme.primarySoft }]}>
          <Icon name={domainIcon(domain ?? '')} color={theme.primary} />
          <Text style={[typography.captionStrong, { color: theme.primary }]}>
            {t('selected.chip', { domain: domainLabel ?? '', type: label ?? '' })}
          </Text>
        </View>
        <Text style={[typography.body, { color: theme.text }]}>{t('type.recipient', { name: recipient ?? '' })}</Text>
        <Text style={[typography.body, { color: theme.textMuted }]}>{t('selected.next')}</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button variant="outline" label={t('tabs.home')} onPress={() => router.dismissAll()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 12 },
});
