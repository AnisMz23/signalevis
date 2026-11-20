import { contrastRatio, MIN_TOUCH_TARGET, themes } from '../src/theme';

const th = themes.light;

describe('CA2 — accessibilité WCAG 2.1 AA (contrastes du design Figma)', () => {
  test('CA2 : le calcul de contraste est correct (noir sur blanc = 21:1)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  // Texte : ≥ 4,5:1 (WCAG 1.4.3)
  const textPairs: [string, string, string][] = [
    ['texte / fond', th.text, th.background],
    ['texte / surface', th.text, th.surface],
    ['texte secondaire / fond', th.textMuted, th.background],
    ['texte secondaire / surface', th.textMuted, th.surface],
    ['texte / sélection', th.text, th.primarySoft],
    ['texte secondaire / sélection', th.textMuted, th.primarySoft],
    ['texte / statut neutre', th.text, th.neutralSoft],
    ['bouton principal', th.onPrimary, th.primary],
    ['lien, bouton contour / fond', th.primary, th.background],
    ['lien, bouton contour / surface', th.primary, th.surface],
    ['statut « Résolu »', th.success, th.primarySoft],
    ['bannière 911 : titre', th.danger, th.dangerSoft],
    ['bannière 911 : texte', th.text, th.dangerSoft],
    ['bouton 911', th.onDanger, th.danger],
  ];
  for (const [label, fg, bg] of textPairs) {
    test(`CA2 : ${label} ≥ 4,5:1`, () => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Éléments graphiques porteurs de sens : ≥ 3:1 (WCAG 1.4.11)
  test('CA2 : icône « + » sur le bouton terracotta ≥ 3:1', () => {
    expect(contrastRatio(th.onAccent, th.accent)).toBeGreaterThanOrEqual(3);
  });
  test('CA2 : pictogramme d’alerte sur fond rose ≥ 3:1', () => {
    expect(contrastRatio(th.danger, th.dangerSoft)).toBeGreaterThanOrEqual(3);
  });

  test('CA2 : cible tactile minimale de 48 points', () => {
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(48);
  });
});
