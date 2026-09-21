"use client";

import { useState } from "react";
import { ChipTabs } from "../../components/ChipTabs.tsx";
import { PlatformProtectedRoute } from "../../components/PlatformProtectedRoute.tsx";
import { InstitutionsTab } from "../../components/platform/InstitutionsTab.tsx";
import { PlansTab } from "../../components/platform/PlansTab.tsx";
import { AuditTab } from "../../components/platform/AuditTab.tsx";
import { useAuth } from "../../lib/auth.tsx";
import { Button } from "../../components/ui/button.tsx";

const TABS = [
  { id: "institutions", label: "Institusi", testId: "pc-tab-institutions" },
  { id: "plans", label: "Paket & Harga", testId: "pc-tab-plans" },
  { id: "audit", label: "Audit", testId: "pc-tab-audit" },
];

function PlatformConsoleView() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("institutions");

  return (
    <div className="min-h-screen bg-canvas text-primary">
      <header className="flex flex-wrap items-center justify-between gap-(--space-3) border-b border-line-subtle bg-surface px-(--space-4) py-(--space-3)">
        <div>
          <span className="text-(length:--font-size-label) text-secondary">
            /
          </span>{" "}
          <span className="font-semibold text-primary">
            Platform Admin Console
          </span>{" "}
          <span className="text-(length:--font-size-body-compact) text-secondary">
            Sentra Smartboard
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-(--space-3)">
          <StatusPill />
          <span className="text-(length:--font-size-body-compact) text-secondary">
            {user?.email}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void logout()}
          >
            Keluar
          </Button>
        </div>
      </header>

      <div className="border-b border-line-subtle px-(--space-4) py-(--space-3)">
        <ChipTabs
          options={TABS}
          value={tab}
          onChange={setTab}
          ariaLabel="Bagian konsol"
        />
      </div>

      <main className="px-(--space-4) py-(--space-5)">
        {tab === "institutions" ? <InstitutionsTab /> : null}
        {tab === "plans" ? <PlansTab /> : null}
        {tab === "audit" ? <AuditTab /> : null}
      </main>
    </div>
  );
}

function StatusPill() {
  return (
    <span className="rounded-control bg-surface px-(--space-2) py-(--space-1) text-(length:--font-size-label) font-medium uppercase tracking-(--letter-spacing-label) text-accent-text">
      PLATFORM ADMIN
    </span>
  );
}

export default function PlatformPage() {
  return (
    <PlatformProtectedRoute>
      <PlatformConsoleView />
    </PlatformProtectedRoute>
  );
}
