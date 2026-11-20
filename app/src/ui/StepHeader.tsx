// En-tête d'étape du parcours de signalement (Figma « En-tête étape ») : retour, titre,
// « n/5 » et barre de progression en 5 segments.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { radius, spacing, typography, useTheme } from '@/theme';

import { Icon } from './Icon';

export const REPORT_STEPS = 5;

export function StepHeader({ title, step }: { title: string; step: number }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const stepText = t('common.step', { current: String(step), total: String(REPORT_STEPS) });
  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 56), backgroundColor: theme.background }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          hitSlop={6}
          style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Icon name="chevron-left" color={theme.text} />
        </Pressable>
        <Text accessibilityRole="header" style={[typography.subtitle, styles.title, { color: theme.text }]}>
          {title}
        </Text>
        <Text
          accessibilityLabel={t('common.step.label', { current: String(step), total: String(REPORT_STEPS) })}
          style={[typography.captionStrong, { color: theme.textMuted }]}
        >
          {stepText}
        </Text>
      </View>
      <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: REPORT_STEPS }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < step ? theme.primary : theme.neutralSoft }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  progress: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
});
