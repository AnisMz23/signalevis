// Module « api » : validation des réponses /v1 (contrat docs/api/openapi.yaml).
import { describe, expect, it, vi } from "vitest";

import { api, parseMe, parseOrganizations } from "@/lib/api/client";

const O = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("api — /v1/me et /v1/platform/organizations", () => {
  it("CA2 : parseMe accepte les trois profils du contrat", () => {
    expect(parseMe({ is_platform_admin: true, org_role: null, organization: null })).toEqual({
      isPlatformAdmin: true, orgRole: null, organization: null,
    });
    expect(
      parseMe({ is_platform_admin: false, org_role: "dispatcher", organization: { id: O, name: "X", slug: "x", status: "demo" } }),
    ).toMatchObject({ orgRole: "dispatcher", organization: { status: "demo" } });
  });

  it("CA2 : parseMe rejette une réponse hors contrat", () => {
    expect(parseMe({ is_platform_admin: "oui" })).toBeNull();
    expect(parseMe({ is_platform_admin: false, org_role: "chef", organization: null })).toBeNull();
    expect(parseMe({ is_platform_admin: false, org_role: null, organization: { id: O, status: "inconnu" } })).toBeNull();
  });

  it("CA5 : parseOrganizations conserve le statut et les agrégats", () => {
    const list = parseOrganizations({
      organizations: [{ id: O, name: "X", slug: "x", status: "demo", domains: ["voirie"], active_members: 1,
        pending_invitations: 0, reports_30d: null, created_at: "2026-11-16T00:00:00Z" }],
    });
    expect(list?.[0]).toMatchObject({ status: "demo", activeMembers: 1, reports30d: null });
    expect(parseOrganizations({ organizations: [{ id: O }] })).toBeNull();
    expect(parseOrganizations({})).toBeNull();
  });

  it("CA1 : jeton transmis en Bearer, aucune mise en cache, erreurs HTTP conservées", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }));
    expect(await api.organizations("jwt", fetchImpl as unknown as typeof fetch)).toEqual({ ok: false, status: 403 });
    expect(fetchImpl).toHaveBeenCalledWith("https://exemple.supabase.co/functions/v1/v1/platform/organizations", {
      headers: { Authorization: "Bearer jwt" }, cache: "no-store",
    });
  });

  it("CA1 : réseau indisponible → 503 ; réponse hors contrat → 502", async () => {
    const down = vi.fn(async () => { throw new TypeError("fetch failed"); });
    expect(await api.me("jwt", down as unknown as typeof fetch)).toEqual({ ok: false, status: 503 });
    const bad = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await api.me("jwt", bad as unknown as typeof fetch)).toEqual({ ok: false, status: 502 });
  });
});
