// Module interne « api » — accès de la console au backend, uniquement par l'API /v1
// (contrat docs/api/openapi.yaml, ADR-001 : pas d'accès PostgREST direct pour les écrans métier).
import { env } from "@/lib/env";

export type OrgStatus = "demo" | "active" | "suspended";
export const ORG_STATUSES: readonly OrgStatus[] = ["demo", "active", "suspended"];

export type Me = {
  isPlatformAdmin: boolean;
  orgRole: "org_admin" | "dispatcher" | "field_worker" | null;
  organization: { id: string; name: string; slug: string; status: OrgStatus } | null;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  domains: string[];
  activeMembers: number;
  pendingInvitations: number;
  reports30d: number | null;
  createdAt: string;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number };

const isStatus = (v: unknown): v is OrgStatus => typeof v === "string" && (ORG_STATUSES as string[]).includes(v);
const rec = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export function parseMe(body: unknown): Me | null {
  const b = rec(body);
  if (!b || typeof b.is_platform_admin !== "boolean") return null;
  const role = b.org_role;
  if (role !== null && role !== "org_admin" && role !== "dispatcher" && role !== "field_worker") return null;
  const o = rec(b.organization);
  let organization: Me["organization"] = null;
  if (o) {
    if (typeof o.id !== "string" || typeof o.name !== "string" || typeof o.slug !== "string" || !isStatus(o.status)) {
      return null;
    }
    organization = { id: o.id, name: o.name, slug: o.slug, status: o.status };
  } else if (b.organization !== null) return null;
  return { isPlatformAdmin: b.is_platform_admin, orgRole: role, organization };
}

export function parseOrganizations(body: unknown): OrganizationSummary[] | null {
  const list = rec(body)?.organizations;
  if (!Array.isArray(list)) return null;
  const out: OrganizationSummary[] = [];
  for (const item of list) {
    const o = rec(item);
    if (
      !o || typeof o.id !== "string" || typeof o.name !== "string" || typeof o.slug !== "string" ||
      !isStatus(o.status) || !Array.isArray(o.domains) || typeof o.active_members !== "number" ||
      typeof o.pending_invitations !== "number" || typeof o.created_at !== "string"
    ) return null;
    out.push({
      id: o.id, name: o.name, slug: o.slug, status: o.status,
      domains: o.domains.filter((d): d is string => typeof d === "string"),
      activeMembers: o.active_members, pendingInvitations: o.pending_invitations,
      reports30d: typeof o.reports_30d === "number" ? o.reports_30d : null,
      createdAt: o.created_at,
    });
  }
  return out;
}

async function get<T>(path: string, token: string, parse: (b: unknown) => T | null, fetchImpl = fetch): Promise<ApiResult<T>> {
  try {
    const res = await fetchImpl(`${env.apiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = parse(await res.json().catch(() => null));
    return data === null ? { ok: false, status: 502 } : { ok: true, data };
  } catch {
    return { ok: false, status: 503 };
  }
}

export const api = {
  me: (token: string, fetchImpl?: typeof fetch) => get("/me", token, parseMe, fetchImpl),
  organizations: (token: string, fetchImpl?: typeof fetch) =>
    get("/platform/organizations", token, parseOrganizations, fetchImpl),
};
