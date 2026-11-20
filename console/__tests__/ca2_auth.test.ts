// KAN-63 CA2 — Connexion par courriel (lien magique / OTP) et lecture des claims du hook KAN-51.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { decodeJwtPayload, parseClaims } from "@/lib/auth/claims";

const U = "11111111-2222-4333-8444-555555555555";
const O = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const signInWithOtp = vi.fn();
const verifyOtp = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  supabaseServer: async () => ({ auth: { signInWithOtp, verifyOtp, signOut: vi.fn() } }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Map([["host", "console.exemple.ca"], ["x-forwarded-proto", "https"]]),
}));
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT ${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

describe("CA2 — claims du JWT", () => {
  it("CA2 : super admin", () => {
    expect(parseClaims({ sub: U, email: "a@b.ca", is_platform_admin: true })).toEqual({
      userId: U, email: "a@b.ca", isPlatformAdmin: true, orgId: null, orgRole: null,
    });
  });

  it("CA2 : membre d'organisation (org_id, org_role)", () => {
    const c = parseClaims({ sub: U, org_id: O, org_role: "dispatcher", is_platform_admin: false });
    expect(c).toMatchObject({ isPlatformAdmin: false, orgId: O, orgRole: "dispatcher" });
  });

  it("CA2 : citoyen ou jeton sans claims du hook → aucun droit", () => {
    expect(parseClaims({ sub: U })).toMatchObject({ isPlatformAdmin: false, orgId: null, orgRole: null });
  });

  it("CA2 : valeurs invalides ignorées (rôle inconnu, rôle sans organisation, is_platform_admin non booléen)", () => {
    expect(parseClaims({ sub: U, org_id: O, org_role: "pirate" })?.orgRole).toBeNull();
    expect(parseClaims({ sub: U, org_role: "org_admin" })?.orgRole).toBeNull();
    expect(parseClaims({ sub: U, is_platform_admin: "true" })?.isPlatformAdmin).toBe(false);
    expect(parseClaims({ sub: "pas-un-uuid" })).toBeNull();
    expect(parseClaims(null)).toBeNull();
  });

  it("CA2 : décodage d'un JWT (base64url, caractères accentués)", () => {
    const payload = { sub: U, org_role: "org_admin", org_id: O, name: "Lévis" };
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    expect(decodeJwtPayload(`h.${b64}.s`)).toEqual(payload);
    expect(decodeJwtPayload("invalide")).toBeNull();
  });
});

describe("CA2 — connexion par courriel", () => {
  beforeEach(() => {
    signInWithOtp.mockReset();
    verifyOtp.mockReset();
  });

  it("CA2 : envoi du lien magique + code, sans création de compte, retour sur /auth/confirm", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    const { sendLoginEmail } = await import("@/lib/auth/actions");
    const form = new FormData();
    form.set("email", " Agent@Exemple.CA ");
    const r = await sendLoginEmail({ step: "email", email: "", error: null }, form);
    expect(r).toEqual({ step: "code", email: "agent@exemple.ca", error: null });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "agent@exemple.ca",
      options: { shouldCreateUser: false, emailRedirectTo: "https://console.exemple.ca/auth/confirm" },
    });
  });

  it("CA2 : compte inexistant → même réponse (pas d'énumération des comptes)", async () => {
    signInWithOtp.mockResolvedValue({ error: { status: 422, message: "Signups not allowed" } });
    const { sendLoginEmail } = await import("@/lib/auth/actions");
    const form = new FormData();
    form.set("email", "inconnu@exemple.ca");
    expect((await sendLoginEmail({ step: "email", email: "", error: null }, form)).step).toBe("code");
  });

  it("CA2 : courriel invalide refusé sans appel à Supabase", async () => {
    const { sendLoginEmail } = await import("@/lib/auth/actions");
    const form = new FormData();
    form.set("email", "pas-un-courriel");
    expect((await sendLoginEmail({ step: "email", email: "", error: null }, form)).error).toBe("login.error.email");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("CA2 : code OTP valide → session ouverte puis redirection", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const { verifyLoginCode } = await import("@/lib/auth/actions");
    const form = new FormData();
    form.set("code", "123 456");
    await expect(verifyLoginCode({ step: "code", email: "a@b.ca", error: null }, form)).rejects.toThrow("REDIRECT /");
    expect(verifyOtp).toHaveBeenCalledWith({ email: "a@b.ca", token: "123456", type: "email" });
  });

  it("CA2 : code OTP invalide ou expiré → message d'erreur", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const { verifyLoginCode } = await import("@/lib/auth/actions");
    const form = new FormData();
    form.set("code", "000000");
    expect((await verifyLoginCode({ step: "code", email: "a@b.ca", error: null }, form)).error).toBe("login.error.code");
  });
});
