import { Shell } from "@/components/Shell";
import { t } from "@/i18n";
import { api } from "@/lib/api/client";
import { ROUTES } from "@/lib/auth/access";
import { requireArea } from "@/lib/auth/guard";
import { OrganizationsTable } from "./OrganizationsTable";

export default async function OrganizationsPage() {
  const guard = await requireArea("platform");
  const res = "unavailable" in guard ? null : await api.organizations(guard.token);
  return (
    <Shell area="platform" roleLabel="role.platform_admin" current={ROUTES.platformHome}>
      <h1>{t("orgs.title")}</h1>
      <p className="muted">{t("orgs.intro")}</p>
      {res?.ok ? (
        <OrganizationsTable organizations={res.data} />
      ) : (
        <p role="alert" className="error">{t("error.unavailable")}</p>
      )}
    </Shell>
  );
}
