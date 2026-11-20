// KAN-63 CA3 — Navigation selon le rôle ; accès refusé hors rôle (JWT puis confirmation en base).
import { beforeEach, describe, expect, it, vi } from "vitest";

import { decide, homePath } from "@/lib/auth/access";
import type { Claims } from "@/lib/auth/claims";

const base: Claims = { userId: "u", email: null, isPlatformAdmin: false, orgId: null, orgRole: null };
const superAdmin: Claims = { ...base, isPlatformAdmin: true };
const orgAdmin: Claims = { ...base, orgId: "o", orgRole: "org_admin" };
const dispatcher: Claims = { ...base, orgId: "o", orgRole: "dispatcher" };
const fieldWorker: Claims = { ...base, orgId: "o", orgRole: "field_worker" };
const citizen: Claims = base;

describe("CA3 — matrice rôle × espace (proxy)", () => {
  const cases: Array<[string, Claims | null, string, string]> = [
    ["non connecté", null, "/platform/organizations", "/connexion"],
    ["non connecté", null, "/org", "/connexion"],
    ["super admin", superAdmin, "/platform/organizations", "allow"],
    ["super admin", superAdmin, "/org", "/acces-refuse"],
    ["admin d'organisation", orgAdmin, "/org", "allow"],
    ["admin d'organisation", orgAdmin, "/platform/organizations", "/acces-refuse"],
    ["dispatcher", dispatcher, "/org/file", "allow"],
    ["dispatcher", dispatcher, "/platform", "/acces-refuse"],
    ["travailleur terrain", fieldWorker, "/org", "/acces-refuse"],
    ["citoyen", citizen, "/org", "/acces-refuse"],
    ["citoyen", citizen, "/platform/organizations", "/acces-refuse"],
    ["piège de préfixe", dispatcher, "/platformx", "/org"],
  ];
  it.each(cases)("CA3 : %s sur %s", (_, claims, path, expected) => {
    const d = decide(path, claims);
    expect(d.kind === "allow" ? "allow" : d.to).toBe(expected);
  });

  it("CA3 : accueil selon le rôle", () => {
    expect(homePath(superAdmin)).toBe("/platform/organizations");
    expect(homePath(orgAdmin)).toBe("/org");
    expect(homePath(dispatcher)).toBe("/org");
    expect(homePath(fieldWorker)).toBeNull();
    expect(decide("/", citizen)).toEqual({ kind: "redirect", to: "/acces-refuse" });
    expect(decide("/", dispatcher)).toEqual({ kind: "redirect", to: "/org" });
  });

  it("CA3 : pages publiques accessibles sans session", () => {
    for (const p of ["/connexion", "/acces-refuse", "/auth/confirm"]) expect(decide(p, null)).toEqual({ kind: "allow" });
  });
});

// Confirmation en base : le claim seul ne suffit pas (ADR-003 D3).
const getSession = vi.fn();
const me = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/server", () => ({ getSession: () => getSession() }));
vi.mock("@/lib/api/client", () => ({ api: { me: (t: string) => me(t) } }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

describe("CA3 — garde des pages confirmée par /v1/me", () => {
  beforeEach(() => {
    getSession.mockReset();
    me.mockReset();
  });
  const session = { accessToken: "jwt", claims: superAdmin };
  const meOk = (data: object) => ({ ok: true, data: { isPlatformAdmin: false, orgRole: null, organization: null, ...data } });

  it("CA3 : sans session → connexion", async () => {
    getSession.mockResolvedValue(null);
    const { requireArea } = await import("@/lib/auth/guard");
    await expect(requireArea("platform")).rejects.toThrow("REDIRECT /connexion");
  });

  it("CA3 : claim super admin non confirmé en base → accès refusé", async () => {
    getSession.mockResolvedValue(session);
    me.mockResolvedValue(meOk({ isPlatformAdmin: false }));
    const { requireArea } = await import("@/lib/auth/guard");
    await expect(requireArea("platform")).rejects.toThrow("REDIRECT /acces-refuse");
  });

  it("CA3 : super admin confirmé → autorisé", async () => {
    getSession.mockResolvedValue(session);
    me.mockResolvedValue(meOk({ isPlatformAdmin: true }));
    const { requireArea } = await import("@/lib/auth/guard");
    await expect(requireArea("platform")).resolves.toMatchObject({ token: "jwt" });
  });

  it("CA3 : travailleur terrain confirmé → console organisation refusée", async () => {
    getSession.mockResolvedValue(session);
    me.mockResolvedValue(meOk({ orgRole: "field_worker" }));
    const { requireArea } = await import("@/lib/auth/guard");
    await expect(requireArea("org")).rejects.toThrow("REDIRECT /acces-refuse");
  });

  it("CA3 : dispatcher confirmé → console organisation autorisée", async () => {
    getSession.mockResolvedValue(session);
    me.mockResolvedValue(meOk({ orgRole: "dispatcher" }));
    const { requireArea } = await import("@/lib/auth/guard");
    await expect(requireArea("org")).resolves.toMatchObject({ me: { orgRole: "dispatcher" } });
  });

  it("CA3 : jeton refusé par l'API (401) → connexion ; API indisponible → message", async () => {
    getSession.mockResolvedValue(session);
    const { requireArea } = await import("@/lib/auth/guard");
    me.mockResolvedValue({ ok: false, status: 401 });
    await expect(requireArea("org")).rejects.toThrow("REDIRECT /connexion");
    me.mockResolvedValue({ ok: false, status: 503 });
    await expect(requireArea("org")).resolves.toEqual({ unavailable: true });
  });
});
