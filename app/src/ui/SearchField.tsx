import { StyleSheet, TextInput, View } from 'react-native';

import { MIN_TOUCH_TARGET, radius, spacing, typography, useTheme } from '@/theme';

import { Icon } from './Icon';

// Champ de recherche « pilule » du design (Figma « Champ recherche »).
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Icon name="search" color={theme.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[typography.body, styles.input, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  input: { flex: 1, paddingVertical: 12 },
});
