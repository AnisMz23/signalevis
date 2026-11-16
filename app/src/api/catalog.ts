// KAN-12 CA5 — catalogue des services (GET /v1/services) avec cache local hors ligne.
// Contrat : docs/api/openapi.yaml (schémas Catalog et Service).
import { API_BASE_URL } from './client';

export type Service = {
  code: string;
  domain: string;
  domain_label: string;
  category: string;
  label: string;
  label_en: string | null;
  icon: string;
  is_emergency: boolean;
  default_priority: 'low' | 'medium' | 'high';
  recipient: string;
  recipient_is_demo: boolean;
};

export type Catalog = { catalog_version: number; services: Service[] };

export type CatalogResult =
  | { status: 'online'; catalog: Catalog }
  | { status: 'offline'; catalog: Catalog; savedAt: number }
  | { status: 'unavailable' };

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

function parseService(raw: unknown): Service | null {
  const s = (raw ?? {}) as Record<string, unknown>;
  if (
    !isString(s.code) || !isString(s.domain) || !isString(s.domain_label) || !isString(s.category) ||
    !isString(s.label) || !isString(s.icon) || typeof s.is_emergency !== 'boolean' ||
    !['low', 'medium', 'high'].includes(s.default_priority as string) || !isString(s.recipient) ||
    typeof s.recipient_is_demo !== 'boolean'
  ) {
    return null;
  }
  return {
    code: s.code, domain: s.domain, domain_label: s.domain_label, category: s.category,
    label: s.label, label_en: isString(s.label_en) ? s.label_en : null, icon: s.icon,
    is_emergency: s.is_emergency, default_priority: s.default_priority as Service['default_priority'],
    recipient: s.recipient, recipient_is_demo: s.recipient_is_demo,
  };
}

/** Valide la réponse selon le contrat ; tout élément non conforme invalide la réponse. */
export function parseCatalog(body: unknown): Catalog | null {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!Number.isInteger(b.catalog_version) || !Array.isArray(b.services)) return null;
  const services = b.services.map(parseService);
  if (services.some((s) => s === null)) return null;
  return { catalog_version: b.catalog_version as number, services: services as Service[] };
}

// Clé de cache par zone (~1 km) + dernière liste connue, pour un usage hors ligne.
const zoneKey = (lat: number, lng: number) => `catalog:${lat.toFixed(2)},${lng.toFixed(2)}`;
const LAST_KEY = 'catalog:last';

type Cached = { savedAt: number; catalog: Catalog };

async function readCache(store: KeyValueStore, key: string): Promise<Cached | null> {
  try {
    const raw = await store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    const catalog = parseCatalog(parsed.catalog);
    return catalog && Number.isFinite(parsed.savedAt) ? { savedAt: parsed.savedAt, catalog } : null;
  } catch {
    return null;
  }
}

function defaultStore(): KeyValueStore {
  // Chargé à la demande : module natif (expo-sqlite), remplacé par un double en test.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-sqlite/kv-store').default as KeyValueStore;
}

/**
 * Réseau d'abord ; en cas d'échec, dernière liste enregistrée pour cette zone, sinon la dernière
 * liste connue. Le catalogue est petit : il est toujours rechargé quand le réseau répond, et la
 * catalog_version reçue est conservée avec le cache.
 */
export async function loadCatalog(
  position: { lat: number; lng: number },
  deps: { fetchImpl?: typeof fetch; store?: KeyValueStore; now?: () => number; timeoutMs?: number } = {},
): Promise<CatalogResult> {
  const { fetchImpl = fetch, now = Date.now, timeoutMs = 8000 } = deps;
  const store = deps.store ?? defaultStore();
  const key = zoneKey(position.lat, position.lng);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${API_BASE_URL}/services?lat=${position.lat.toFixed(6)}&lng=${position.lng.toFixed(6)}`;
    const res = await fetchImpl(url, { signal: controller.signal });
    const catalog = res.status === 200 ? parseCatalog(await res.json().catch(() => null)) : null;
    if (catalog) {
      const entry = JSON.stringify({ savedAt: now(), catalog } satisfies Cached);
      await Promise.all([store.setItem(key, entry), store.setItem(LAST_KEY, entry)]).catch(() => undefined);
      return { status: 'online', catalog };
    }
  } catch {
    // réseau indisponible : on bascule sur le cache
  } finally {
    clearTimeout(timer);
  }

  const cached = (await readCache(store, key)) ?? (await readCache(store, LAST_KEY));
  return cached ? { status: 'offline', catalog: cached.catalog, savedAt: cached.savedAt } : { status: 'unavailable' };
}
