// Thème issu du fichier Figma « Signalement Lévis – MVP UX/UI » (valeurs exactes, 2026-11-16).
// Même système visuel que la console (docs/design/console/README.md). Mode clair seulement :
// le design ne prévoit pas de mode sombre. Contrastes WCAG 2.1 AA vérifiés par
// __tests__/ca2_theme.test.ts.
import type { TextStyle } from 'react-native';

export type Theme = {
  background: string;   // sable
  surface: string;      // cartes, champs
  border: string;       // contour des cartes
  text: string;
  textMuted: string;
  primary: string;      // vert sapin
  onPrimary: string;
  primarySoft: string;  // sélection, pastilles d'icônes, statut « Résolu »
  neutralSoft: string;  // segments inactifs, statut « En cours »
  accent: string;       // terracotta : bouton « + » (décoratif, jamais pour du texte)
  onAccent: string;
  success: string;
  danger: string;
  dangerSoft: string;
  onDanger: string;
};

export const themes: Record<'light', Theme> = {
  light: {
    background: '#FBF7F0',
    surface: '#FFFFFF',
    border: '#E2D3B8',
    text: '#1E2A24',
    textMuted: '#5B6660',
    primary: '#1F4D3A',
    onPrimary: '#FFFFFF',
    primarySoft: '#E3EFE8',
    neutralSoft: '#F3EBDD',
    accent: '#D9643A',
    onAccent: '#FFFFFF',
    success: '#327549',   // Figma #3E8E5E assombri : 3,40:1 → 4,71:1 sur primarySoft (WCAG AA)
    danger: '#C0322A',    // Figma #C8372D assombri : 4,31:1 → 4,67:1 sur dangerSoft (WCAG AA)
    dangerSoft: '#FBE5E2',
    onDanger: '#FFFFFF',
  },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { field: 12, card: 16, hero: 24, pill: 999 } as const;

// Cible tactile minimale recommandée (WCAG 2.5.5 / guides iOS et Android).
export const MIN_TOUCH_TARGET = 48;

export function useTheme(): Theme {
  return themes.light;
}

// Styles de texte du fichier Figma (police Nunito).
export const fonts = {
  regular: 'Nunito_400Regular',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

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
