import type { NextRequest } from "next/server";

import { handleRequest } from "@/lib/auth/proxy-session";

export function proxy(request: NextRequest) {
  return handleRequest(request);
}

export const config = {
  // Tout sauf les fichiers statiques.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};
