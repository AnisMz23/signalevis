import { contrastRatio, MIN_TOUCH_TARGET, themes } from '../src/theme';

describe('CA2 — accessibilité WCAG 2.1 AA (contrastes)', () => {
  test('CA2 : le calcul de contraste est correct (noir sur blanc = 21:1)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  for (const [mode, th] of Object.entries(themes)) {
    const pairs: [string, string, string][] = [
      ['texte / fond', th.text, th.background],
      ['texte / surface', th.text, th.surface],
      ['texte secondaire / fond', th.textMuted, th.background],
      ['texte secondaire / surface', th.textMuted, th.surface],
      ['bouton principal', th.onPrimary, th.primary],
      ['lien / fond', th.primary, th.background],
      ['succès / surface', th.success, th.surface],
      ['erreur / surface', th.danger, th.surface],
      ['bannière urgence 911', th.onDanger, th.danger],
      ['erreur / fond', th.danger, th.background],
    ];
    for (const [label, fg, bg] of pairs) {
      test(`CA2 : thème ${mode} — ${label} ≥ 4,5:1`, () => {
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  test('CA2 : cible tactile minimale de 48 points', () => {
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(48);
  });
});
