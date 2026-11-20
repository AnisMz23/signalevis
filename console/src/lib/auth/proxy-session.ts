// Module « auth » — rafraîchissement de la session dans le proxy Next.js (KAN-63 CA1, CA3).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { decide } from "./access";
import { parseClaims } from "./claims";

export async function handleRequest(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabaseUrl(), env.supabaseKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() vérifie le JWT et rafraîchit la session si nécessaire.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ? parseClaims(data.claims) : null;

  const decision = decide(request.nextUrl.pathname, claims);
  if (decision.kind === "allow") return response;

  const redirect = NextResponse.redirect(new URL(decision.to, request.url));
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
