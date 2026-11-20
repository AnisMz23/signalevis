import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, radius, typography, useTheme } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './icons';

// Tuile de catégorie du design (Figma « Tuile catégorie ») : pastille d'icône, libellé, destinataire.
export function CategoryTile({
  label,
  subtitle,
  icon,
  selected,
  onPress,
  accessibilityHint,
  testID,
}: {
  label: string;
  subtitle: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  accessibilityHint?: string;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${subtitle}`}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          borderWidth: selected ? 2 : 1,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.pastille, { backgroundColor: theme.primarySoft }]}>
        <Icon name={icon} color={theme.primary} />
      </View>
      <View style={styles.texts}>
        <Text style={[typography.bodyStrong, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[typography.caption, { color: theme.textMuted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    minHeight: MIN_TOUCH_TARGET + 20,
    borderRadius: radius.card,
  },
  pastille: { width: 38, height: 38, borderRadius: radius.field, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
});
