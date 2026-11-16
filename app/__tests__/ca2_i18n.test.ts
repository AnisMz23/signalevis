import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import en from '../src/i18n/en.json';
import fr from '../src/i18n/fr.json';
import { ENABLED_LOCALES, resolveLocale, t } from '../src/i18n';

describe('CA2 — i18n FR (EN prêt)', () => {
  test('CA2 : FR et EN ont exactement les mêmes clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  test('CA2 : aucune traduction vide', () => {
    for (const dict of [fr, en]) {
      for (const [key, value] of Object.entries(dict)) {
        expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
      }
    }
  });

  test('CA2 : français par défaut, anglais prêt mais désactivé', () => {
    expect(ENABLED_LOCALES).toEqual(['fr']);
    expect(resolveLocale('en')).toBe('fr');
    expect(resolveLocale('fr')).toBe('fr');
    expect(resolveLocale(undefined)).toBe('fr');
    expect(t('health.ok', {}, 'en')).toBe('Service operational');
  });

  test('CA2 : interpolation des paramètres', () => {
    expect(t('about.version', { version: '1.2.3' }, 'fr')).toBe('Version 1.2.3');
  });

  test('CA2 : aucun texte en dur dans les écrans (tout passe par t())', () => {
    const screensDir = join(__dirname, '../src/app');
    const files = readdirSync(screensDir).filter((f) => statSync(join(screensDir, f)).isFile());
    for (const file of files) {
      const source = readFileSync(join(screensDir, file), 'utf8');
      // Texte JSX littéral : >Mot< entre deux balises
      const hardcoded = source.match(/>\s*[A-Za-zÀ-ÿ][^<>{}]*</g) ?? [];
      expect({ file, hardcoded }).toEqual({ file, hardcoded: [] });
    }
  });
});
