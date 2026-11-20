import { t } from "@/i18n";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <div className="center">
      <main className="card" id="contenu">
        <h1>{t("login.title")}</h1>
        <p className="muted">{t("login.intro")}</p>
        <LoginForm linkError={erreur === "lien"} />
        <p className="muted">{t("login.invited")}</p>
      </main>
    </div>
  );
}
