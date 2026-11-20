// KAN-63 CA1 — Next.js App Router, TypeScript strict, session Supabase côté serveur (@supabase/ssr).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe("CA1 — socle Next.js", () => {
  it("CA1 : TypeScript strict et App Router (src/app)", () => {
    expect(JSON.parse(read("tsconfig.json")).compilerOptions.strict).toBe(true);
    expect(statSync(join(root, "src/app/layout.tsx")).isFile()).toBe(true);
    expect(JSON.parse(read("package.json")).dependencies.next).toMatch(/^16\./);
  });

  it("CA1 : session portée par cookies côté serveur via @supabase/ssr (getAll / setAll)", () => {
    for (const f of ["src/lib/auth/server.ts", "src/lib/auth/proxy-session.ts"]) {
      const src = read(f);
      expect(src).toContain('from "@supabase/ssr"');
      expect(src).toContain("createServerClient");
      expect(src).toMatch(/getAll:/);
      expect(src).toMatch(/setAll:/);
    }
    expect(read("src/lib/auth/server.ts")).toContain('import "server-only"');
    expect(read("src/proxy.ts")).toMatch(/export function proxy/);
  });

  it("CA1 : le SDK Supabase n'est utilisé que dans le module auth (ADR-001)", () => {
    const offenders = walk(join(root, "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes(join("src", "lib", "auth")) && !f.includes(join("app", "auth", "confirm")))
      .filter((f) => /@supabase\//.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("CA1 : aucune requête PostgREST directe — données via l'API /v1", () => {
    const src = walk(join(root, "src")).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(src).not.toMatch(/\.from\(\s*["']/);
    expect(src).not.toMatch(/\/rest\/v1/);
  });
});
