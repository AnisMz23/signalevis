"use client";
// KAN-63 CA2 — Formulaire de connexion : courriel → lien magique + code à usage unique.
import { useActionState, useState } from "react";

import { isMessageKey, t } from "@/i18n";
import { sendLoginEmail, verifyLoginCode, type LoginState } from "@/lib/auth/actions";

const initial: LoginState = { step: "email", email: "", error: null };
const message = (key: string | null) => (key && isMessageKey(key) ? t(key) : null);

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [attempt, setAttempt] = useState(0);
  return <EmailStep key={attempt} linkError={linkError && attempt === 0} onRestart={() => setAttempt((n) => n + 1)} />;
}

function EmailStep({ linkError, onRestart }: { linkError: boolean; onRestart: () => void }) {
  const [state, send, pending] = useActionState(sendLoginEmail, initial);
  if (state.step === "code") return <CodeStep sent={state} onRestart={onRestart} />;
  const error = message(state.error) ?? (linkError ? t("login.error.link") : null);
  return (
    <form action={send} noValidate>
      {error && <p role="alert" className="error">{error}</p>}
      <label htmlFor="email">{t("login.email")}</label>
      <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      <button className="btn btn-primary" type="submit" disabled={pending}>{t("login.send")}</button>
    </form>
  );
}

function CodeStep({ sent, onRestart }: { sent: LoginState; onRestart: () => void }) {
  const [state, verify, pending] = useActionState(verifyLoginCode, sent);
  const error = message(state.error);
  return (
    <form action={verify} noValidate>
      <p role="status">{t("login.sent", { email: sent.email })}</p>
      {error && <p role="alert" className="error">{error}</p>}
      <label htmlFor="code">{t("login.code")}</label>
      <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
      <button className="btn btn-primary" type="submit" disabled={pending}>{t("login.verify")}</button>
      <p>
        <button type="button" className="btn btn-link" onClick={onRestart}>{t("login.other")}</button>
      </p>
    </form>
  );
}
