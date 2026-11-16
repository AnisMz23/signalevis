import { loadCatalog, parseCatalog, type KeyValueStore } from '../src/api/catalog';
import { DEMO_POSITION, getPosition } from '../src/location/position';

const service = {
  code: 'nid_de_poule', domain: 'voirie', domain_label: 'Voirie et travaux publics', category: 'Voirie',
  label: 'Nid-de-poule', label_en: 'Pothole', icon: 'road-variant', is_emergency: false,
  default_priority: 'medium', recipient: 'Ville de Lévis — démo', recipient_is_demo: true,
};
const body = { catalog_version: 7, services: [service] };

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => { data.set(k, v); },
  };
};
const okFetch = (b: unknown = body) => (async () => ({ status: 200, json: async () => b })) as unknown as typeof fetch;
const offlineFetch = (async () => { throw new Error('réseau'); }) as unknown as typeof fetch;
const levis = { lat: 46.76, lng: -71.18 };

describe('KAN-12 CA5 — catalogue chargé depuis l’API et mis en cache', () => {
  test('CA5 : réponse conforme au contrat acceptée ; non conforme refusée', () => {
    expect(parseCatalog(body)).toEqual({ catalog_version: 7, services: [service] });
    expect(parseCatalog({ catalog_version: 7, services: [{ ...service, recipient: '' }] })).toBeNull();
    expect(parseCatalog({ services: [] })).toBeNull();
  });

  test('CA5 : en ligne → catalogue de l’API, enregistré localement', async () => {
    const store = memoryStore();
    const r = await loadCatalog(levis, { fetchImpl: okFetch(), store, now: () => 1000 });
    expect(r).toEqual({ status: 'online', catalog: body });
    expect(store.data.size).toBe(2);   // zone + dernière liste connue
  });

  test('CA5 : hors ligne → liste enregistrée, avec sa date', async () => {
    const store = memoryStore();
    await loadCatalog(levis, { fetchImpl: okFetch(), store, now: () => 1000 });
    const r = await loadCatalog(levis, { fetchImpl: offlineFetch, store });
    expect(r).toEqual({ status: 'offline', catalog: body, savedAt: 1000 });
  });

  test('CA5 : hors ligne dans une autre zone → dernière liste connue', async () => {
    const store = memoryStore();
    await loadCatalog(levis, { fetchImpl: okFetch(), store, now: () => 2000 });
    const r = await loadCatalog({ lat: 46.70, lng: -71.30 }, { fetchImpl: offlineFetch, store });
    expect(r.status).toBe('offline');
  });

  test('CA5 : nouvelle version publiée → le cache est remplacé', async () => {
    const store = memoryStore();
    await loadCatalog(levis, { fetchImpl: okFetch(), store, now: () => 1 });
    await loadCatalog(levis, { fetchImpl: okFetch({ ...body, catalog_version: 8 }), store, now: () => 2 });
    const r = await loadCatalog(levis, { fetchImpl: offlineFetch, store });
    expect(r.status === 'offline' && r.catalog.catalog_version).toBe(8);
  });

  test('CA5 : ni réseau ni cache → indisponible, sans exception', async () => {
    const r = await loadCatalog(levis, { fetchImpl: offlineFetch, store: memoryStore() });
    expect(r).toEqual({ status: 'unavailable' });
  });

  test('CA5 : réponse invalide du serveur → bascule sur le cache', async () => {
    const store = memoryStore();
    await loadCatalog(levis, { fetchImpl: okFetch(), store, now: () => 5 });
    const r = await loadCatalog(levis, { fetchImpl: okFetch({ oops: true }), store });
    expect(r.status).toBe('offline');
  });
});

describe('KAN-12 — position pour le catalogue', () => {
  const api = (overrides: Record<string, unknown>) => ({
    Accuracy: { Balanced: 3 },
    requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => ({ coords: { latitude: 46.8, longitude: -71.2 } }),
    ...overrides,
  }) as unknown as Parameters<typeof getPosition>[0];

  test('autorisée → position de l’appareil', async () => {
    await expect(getPosition(api({}))).resolves.toEqual({ lat: 46.8, lng: -71.2, source: 'device' });
  });

  test('refusée → position de démonstration (centre de Lévis)', async () => {
    const p = await getPosition(api({ requestForegroundPermissionsAsync: async () => ({ status: 'denied' }) }));
    expect(p).toEqual(DEMO_POSITION);
    expect(p.source).toBe('demo');
  });

  test('erreur ou délai dépassé → position de démonstration', async () => {
    const p = await getPosition(api({ getCurrentPositionAsync: () => new Promise(() => undefined) }), 10);
    expect(p).toEqual(DEMO_POSITION);
  });
});
