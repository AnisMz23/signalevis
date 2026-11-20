// KAN-63 CA3 — Navigation selon le rôle.
// Super admin → /platform/... ; admin d'organisation et dispatcher → /org/... ; tout autre profil
// (travailleur terrain, citoyen, jeton sans droits) → accès refusé. Décision de navigation seulement :
// l'API et la RLS refusent de toute façon les données hors rôle.
import type { Claims, OrgRole } from "./claims";

export const ROUTES = {
  login: "/connexion",
  denied: "/acces-refuse",
  platformHome: "/platform/organizations",
  orgHome: "/org",
} as const;

export const CONSOLE_ORG_ROLES: readonly OrgRole[] = ["org_admin", "dispatcher"];

export type Area = "public" | "platform" | "org" | "home";

const PUBLIC_PREFIXES = [ROUTES.login, ROUTES.denied, "/auth/"];

const startsWithSegment = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function areaOf(pathname: string): Area {
  if (PUBLIC_PREFIXES.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : startsWithSegment(pathname, p)))) {
    return "public";
  }
  if (startsWithSegment(pathname, "/platform")) return "platform";
  if (startsWithSegment(pathname, "/org")) return "org";
  return "home";
}

export const isConsoleOrgMember = (c: Pick<Claims, "orgRole">) =>
  c.orgRole !== null && CONSOLE_ORG_ROLES.includes(c.orgRole);

/** Page d'accueil du profil ; null = aucun espace de la console pour ce profil. */
export function homePath(c: Claims): string | null {
  if (c.isPlatformAdmin) return ROUTES.platformHome;
  if (isConsoleOrgMember(c)) return ROUTES.orgHome;
  return null;
}

export type Decision = { kind: "allow" } | { kind: "redirect"; to: string };

/** Paramètres d'un lien de connexion Supabase (PKCE ou gabarit token_hash). */
const AUTH_PARAMS = ["code", "token_hash"];

/**
 * Décision pour une requête : claims null = non connecté.
 * Un lien de connexion qui arrive ailleurs que sur /auth/confirm (ex. Supabase retombe sur le
 * « Site URL » quand l'adresse de retour n'est pas autorisée) est renvoyé vers /auth/confirm.
 */
export function decide(pathname: string, claims: Claims | null, search = ""): Decision {
  const params = new URLSearchParams(search);
  if (pathname !== "/auth/confirm" && AUTH_PARAMS.some((k) => params.has(k))) {
    return { kind: "redirect", to: `/auth/confirm?${params.toString()}` };
  }
  const area = areaOf(pathname);
  if (area === "public") return { kind: "allow" };
  if (!claims) return { kind: "redirect", to: ROUTES.login };
  if (area === "home") return { kind: "redirect", to: homePath(claims) ?? ROUTES.denied };
  if (area === "platform") return claims.isPlatformAdmin ? { kind: "allow" } : { kind: "redirect", to: ROUTES.denied };
  return isConsoleOrgMember(claims) ? { kind: "allow" } : { kind: "redirect", to: ROUTES.denied };
}
