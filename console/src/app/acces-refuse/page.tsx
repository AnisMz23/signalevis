import { t } from "@/i18n";
import { signOut } from "@/lib/auth/actions";

export default function DeniedPage() {
  return (
    <div className="center">
      <main className="card" id="contenu">
        <h1>{t("denied.title")}</h1>
        <p>{t("denied.body")}</p>
        <form action={signOut}>
          <button className="btn btn-primary" type="submit">{t("nav.signout")}</button>
        </form>
      </main>
    </div>
  );
}
