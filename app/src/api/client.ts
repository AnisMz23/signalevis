// Module interne « api » (ADR-001) : seul point d'accès de l'app au backend.
// Contrat : docs/api/openapi.yaml (racine du dépôt).

const PROD_API_URL = 'https://orkjzimjypavjqztafzl.supabase.co/functions/v1/v1';

// Surcharge possible : EXPO_PUBLIC_API_URL=<url staging> npx expo start
export const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL ?? PROD_API_URL;

export type Health =
  | { status: 'ok'; version: string; postgres: string; postgis: string }
  | { status: 'degraded' };

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function parseHealth(httpStatus: number, body: unknown): Health {
  const b = (body ?? {}) as Record<string, unknown>;
  if (
    httpStatus === 200 &&
    b.status === 'ok' &&
    isNonEmptyString(b.version) &&
    isNonEmptyString(b.postgres) &&
    isNonEmptyString(b.postgis)
  ) {
    return { status: 'ok', version: b.version, postgres: b.postgres, postgis: b.postgis };
  }
  return { status: 'degraded' };
}

export async function fetchHealth(fetchImpl: typeof fetch = fetch, timeoutMs = 8000): Promise<Health> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${API_BASE_URL}/health`, { signal: controller.signal });
    const body = await res.json().catch(() => null);
    return parseHealth(res.status, body);
  } catch {
    return { status: 'degraded' };
  } finally {
    clearTimeout(timer);
  }
}
