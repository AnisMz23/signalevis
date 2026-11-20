// Accueil (Figma 01 · Accueil).
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, radius, spacing, typography, useTheme } from '@/theme';
import { Banner911 } from '@/ui/Banner911';
import { Button } from '@/ui/Button';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top + 16, 64) }]}
    >
      <View style={styles.greeting}>
        <Text accessibilityRole="header" style={[typography.display, { color: theme.text }]}>
          {t('home.greeting')}
        </Text>
        <Text style={[typography.body, { color: theme.textMuted }]}>{t('home.subtitle')}</Text>
      </View>

      <Banner911 />

      <View style={[styles.hero, { backgroundColor: theme.primary }]}>
        <Text style={[typography.subtitle, { color: theme.onPrimary }]}>{t('home.cta.title')}</Text>
        <Text style={[typography.body, { color: theme.onPrimary }]}>{t('home.cta.body')}</Text>
        <Button
          testID="report-button"
          variant="light"
          icon="plus-btn"
          label={t('home.report')}
          accessibilityHint={t('home.report.hint')}
          onPress={() => router.push('/signaler/type')}
        />
      </View>

      <View style={styles.sectionTitle}>
        <Text accessibilityRole="header" style={[typography.subtitle, { color: theme.text }]}>
          {t('home.recent')}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('home.recent.all')}
          accessibilityHint={t('home.recent.all.hint')}
          onPress={() => router.navigate('/mes-signalements')}
          hitSlop={12}
          style={styles.seeAll}
        >
          <Text style={[typography.captionStrong, { color: theme.primary }]}>{t('home.recent.all')}</Text>
        </Pressable>
      </View>
      <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[typography.body, { color: theme.textMuted }]}>{t('reports.empty')}</Text>
      </View>

      <Link href="/a-propos" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={t('home.about.link')} style={styles.about}>
          <Text style={[typography.captionStrong, { color: theme.primary }]}>{t('home.about.link')}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 20 },
  greeting: { gap: spacing.xs },
  hero: { borderRadius: radius.hero, padding: 20, gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { minHeight: MIN_TOUCH_TARGET - 16, justifyContent: 'center' },
  empty: { borderRadius: radius.card, borderWidth: 1, padding: spacing.md },
  about: { alignSelf: 'center', minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
});
