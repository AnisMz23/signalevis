// Module interne « auth » (ADR-001) — seul point d'accès de la console au SDK Supabase Auth.
// Session portée par des cookies HTTP, lue côté serveur via @supabase/ssr (KAN-63 CA1).
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { parseClaims, type Claims } from "./claims";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : le proxy rafraîchit déjà la session.
        }
      },
    },
  });
}

export type Session = { accessToken: string; claims: Claims };

/** Session vérifiée (getClaims valide la signature du JWT) ; null si non connecté. */
export async function getSession(): Promise<Session | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return null;
  const claims = parseClaims(data.claims);
  return claims ? { accessToken: token, claims } : null;
}
