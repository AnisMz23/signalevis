import { DemoBanner } from "@/components/DemoBanner";
import { Shell } from "@/components/Shell";
import { t } from "@/i18n";
import { ROUTES } from "@/lib/auth/access";
import { requireArea } from "@/lib/auth/guard";

export default async function OrgHomePage() {
  const guard = await requireArea("org");
  if ("unavailable" in guard) {
    return (
      <div className="center">
        <main className="card" id="contenu"><p role="alert" className="error">{t("error.unavailable")}</p></main>
      </div>
    );
  }
  const { me } = guard;
  const role = me.orgRole === "org_admin" ? "role.org_admin" : "role.dispatcher";
  return (
    <Shell area="org" roleLabel={role} current={ROUTES.orgHome} banner={<DemoBanner status={me.organization?.status} />}>
      <h1>{me.organization?.name ?? t("org.home.title")}</h1>
      <p>{t("org.home.role", { role: t(role) })}</p>
      <p className="muted">{t("org.home.next")}</p>
    </Shell>
  );
}
