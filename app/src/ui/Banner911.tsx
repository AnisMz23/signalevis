// Bannière permanente « Danger immédiat ? » de l'accueil (Figma 01, KAN-18 CA1).
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, radius, typography, useTheme } from '@/theme';

import { Icon } from './Icon';

export function Banner911() {
  const theme = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: theme.dangerSoft }]}>
      <Icon name="alert-22" color={theme.danger} />
      <View style={styles.texts} accessible>
        <Text style={[typography.captionStrong, { color: theme.danger }]}>{t('banner911.title')}</Text>
        <Text style={[typography.caption, { color: theme.text }]}>{t('banner911.body')}</Text>
      </View>
      <Pressable
        testID="banner-911"
        accessibilityRole="button"
        accessibilityLabel={t('banner911.call.label')}
        accessibilityHint={t('emergency.call.hint')}
        onPress={() => Linking.openURL('tel:911')}
        hitSlop={8}
        style={[styles.call, { backgroundColor: theme.danger }]}
      >
        <Icon name="phone-16" color={theme.onDanger} />
        <Text style={[typography.captionStrong, { color: theme.onDanger }]}>{t('banner911.call')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.card,
  },
  texts: { flex: 1, gap: 2 },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: MIN_TOUCH_TARGET - 14,
    borderRadius: radius.pill,
  },
});

