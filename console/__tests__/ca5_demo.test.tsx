// KAN-63 CA5 — Bandeau « Démonstration » pour toute organisation demo (ADR-002, KAN-46).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OrganizationsTable } from "@/app/platform/organizations/OrganizationsTable";
import { DemoBanner } from "@/components/DemoBanner";
import type { OrganizationSummary } from "@/lib/api/client";

afterEach(cleanup);

const org = (over: Partial<OrganizationSummary>): OrganizationSummary => ({
  id: crypto.randomUUID(), name: "Org fictive — démo", slug: "org-fictive", status: "demo", domains: ["voirie"],
  activeMembers: 2, pendingInvitations: 1, reports30d: null, createdAt: "2026-11-16T00:00:00Z", ...over,
});

describe("CA5 — bandeau Démonstration", () => {
  it("CA5 : affiché pour une organisation demo, annoncé aux lecteurs d'écran", () => {
    render(<DemoBanner status="demo" />);
    const banner = screen.getByRole("status");
    expect(banner.textContent).toMatch(/^Démonstration/);
    expect(banner.textContent).toMatch(/Aucune autorité n'est partenaire/);
  });

  it.each(["active", "suspended", null, undefined] as const)("CA5 : absent pour le statut %s", (status) => {
    render(<DemoBanner status={status} />);
    expect(screen.queryByTestId("demo-banner")).toBeNull();
  });

  it("CA5 : badge Démonstration dans la liste super admin, sans logo d'autorité", () => {
    const { container } = render(
      <OrganizationsTable organizations={[org({ name: "A — démo" }), org({ name: "B", status: "active", reports30d: 1234 })]} />,
    );
    expect(screen.getAllByText("Démonstration")).toHaveLength(1);
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy(); // reports_30d null
    expect(screen.getByText(/1\s234/)).toBeTruthy(); // format fr-CA
    expect(container.querySelector("img")).toBeNull();
  });

  it("CA5 : liste vide", () => {
    render(<OrganizationsTable organizations={[]} />);
    expect(screen.getByText("Aucune organisation.")).toBeTruthy();
  });
});
