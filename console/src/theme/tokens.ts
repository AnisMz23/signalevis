// Système visuel des maquettes console (docs/design/console/README.md) — KAN-63 CA4.
export const colors = {
  sapin: "#1F4D3A", // navigation, boutons primaires, états sélectionnés
  sapinHover: "#163829",
  sable: "#FBF7F0", // fond de page
  surface: "#FFFFFF",
  sableSoft: "#F3EBDD",
  border: "#E2D3B8",
  text: "#1E2A24",
  textMuted: "#4F5F57",
  onSapin: "#FFFFFF",
  terracotta: "#D9643A", // accent décoratif seulement (contraste insuffisant pour du texte)
  alertText: "#8A3414",
  alertBg: "#FBE3D8",
  successText: "#1F5B35",
  successBg: "#E3EFE8",
  dangerText: "#9B1C14",
  dangerBg: "#FBE5E2",
  focus: "#1F4D3A",
} as const;

// Paires texte / fond utilisées par la console : toutes ≥ 4,5:1 (vérifié par __tests__/ca4_*).
export const textPairs: ReadonlyArray<readonly [keyof typeof colors, keyof typeof colors]> = [
  ["text", "sable"], ["text", "surface"], ["textMuted", "sable"], ["textMuted", "surface"],
  ["onSapin", "sapin"], ["onSapin", "sapinHover"], ["sapin", "sable"], ["sapin", "surface"],
  ["alertText", "alertBg"], ["successText", "successBg"], ["dangerText", "dangerBg"],
  ["text", "sableSoft"], ["dangerText", "surface"],
];

export const MIN_TARGET_PX = 44;

/** Ratio de contraste WCAG 2.1 entre deux couleurs #RRGGBB. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
