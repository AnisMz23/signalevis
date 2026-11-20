import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, radius, spacing, typography, useTheme } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './icons';

type Variant = 'primary' | 'outline' | 'danger' | 'light';

// Bouton « pilule » du design (hauteur 52, libellé Nunito Bold 16).
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  accessibilityHint,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: theme.onPrimary, border: theme.primary },
    outline: { bg: theme.surface, fg: theme.primary, border: theme.primary },
    light: { bg: theme.surface, fg: theme.primary, border: theme.primary },
    danger: { bg: theme.danger, fg: theme.onDanger, border: theme.danger },
  }[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'outline' || variant === 'light' ? 1.5 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {icon && <Icon name={icon} color={palette.fg} />}
        <Text style={[typography.button, { color: palette.fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: MIN_TOUCH_TARGET },
});
