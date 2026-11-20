// Libellés de la console (KAN-63 CA4) : français (Québec), aucun texte en dur dans les écrans.
import fr from "./fr.json";

export type MessageKey = keyof typeof fr;

export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  return fr[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export const isMessageKey = (k: string): k is MessageKey => Object.prototype.hasOwnProperty.call(fr, k);
