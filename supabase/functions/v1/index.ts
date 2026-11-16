// API publique Signalement Lévis — version 1 (KAN-42 CA2).
// Contrat : docs/api/openapi.yaml. Fonction mince (ADR-001) : routage HTTP + appel SQL,
// aucune logique métier ici.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const API_VERSION = "0.2.0";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

// Chemin reçu : /v1/<route> (ou /functions/v1/v1/<route> selon l'appelant).
const routeOf = (url: string) =>
  new URL(url).pathname.replace(/^\/functions\/v1/, "").replace(/^\/v1/, "") || "/";

const db = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

// Coordonnées : nombres décimaux finis, dans les bornes WGS 84.
const coordinate = (raw: string | null, max: number): number | null => {
  if (raw === null || !/^-?\d+(\.\d+)?$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isFinite(value) && Math.abs(value) <= max ? value : null;
};

// KAN-52 CA4 — catalogue citoyen filtré par position (logique dans available_services()).
async function services(url: URL): Promise<Response> {
  const lat = coordinate(url.searchParams.get("lat"), 90);
  const lng = coordinate(url.searchParams.get("lng"), 180);
  if (lat === null || lng === null) {
    return json(400, { error: "invalid_coordinates" });
  }
  const { data, error } = await db().rpc("available_services", { p_lat: lat, p_lng: lng });
  if (error || !data) return json(503, { error: "unavailable" });
  return json(200, data);
}

async function health(): Promise<Response> {
  const { data, error } = await db().rpc("health_check");
  if (error || !data) {
    return json(503, { status: "degraded", version: API_VERSION });
  }
  return json(200, {
    status: "ok",
    version: API_VERSION,
    postgres: data.postgres,
    postgis: data.postgis,
  });
}

Deno.serve(async (req: Request) => {
  const route = routeOf(req.url);

  if (route === "/health") {
    if (req.method !== "GET") return json(405, { error: "method_not_allowed" });
    return await health();
  }

  if (route === "/services") {
    if (req.method !== "GET") return json(405, { error: "method_not_allowed" });
    return await services(new URL(req.url));
  }

  return json(404, { error: "not_found" });
});
