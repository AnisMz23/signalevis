// KAN-63 CA2 — Lecture des claims du JWT ajoutés par le hook KAN-51 (org_id, org_role,
// is_platform_admin). Sert UNIQUEMENT à la navigation : les droits sont reconfirmés en base par
// l'API (/v1/me, RLS) — ADR-003 D3.

export const ORG_ROLES = ["org_admin", "dispatcher", "field_worker"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export type Claims = {
  userId: string;
  email: string | null;
  isPlatformAdmin: boolean;
  orgId: string | null;
  orgRole: OrgRole | null;
};

const isOrgRole = (v: unknown): v is OrgRole => typeof v === "string" && (ORG_ROLES as readonly string[]).includes(v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalise la charge utile d'un JWT ; null si elle n'identifie pas un utilisateur. */
export function parseClaims(payload: unknown): Claims | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.sub !== "string" || !UUID.test(p.sub)) return null;
  const orgId = typeof p.org_id === "string" && UUID.test(p.org_id) ? p.org_id : null;
  return {
    userId: p.sub,
    email: typeof p.email === "string" ? p.email : null,
    isPlatformAdmin: p.is_platform_admin === true,
    orgId,
    // Un rôle sans organisation n'a pas de sens : ignoré.
    orgRole: orgId && isOrgRole(p.org_role) ? p.org_role : null,
  };
}

/** Décode (sans vérifier la signature) la charge utile d'un JWT. La vérification est faite par Supabase. */
export function decodeJwtPayload(token: string): unknown {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}
