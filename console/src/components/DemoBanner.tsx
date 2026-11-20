// KAN-63 CA5 — Bandeau « Démonstration » pour toute organisation au statut demo (ADR-002, KAN-46).
import { t } from "@/i18n";
import type { OrgStatus } from "@/lib/api/client";

export function DemoBanner({ status }: { status: OrgStatus | null | undefined }) {
  if (status !== "demo") return null;
  return (
    <div role="status" className="banner" data-testid="demo-banner">
      {t("demo.banner")}
    </div>
  );
}

export function StatusPill({ status }: { status: OrgStatus }) {
  return <span className={`pill pill-${status}`}>{t(`status.${status}`)}</span>;
}
