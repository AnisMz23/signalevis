import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./globals.css";

import type { Metadata } from "next";

import { t } from "@/i18n";
import { colors } from "@/theme/tokens";

export const metadata: Metadata = {
  title: `${t("app.console")} — ${t("app.name")}`,
  robots: { index: false, follow: false },
};

// Variables CSS générées depuis les jetons : une seule source de vérité pour les couleurs.
const cssVars = `:root{${Object.entries(colors).map(([k, v]) => `--${k}:${v}`).join(";")}}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA">
      <head>
        <style>{cssVars}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
