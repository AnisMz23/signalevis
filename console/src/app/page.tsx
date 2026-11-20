// L'accueil redirige selon le rôle (décision prise par le proxy, src/lib/auth/access.ts).
import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/access";

export default function Home() {
  redirect(ROUTES.login);
}
