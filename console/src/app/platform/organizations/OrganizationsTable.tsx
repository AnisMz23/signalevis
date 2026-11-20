// KAN-63 — Premier écran super admin : liste des organisations (agrégats seulement, KAN-51 CA3).
import { StatusPill } from "@/components/DemoBanner";
import { t } from "@/i18n";
import type { OrganizationSummary } from "@/lib/api/client";

export function OrganizationsTable({ organizations }: { organizations: OrganizationSummary[] }) {
  if (organizations.length === 0) return <p>{t("orgs.empty")}</p>;
  const nf = new Intl.NumberFormat("fr-CA");
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">{t("orgs.col.name")}</th>
            <th scope="col">{t("orgs.col.status")}</th>
            <th scope="col">{t("orgs.col.domains")}</th>
            <th scope="col" className="num">{t("orgs.col.members")}</th>
            <th scope="col" className="num">{t("orgs.col.invitations")}</th>
            <th scope="col" className="num">{t("orgs.col.reports")}</th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((o) => (
            <tr key={o.id}>
              <th scope="row">{o.name}</th>
              <td><StatusPill status={o.status} /></td>
              <td>{o.domains.join(", ")}</td>
              <td className="num">{nf.format(o.activeMembers)}</td>
              <td className="num">{nf.format(o.pendingInvitations)}</td>
              <td className="num">{o.reports30d === null ? t("orgs.reports.na") : nf.format(o.reports30d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
