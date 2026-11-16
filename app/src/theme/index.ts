// Thème clair / sombre (KAN-41 CA2). Couleurs choisies pour un contraste WCAG 2.1 AA
// (≥ 4,5:1 pour le texte) — vérifié par __tests__/theme.test.ts.
import { useColorScheme } from 'react-native';

export type Theme = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  success: string;
  danger: string;
  onDanger: string;
};

export const themes: Record<'light' | 'dark', Theme> = {
  light: {
    background: '#FFFFFF',
    surface: '#F2F5F8',
    text: '#14202B',
    textMuted: '#4A5866',
    primary: '#0B5CAD',
    onPrimary: '#FFFFFF',
    success: '#1B6E3A',
    danger: '#B3261E',
    onDanger: '#FFFFFF',
  },
  dark: {
    background: '#0F1720',
    surface: '#1B2632',
    text: '#EEF2F6',
    textMuted: '#B4C0CC',
    primary: '#8CC4FF',
    onPrimary: '#0F1720',
    success: '#7FD69B',
    danger: '#FFB4AB',
    onDanger: '#0F1720',
  },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

// Cible tactile minimale recommandée (WCAG 2.5.5 / guides iOS et Android).
export const MIN_TOUCH_TARGET = 48;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}

// Ratio de contraste WCAG 2.1 entre deux couleurs hexadécimales #RRGGBB.
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
