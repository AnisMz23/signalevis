// API publique Signalement Lévis — version 1 (KAN-42 CA2).
// Contrat : docs/api/openapi.yaml. Fonction mince (ADR-001) : routage HTTP + appel SQL,
// aucune logique métier ici. Les droits sont vérifiés EN BASE (RLS + fonctions SQL, ADR-003).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

const API_VERSION = "0.3.0";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

// Chemin reçu : /v1/<route> (ou /functions/v1/v1/<route> selon l'appelant).
const routeOf = (url: string) =>
  new URL(url).pathname.replace(/^\/functions\/v1/, "").replace(/^\/v1/, "") || "/";

// Client serveur (service_role) : uniquement pour les opérations sans utilisateur
// (catalogue public, santé) ou réservées au serveur (envoi des courriels d'invitation).
const serviceClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Client « au nom de l'appelant » : son JWT est transmis, la RLS et les contrôles SQL s'appliquent.
const userClient = (req: Request): SupabaseClient | null => {
  const auth = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
};

// Erreurs PostgreSQL → statuts HTTP (messages SQL en français, sans détail interne).
const fromDbError = (error: { code?: string; message?: string }) => {
  switch (error.code) {
    case "42501": return json(403, { error: "forbidden" });
    case "23505": return json(409, { error: "conflict", message: error.message });
    case "23514": return json(422, { error: "invalid", message: error.message });
    case "P0002": return json(404, { error: "not_found", message: error.message });
    case "22P02": return json(400, { error: "invalid_input" });
    case "PGRST301": case "PGRST302": return json(401, { error: "unauthorized" });
    default: return json(503, { error: "unavailable" });
  }
};

const readJson = async (req: Request): Promise<Record<string, unknown> | null> => {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
};

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

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
  if (lat === null || lng === null) return json(400, { error: "invalid_coordinates" });
  const { data, error } = await serviceClient().rpc("available_services", { p_lat: lat, p_lng: lng });
  if (error || !data) return json(503, { error: "unavailable" });
  return json(200, data);
}

async function health(): Promise<Response> {
  const { data, error } = await serviceClient().rpc("health_check");
  if (error || !data) return json(503, { status: "degraded", version: API_VERSION });
  return json(200, { status: "ok", version: API_VERSION, postgres: data.postgres, postgis: data.postgis });
}

// KAN-51 — routes super admin. Droits vérifiés en base (private.require_platform_admin()).
async function platform(req: Request, route: string): Promise<Response> {
  const db = userClient(req);
  if (!db) return json(401, { error: "unauthorized" });

  // GET /platform/organizations — liste agrégée (CA3)
  if (route === "/platform/organizations" && req.method === "GET") {
    const { data, error } = await db.rpc("list_organizations");
    return error ? fromDbError(error) : json(200, { organizations: data });
  }

  // POST /platform/organizations — création (CA1)
  if (route === "/platform/organizations" && req.method === "POST") {
    const b = await readJson(req);
    if (!b || typeof b.name !== "string" || typeof b.slug !== "string" || !Array.isArray(b.domains)) {
      return json(400, { error: "invalid_input" });
    }
    const { data, error } = await db.rpc("create_organization", {
      p_name: b.name, p_slug: b.slug, p_domains: b.domains,
      p_status: typeof b.status === "string" ? b.status : "demo",
      p_contact_email: typeof b.contact_email === "string" ? b.contact_email : null,
      p_contact_phone: typeof b.contact_phone === "string" ? b.contact_phone : null,
      p_agreement_ref: typeof b.agreement_ref === "string" ? b.agreement_ref : null,
    });
    return error ? fromDbError(error) : json(201, { id: data });
  }

  const m = route.match(/^\/platform\/organizations\/([^/]+)\/(status|invitations)$/);
  if (!m || req.method !== "POST") {
    return m ? json(405, { error: "method_not_allowed" }) : json(404, { error: "not_found" });
  }
  const [, orgId, action] = m;
  if (!isUuid(orgId)) return json(400, { error: "invalid_input" });
  const b = await readJson(req);

  // POST /platform/organizations/{id}/status — suspension, réactivation, passage en active (CA4)
  if (action === "status") {
    if (!b || typeof b.status !== "string") return json(400, { error: "invalid_input" });
    const { error } = await db.rpc("set_organization_status", {
      p_org: orgId, p_status: b.status,
      p_agreement_ref: typeof b.agreement_ref === "string" ? b.agreement_ref : null,
    });
    return error ? fromDbError(error) : json(200, { id: orgId, status: b.status });
  }

  // POST /platform/organizations/{id}/invitations — invitation ou renvoi du 1er admin (CA2)
  if (!b || typeof b.email !== "string") return json(400, { error: "invalid_input" });
  const { data: inv, error } = await db.rpc("create_invitation", { p_org: orgId, p_email: b.email });
  if (error) return fromDbError(error);

  const admin = serviceClient();
  let sendError: { message?: string } | null = null;
  if (!inv.resend) {
    const r = await admin.auth.admin.inviteUserByEmail(inv.email);
    sendError = r.error;
  }
  if (inv.resend || (sendError && /already|registered|exists/i.test(sendError.message ?? ""))) {
    // Compte existant (renvoi) : lien de connexion à usage unique, sans création de compte.
    const r = await admin.auth.signInWithOtp({ email: inv.email, options: { shouldCreateUser: false } });
    sendError = r.error;
  }
  if (sendError) return json(502, { error: "email_failed", invitation_id: inv.invitation_id });

  const { error: linkError } = await admin.rpc("link_invitation", { p_invitation: inv.invitation_id });
  if (linkError) return fromDbError(linkError);

  return json(inv.resend ? 200 : 201, {
    invitation_id: inv.invitation_id, email: inv.email, expires_at: inv.expires_at, resent: inv.resend,
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

  if (route.startsWith("/platform/")) return await platform(req, route);

  return json(404, { error: "not_found" });
});
