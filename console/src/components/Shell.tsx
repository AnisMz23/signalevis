// KAN-63 CA3 — Gabarit de la console : menus selon le rôle.
import Link from "next/link";

import { t, type MessageKey } from "@/i18n";
import { signOut } from "@/lib/auth/actions";
import { ROUTES } from "@/lib/auth/access";

export type NavItem = { href: string; label: MessageKey };

export const NAV: Record<"platform" | "org", NavItem[]> = {
  platform: [{ href: ROUTES.platformHome, label: "nav.organizations" }],
  org: [{ href: ROUTES.orgHome, label: "nav.org.home" }],
};

type Props = {
  area: "platform" | "org";
  roleLabel: MessageKey;
  current: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
};

export function Shell({ area, roleLabel, current, banner, children }: Props) {
  return (
    <>
      <a href="#contenu" className="skip">{t("app.skip")}</a>
      {banner}
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">{t("app.name")}</div>
          <div className="role">{t(roleLabel)}</div>
          <nav aria-label={t("nav.label")}>
            <ul>
              {NAV[area].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={current === item.href ? "page" : undefined}>
                    {t(item.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form action={signOut}>
            <button type="submit">{t("nav.signout")}</button>
          </form>
        </aside>
        <main id="contenu">{children}</main>
      </div>
    </>
  );
}
