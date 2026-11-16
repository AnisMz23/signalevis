// i18n minimal (KAN-41 CA2) : français québécois par défaut, anglais prêt mais désactivé.
// Tout texte visible passe par t() — aucun texte en dur dans les écrans.
import { getLocales } from 'expo-localization';

import en from './en.json';
import fr from './fr.json';

export type MessageKey = keyof typeof fr;
export type Locale = 'fr' | 'en';

export const messages: Record<Locale, Record<MessageKey, string>> = { fr, en };

// Activer 'en' ici quand les libellés anglais auront été relus.
export const ENABLED_LOCALES: readonly Locale[] = ['fr'];
export const DEFAULT_LOCALE: Locale = 'fr';

export function resolveLocale(deviceLanguage: string | null | undefined): Locale {
  const lang = (deviceLanguage ?? '').toLowerCase() as Locale;
  return ENABLED_LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
}

const currentLocale: Locale = resolveLocale(getLocales()[0]?.languageCode);

export function t(key: MessageKey, params: Record<string, string> = {}, locale: Locale = currentLocale): string {
  const template = messages[locale][key] ?? messages[DEFAULT_LOCALE][key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? `{${name}}`);
}
