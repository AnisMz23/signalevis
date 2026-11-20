"use server";
// KAN-63 CA2 — Connexion par courriel : lien magique ou code à usage unique (OTP).
// Aucun compte n'est créé depuis la console (shouldCreateUser: false) : les membres sont invités
// par le super admin ou l'admin d'organisation (KAN-51, KAN-54).
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "./access";
import { supabaseServer } from "./server";

export type LoginState = { step: "email" | "code"; email: string; error: string | null };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendLoginEmail(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { step: "email", email, error: "login.error.email" };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${await origin()}/auth/confirm` },
  });
  // Même réponse que le compte existe ou non (pas d'énumération des comptes).
  if (error && error.status !== 400 && error.status !== 422) {
    return { step: "email", email, error: "login.error.send" };
  }
  return { step: "code", email, error: null };
}

export async function verifyLoginCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(token)) return { ...prev, error: "login.error.code" };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email: prev.email, token, type: "email" });
  if (error) return { ...prev, error: "login.error.code" };
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect(ROUTES.login);
}
