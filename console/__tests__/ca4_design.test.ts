// KAN-63 CA4 — Système visuel des maquettes, contrastes WCAG 2.1 AA, cibles ≥ 44 px, libellés FR.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import fr from "@/i18n/fr.json";
import { t } from "@/i18n";
import { colors, contrastRatio, MIN_TARGET_PX, textPairs } from "@/theme/tokens";

const root = join(__dirname, "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe("CA4 — système visuel", () => {
  it("CA4 : jetons des maquettes (vert sapin, sable, texte secondaire, terracotta)", () => {
    expect(colors.sapin).toBe("#1F4D3A");
    expect(colors.sable).toBe("#FBF7F0");
    expect(colors.textMuted).toBe("#4F5F57");
    expect(colors.alertText).toBe("#8A3414");
    expect(colors.alertBg).toBe("#FBE3D8");
  });

  it.each(textPairs)("CA4 : contraste %s sur %s ≥ 4,5:1", (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it("CA4 : le terracotta décoratif n'est jamais utilisé comme couleur de texte", () => {
    expect(textPairs.some(([fg]) => fg === "terracotta")).toBe(false);
    expect(css).not.toMatch(/(^|[^-])color:\s*var\(--terracotta\)/m);
  });

  it("CA4 : police Nunito", () => {
    expect(css).toMatch(/font-family:\s*"Nunito"/);
    expect(readFileSync(join(root, "src/app/layout.tsx"), "utf8")).toContain("@fontsource/nunito");
  });

  it("CA4 : cibles interactives ≥ 44 px (boutons, champs, liens de navigation)", () => {
    expect(MIN_TARGET_PX).toBe(44);
    for (const selector of [".btn {", "input {", ".sidebar a, .sidebar button {"]) {
      const block = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)));
      expect(block, selector).toMatch(/min-height:\s*44px/);
    }
  });

  it("CA4 : focus clavier visible", () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px/);
  });
});

describe("CA4 — libellés FR via fichier de traduction", () => {
  it("CA4 : langue de la page fr-CA", () => {
    expect(readFileSync(join(root, "src/app/layout.tsx"), "utf8")).toContain('lang="fr-CA"');
  });

  it("CA4 : aucun texte en dur dans les composants (JSX)", () => {
    const files = walk(join(root, "src")).filter((f) => f.endsWith(".tsx"));
    const offenders = files.flatMap((f) => {
      const src = readFileSync(f, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      // Texte littéral entre balises : >Mot ... <
      return [...src.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}]*?)\s*</g)].map((m) => `${f}: ${m[1]}`);
    });
    expect(offenders).toEqual([]);
  });

  it("CA4 : toutes les clés t() utilisées existent dans fr.json", () => {
    const keys = new Set(Object.keys(fr));
    const used = walk(join(root, "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .flatMap((f) => [...readFileSync(f, "utf8").matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1]));
    expect(used.length).toBeGreaterThan(10);
    expect(used.filter((k) => !keys.has(k))).toEqual([]);
  });

  it("CA4 : interpolation des variables", () => {
    expect(t("org.home.role", { role: "Répartiteur" })).toBe("Votre rôle : Répartiteur.");
  });

  it("CA4 : libellés en français, sans anglais résiduel de gabarit", () => {
    const all = Object.values(fr).join(" ");
    expect(all).not.toMatch(/\b(Sign in|Sign out|Loading|Error|Create Next App)\b/);
  });
});
