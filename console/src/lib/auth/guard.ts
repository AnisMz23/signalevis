// KAN-63 CA3 — Contrôle d'accès des pages, confirmé en base (GET /v1/me, ADR-003 D3).
// Le proxy filtre déjà selon le JWT ; ici on revérifie avec les droits réellement en base
// (ex. membre désactivé ou organisation suspendue depuis l'émission du jeton).
import "server-only";
import { redirect } from "next/navigation";

import { api, type Me } from "@/lib/api/client";
import { CONSOLE_ORG_ROLES, ROUTES } from "./access";
import { getSession } from "./server";

export type Guarded = { token: string; me: Me };

export async function requireArea(area: "platform" | "org"): Promise<Guarded | { unavailable: true }> {
  const session = await getSession();
  if (!session) redirect(ROUTES.login);
  const res = await api.me(session.accessToken);
  if (!res.ok) {
    if (res.status === 401) redirect(ROUTES.login);
    return { unavailable: true };
  }
  const me = res.data;
  const allowed =
    area === "platform" ? me.isPlatformAdmin : me.orgRole !== null && CONSOLE_ORG_ROLES.includes(me.orgRole);
  if (!allowed) redirect(ROUTES.denied);
  return { token: session.accessToken, me };
}
