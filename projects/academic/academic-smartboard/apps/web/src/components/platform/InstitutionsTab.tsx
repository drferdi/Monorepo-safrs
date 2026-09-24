"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  assignPlatformTenantPlan,
  createPlatformTenant,
  getPlatformSummary,
  getPlatformTenantMetrics,
  invitePlatformOwner,
  listPlatformAudit,
  listPlatformPlans,
  listPlatformTenants,
  type PlatformTenant,
  patchPlatformTenant,
  patchPlatformTenantStatus,
} from "../../lib/api.ts";
import { downloadCsv, stamp, toCsv } from "../../lib/csv.ts";
import { fmtDate } from "../../lib/labels.ts";
import {
  auditLabel,
  fmtRupiah,
  INTERVAL_LABEL,
  QUOTA_LABEL,
} from "../../lib/platform/pricing.ts";
import { StatusBadge } from "../StatusBadge.tsx";
import { Button } from "../ui/button.tsx";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Aktif",
  suspended: "Ditangguhkan",
  archived: "Diarsipkan",
};

const ACTIONS_BY_STATUS: Record<
  string,
  Array<{ to: string; label: string; kind: "primary" | "danger" | "ghost" }>
> = {
  draft: [
    { to: "active", label: "Aktifkan", kind: "primary" },
    { to: "archived", label: "Arsipkan", kind: "ghost" },
  ],
  active: [
    { to: "suspended", label: "Tangguhkan", kind: "danger" },
    { to: "archived", label: "Arsipkan", kind: "ghost" },
  ],
  suspended: [
    { to: "active", label: "Aktifkan kembali", kind: "primary" },
    { to: "archived", label: "Arsipkan", kind: "ghost" },
  ],
  archived: [],
};

function accentStyle(
  accent?: string,
): { borderColor?: string; color?: string } | undefined {
  if (accent && accent.startsWith("var(")) {
    return { borderColor: accent, color: accent };
  }
  return undefined;
}

function LogoMark({ tenant }: { tenant: PlatformTenant }) {
  const logo = tenant.branding?.logo_url;
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="h-8 w-8 rounded-control object-cover"
        src={logo}
        alt=""
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  const initial = (tenant.branding?.display_name || tenant.name || "?")
    .slice(0, 1)
    .toUpperCase();
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-line-subtle text-(length:--font-size-body) font-semibold text-primary"
      style={accentStyle(tenant.branding?.accent)}
    >
      {initial}
    </span>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function InstitutionsTab() {
  const qc = useQueryClient();
  const tenantsQ = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: listPlatformTenants,
  });
  const summaryQ = useQuery({
    queryKey: ["platform", "summary"],
    queryFn: getPlatformSummary,
  });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<PlatformTenant | null>(null);
  const [confirm, setConfirm] = useState<{
    tenant: PlatformTenant;
    to: string;
    label: string;
  } | null>(null);

  const tenants = tenantsQ.data ?? [];
  const summary = summaryQ.data;

  const kpis = useMemo(() => {
    const by = (s: string) => tenants.filter((t) => t.status === s).length;
    return {
      total: tenants.length,
      active: by("active"),
      draft: by("draft"),
      suspended: by("suspended"),
    };
  }, [tenants]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (t.name || "").toLowerCase().includes(q) ||
        (t.slug || "").toLowerCase().includes(q) ||
        (t.primary_contact?.email || "").toLowerCase().includes(q)
      );
    });
  }, [tenants, query, statusFilter]);

  const exportCsv = () => {
    downloadCsv(
      `institusi-${stamp()}.csv`,
      toCsv(
        [
          { label: "Nama", get: (t) => t.name },
          { label: "Slug", get: (t) => t.slug },
          {
            label: "Status",
            get: (t) => STATUS_LABEL[t.status] || t.status,
          },
          { label: "Paket", get: (t) => t.subscription?.plan_name || "" },
          {
            label: "Harga",
            get: (t) => t.subscription?.price_amount ?? "",
          },
          {
            label: "Kontak",
            get: (t) => t.primary_contact?.email || "",
          },
          { label: "Dibuat", get: (t) => t.created_at || "" },
        ],
        visible,
      ),
    );
  };

  const doTransition = async (
    tenant: PlatformTenant,
    to: string,
    reason?: string,
  ) => {
    try {
      const data = await patchPlatformTenantStatus(tenant.tenant_id, {
        status: to,
        ...(reason ? { reason } : {}),
      });
      toast.success(
        `${data.name}: status → ${STATUS_LABEL[data.status] || data.status}`,
      );
      setConfirm(null);
      setDetail((d) => (d && d.tenant_id === data.tenant_id ? data : d));
      void qc.invalidateQueries({ queryKey: ["platform"] });
    } catch (e: unknown) {
      const detailMsg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detailMsg || "Gagal mengubah status");
    }
  };

  const revenue = summary?.revenue as
    | {
        mrr?: number;
        arr?: number;
        paying_tenants?: number;
        arpa?: number;
      }
    | undefined;

  return (
    <>
      <div className="mb-(--space-5) flex flex-wrap items-start justify-between gap-(--space-4)">
        <div>
          <p className="text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
            <span className="mr-(--space-2) font-semibold text-accent-text">
              HQ
            </span>
            Markas Platform
          </p>
          <h1 className="text-(length:--font-size-title-page) font-bold text-primary">
            Institusi
          </h1>
          <p className="mt-(--space-2) max-w-prose text-(length:--font-size-body) text-secondary">
            Kelola bimbel yang memakai Smartboard: buat institusi, aktifkan,
            tangguhkan, dan atur pemilik pertamanya.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreate(true)}
          data-testid="pc-create"
        >
          Buat Institusi
        </Button>
      </div>

      <div className="mb-(--space-4) grid gap-(--space-3) sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["kpi-total", "Total Institusi", kpis.total],
            ["kpi-active", "Aktif", kpis.active],
            ["kpi-draft", "Draft", kpis.draft],
            ["kpi-suspended", "Ditangguhkan", kpis.suspended],
          ] as const
        ).map(([id, label, value]) => (
          <div
            key={id}
            className="rounded-control border border-line-subtle bg-surface p-(--space-3)"
          >
            <div className="text-(length:--font-size-label) text-secondary">
              {label}
            </div>
            <div
              className="text-(length:--font-size-title-section) font-bold text-primary"
              data-testid={id}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {revenue ? (
        <div className="mb-(--space-4) grid gap-(--space-3) sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-control border border-line-subtle bg-surface p-(--space-3)">
            <div className="text-(length:--font-size-label) text-secondary">
              MRR
            </div>
            <div
              className="text-(length:--font-size-title-section) font-bold text-primary"
              data-testid="kpi-mrr"
            >
              {fmtRupiah(revenue.mrr)}
            </div>
          </div>
          <div className="rounded-control border border-line-subtle bg-surface p-(--space-3)">
            <div className="text-(length:--font-size-label) text-secondary">
              ARR
            </div>
            <div data-testid="kpi-arr" className="font-bold text-primary">
              {fmtRupiah(revenue.arr)}
            </div>
          </div>
          <div className="rounded-control border border-line-subtle bg-surface p-(--space-3)">
            <div className="text-(length:--font-size-label) text-secondary">
              Institusi Berbayar
            </div>
            <div data-testid="kpi-paying" className="font-bold text-primary">
              {revenue.paying_tenants}
            </div>
          </div>
          <div className="rounded-control border border-line-subtle bg-surface p-(--space-3)">
            <div className="text-(length:--font-size-label) text-secondary">
              ARPA
            </div>
            <div data-testid="kpi-arpa" className="font-bold text-primary">
              {fmtRupiah(revenue.arpa)}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-(--space-4) flex flex-wrap gap-(--space-2)">
        <input
          className="min-h-(--target-min) min-w-[12rem] flex-1 rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          placeholder="Cari nama, slug, atau email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="pc-search"
        />
        <select
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="pc-filter"
        >
          <option value="all">Semua status</option>
          <option value="draft">Draft</option>
          <option value="active">Aktif</option>
          <option value="suspended">Ditangguhkan</option>
          <option value="archived">Diarsipkan</option>
        </select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={exportCsv}
          disabled={!visible.length}
          data-testid="pc-export"
        >
          Ekspor CSV
        </Button>
      </div>

      {tenantsQ.isError ? (
        <div
          className="mb-(--space-4) rounded-control border border-line-subtle p-(--space-3)"
          role="alert"
        >
          <p className="text-critical">Gagal memuat daftar institusi</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="w-full min-w-[48rem] text-left text-(length:--font-size-body)">
          <thead className="border-b border-line-subtle bg-surface text-secondary">
            <tr>
              <th className="px-(--space-3) py-(--space-2)">Institusi</th>
              <th className="px-(--space-3) py-(--space-2)">Slug</th>
              <th className="px-(--space-3) py-(--space-2)">Status</th>
              <th className="px-(--space-3) py-(--space-2)">Paket</th>
              <th className="px-(--space-3) py-(--space-2)">Kontak Utama</th>
              <th className="px-(--space-3) py-(--space-2)">Dibuat</th>
              <th className="px-(--space-3) py-(--space-2)">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tenantsQ.isPending ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-(--space-3) py-(--space-4) text-secondary"
                >
                  Memuat…
                </td>
              </tr>
            ) : null}
            {!tenantsQ.isPending && tenants.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-(--space-3) py-(--space-4) text-secondary"
                >
                  Belum ada institusi. Klik “Buat Institusi”.
                </td>
              </tr>
            ) : null}
            {!tenantsQ.isPending &&
            tenants.length > 0 &&
            visible.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-(--space-3) py-(--space-4) text-secondary"
                >
                  Tidak ada institusi yang cocok dengan filter.
                </td>
              </tr>
            ) : null}
            {visible.map((t) => (
              <tr
                key={t.tenant_id}
                data-testid={`pc-row-${t.slug}`}
                className="border-t border-line-subtle text-primary"
              >
                <td className="px-(--space-3) py-(--space-2)">
                  <div className="flex items-center gap-(--space-2)">
                    <LogoMark tenant={t} />
                    <span className="font-semibold">
                      {t.branding?.display_name || t.name}
                    </span>
                  </div>
                </td>
                <td className="px-(--space-3) py-(--space-2) tabular-nums">
                  {t.slug}
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  <StatusBadge
                    tone={
                      t.status === "active"
                        ? "success"
                        : t.status === "suspended"
                          ? "critical"
                          : t.status === "draft"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {STATUS_LABEL[t.status] || t.status}
                  </StatusBadge>
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  {t.subscription?.plan_name ? (
                    <StatusBadge tone="info">
                      {t.subscription.plan_name}
                    </StatusBadge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  {t.primary_contact?.email || "—"}
                </td>
                <td className="px-(--space-3) py-(--space-2) tabular-nums">
                  {t.created_at ? fmtDate(t.created_at) : "—"}
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  <div className="flex flex-wrap gap-(--space-2)">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetail(t)}
                      data-testid={`pc-detail-${t.slug}`}
                    >
                      Detail
                    </Button>
                    {(ACTIONS_BY_STATUS[t.status] || []).map((a) => (
                      <Button
                        key={a.to}
                        type="button"
                        size="sm"
                        variant={
                          a.kind === "ghost"
                            ? "ghost"
                            : a.kind === "danger"
                              ? "outline"
                              : "default"
                        }
                        className={
                          a.kind === "danger" ? "text-critical" : undefined
                        }
                        onClick={() =>
                          setConfirm({ tenant: t, to: a.to, label: a.label })
                        }
                        data-testid={`pc-${a.to}-${t.slug}`}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate ? (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void qc.invalidateQueries({ queryKey: ["platform"] });
          }}
        />
      ) : null}
      {detail ? (
        <DetailModal
          tenant={detail}
          onClose={() => setDetail(null)}
          onChanged={() =>
            void qc.invalidateQueries({ queryKey: ["platform"] })
          }
        />
      ) : null}
      {confirm ? (
        <ConfirmModal
          confirm={confirm}
          onClose={() => setConfirm(null)}
          onConfirm={doTransition}
        />
      ) : null}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-(--z-drawer) flex items-center justify-center bg-overlay/40 p-(--space-4)"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-control border border-line-subtle bg-canvas shadow-overlay"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-subtle px-(--space-4) py-(--space-3)">
          <h2 className="text-(length:--font-size-title-section) font-bold text-primary">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Tutup"
          >
            ✕
          </Button>
        </div>
        <div className="p-(--space-4)">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-(--space-2) border-t border-line-subtle px-(--space-4) py-(--space-3)">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [accent, setAccent] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const effectiveSlug = slugTouched ? slug : slugify(name);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Nama institusi wajib diisi");
      return;
    }
    if (!/^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(effectiveSlug)) {
      toast.error("Slug tidak valid");
      return;
    }
    setBusy(true);
    try {
      const branding: Record<string, string> = {};
      if (displayName.trim()) branding.display_name = displayName.trim();
      if (accent.trim().startsWith("var(")) branding.accent = accent.trim();
      const body: Record<string, unknown> = {
        name: name.trim(),
        slug: effectiveSlug,
      };
      if (Object.keys(branding).length) body.branding = branding;
      if (ownerName.trim()) body.owner_name = ownerName.trim();
      if (ownerEmail.trim()) body.owner_email = ownerEmail.trim();
      const data = await createPlatformTenant(body);
      toast.success(`Institusi "${data.name}" dibuat sebagai Draft`);
      onCreated();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      toast.error(detail || "Gagal membuat institusi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Buat Institusi"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="pc-create-form"
            disabled={busy}
            data-testid="pc-create-submit"
          >
            {busy ? "Menyimpan…" : "Buat sebagai Draft"}
          </Button>
        </>
      }
    >
      <form
        id="pc-create-form"
        onSubmit={(e) => void submit(e)}
        className="flex flex-col gap-(--space-3)"
      >
        <p className="text-(length:--font-size-body) text-secondary">
          Institusi baru dibuat berstatus <strong>Draft</strong> — belum bisa
          dipakai sampai diaktifkan.
        </p>
        <label className="flex flex-col gap-(--space-1)">
          <span className="text-(length:--font-size-label) text-secondary">
            Nama Institusi
          </span>
          <input
            className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="pc-f-name"
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-(--space-1)">
          <span className="text-(length:--font-size-label) text-secondary">
            Slug (alamat unik)
          </span>
          <input
            className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            data-testid="pc-f-slug"
          />
        </label>
        <label className="flex flex-col gap-(--space-1)">
          <span className="text-(length:--font-size-label) text-secondary">
            Nama Tampilan (opsional)
          </span>
          <input
            className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-(--space-1)">
          <span className="text-(length:--font-size-label) text-secondary">
            Warna Aksen CSS var (opsional)
          </span>
          <input
            className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            placeholder="var(--color-accent)"
          />
        </label>
        <div className="grid gap-(--space-3) sm:grid-cols-2">
          <label className="flex flex-col gap-(--space-1)">
            <span className="text-(length:--font-size-label) text-secondary">
              Nama Pemilik Pertama
            </span>
            <input
              className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-(--space-1)">
            <span className="text-(length:--font-size-label) text-secondary">
              Email Pemilik Pertama
            </span>
            <input
              type="email"
              className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              data-testid="pc-f-owner-email"
            />
          </label>
        </div>
      </form>
    </Modal>
  );
}

function DetailModal({
  tenant,
  onClose,
  onChanged,
}: {
  tenant: PlatformTenant;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [planId, setPlanId] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [inviteEmail, setInviteEmail] = useState(
    tenant.primary_contact?.email || "",
  );
  const [inviteName, setInviteName] = useState(
    tenant.primary_contact?.name || "",
  );
  const [inviteResult, setInviteResult] = useState<{
    activation_path: string;
    expires_at?: string;
  } | null>(null);
  const [editName, setEditName] = useState(tenant.name || "");
  const [editDisplay, setEditDisplay] = useState(
    tenant.branding?.display_name || "",
  );
  const [editAccent, setEditAccent] = useState(tenant.branding?.accent || "");

  const metricsQ = useQuery({
    queryKey: ["platform", "metrics", tenant.tenant_id],
    queryFn: () => getPlatformTenantMetrics(tenant.tenant_id),
  });
  const plansQ = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: listPlatformPlans,
  });
  const timelineQ = useQuery({
    queryKey: ["platform", "audit", tenant.tenant_id],
    queryFn: () =>
      listPlatformAudit({ entity_id: tenant.tenant_id, limit: 50 }),
  });

  const plans = (plansQ.data ?? []).filter((p) => p.status === "active");
  const metrics = metricsQ.data as
    | {
        counts?: {
          users?: number;
          students?: number;
          tutors?: number;
          sessions_this_month?: number;
        };
        quota_report?: Array<{
          key: string;
          used: number;
          limit?: number;
          unlimited?: boolean;
          over?: boolean;
        }>;
      }
    | undefined;
  const sub = tenant.subscription;

  return (
    <Modal
      title={tenant.branding?.display_name || tenant.name}
      onClose={onClose}
    >
      <div className="mb-(--space-4) space-y-(--space-2) text-(length:--font-size-body) text-primary">
        <p>
          <span className="text-secondary">Slug · </span>
          {tenant.slug}
        </p>
        <p>
          <span className="text-secondary">Paket · </span>
          {sub?.plan_name
            ? `${sub.plan_name} · ${fmtRupiah(sub.price_amount, sub.currency)} ${INTERVAL_LABEL[sub.interval || ""] || ""}`
            : "—"}
        </p>
      </div>

      <h3 className="mb-(--space-2) font-semibold text-primary">
        Ubah Institusi
      </h3>
      <div className="mb-(--space-3) grid gap-(--space-3) sm:grid-cols-2">
        <input
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          data-testid="edit-name"
        />
        <input
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          value={editDisplay}
          onChange={(e) => setEditDisplay(e.target.value)}
          data-testid="edit-display"
          placeholder="Nama tampilan"
        />
        <input
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary sm:col-span-2"
          value={editAccent}
          onChange={(e) => setEditAccent(e.target.value)}
          data-testid="edit-accent"
          placeholder="var(--color-accent)"
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="edit-save"
        onClick={() => {
          void (async () => {
            if (editName.trim().length < 2) {
              toast.error("Nama institusi wajib diisi");
              return;
            }
            try {
              await patchPlatformTenant(tenant.tenant_id, {
                name: editName.trim(),
                branding: {
                  display_name: editDisplay.trim() || null,
                  accent: editAccent.trim().startsWith("var(")
                    ? editAccent.trim()
                    : null,
                },
              });
              toast.success("Institusi diperbarui");
              onChanged();
              onClose();
            } catch (e: unknown) {
              const detail =
                e && typeof e === "object" && "response" in e
                  ? (e as { response?: { data?: { detail?: string } } })
                      .response?.data?.detail
                  : undefined;
              toast.error(detail || "Gagal menyimpan perubahan");
            }
          })();
        }}
      >
        Simpan Perubahan
      </Button>

      <h3 className="mb-(--space-2) mt-(--space-5) font-semibold text-primary">
        Kesehatan & Pemakaian
      </h3>
      {metrics?.counts ? (
        <div className="mb-(--space-3) grid grid-cols-2 gap-(--space-2) sm:grid-cols-4">
          {(
            [
              ["m-users", "Pengguna", metrics.counts.users],
              ["m-students", "Murid", metrics.counts.students],
              ["m-tutors", "Tutor", metrics.counts.tutors],
              [
                "m-sessions",
                "Sesi (bln ini)",
                metrics.counts.sessions_this_month,
              ],
            ] as const
          ).map(([id, label, value]) => (
            <div
              key={id}
              className="rounded-control border border-line-subtle p-(--space-2)"
            >
              <div className="text-(length:--font-size-label) text-secondary">
                {label}
              </div>
              <div data-testid={id} className="font-bold text-primary">
                {value ?? 0}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-secondary">Memuat metrik…</p>
      )}
      {metrics?.quota_report?.length
        ? metrics.quota_report.map((q) => (
            <div
              key={q.key}
              className="mb-(--space-2) text-(length:--font-size-body-compact) text-primary"
              data-testid={`quota-${q.key}`}
            >
              {QUOTA_LABEL[q.key] || q.key}: {q.used}
              {q.unlimited ? " / ∞" : ` / ${q.limit}`}
              {q.over ? " • melebihi" : ""}
            </div>
          ))
        : null}

      <h3 className="mb-(--space-2) mt-(--space-5) font-semibold text-primary">
        Tugaskan Paket
      </h3>
      <div className="mb-(--space-2) grid gap-(--space-2) sm:grid-cols-2">
        <select
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          data-testid="assign-plan"
        >
          <option value="">— pilih paket —</option>
          {plans.map((p) => (
            <option key={p.plan_id} value={p.plan_id}>
              {p.name} · {fmtRupiah(p.price_amount, p.currency)}
            </option>
          ))}
        </select>
        <input
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          type="number"
          min={0}
          value={priceOverride}
          onChange={(e) => setPriceOverride(e.target.value)}
          data-testid="assign-price"
          placeholder="Harga khusus"
        />
      </div>
      <Button
        type="button"
        size="sm"
        data-testid="assign-submit"
        onClick={() => {
          void (async () => {
            if (!planId) {
              toast.error("Pilih paket dulu");
              return;
            }
            try {
              const body: { plan_id: string; price_override?: number } = {
                plan_id: planId,
              };
              if (priceOverride !== "")
                body.price_override = Number(priceOverride);
              const data = await assignPlatformTenantPlan(
                tenant.tenant_id,
                body,
              );
              toast.success(
                `Paket "${data.subscription?.plan_name}" ditugaskan`,
              );
              onChanged();
              onClose();
            } catch (e: unknown) {
              const detail =
                e && typeof e === "object" && "response" in e
                  ? (e as { response?: { data?: { detail?: string } } })
                      .response?.data?.detail
                  : undefined;
              toast.error(detail || "Gagal menugaskan paket");
            }
          })();
        }}
      >
        Tugaskan Paket
      </Button>

      <h3 className="mb-(--space-2) mt-(--space-5) font-semibold text-primary">
        Undang Pemilik Pertama
      </h3>
      <div className="mb-(--space-2) grid gap-(--space-2) sm:grid-cols-2">
        <input
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          value={inviteName}
          onChange={(e) => setInviteName(e.target.value)}
          data-testid="invite-name"
          placeholder="Nama Owner"
        />
        <input
          type="email"
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          data-testid="invite-email"
          placeholder="Email Owner"
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="invite-submit"
        onClick={() => {
          void (async () => {
            if (!inviteEmail.trim() || inviteName.trim().length < 2) {
              toast.error("Nama & email owner wajib diisi");
              return;
            }
            try {
              const data = await invitePlatformOwner(tenant.tenant_id, {
                email: inviteEmail.trim(),
                name: inviteName.trim(),
              });
              setInviteResult(data);
              toast.success("Undangan owner dibuat");
              onChanged();
            } catch (e: unknown) {
              const detail =
                e && typeof e === "object" && "response" in e
                  ? (e as { response?: { data?: { detail?: string } } })
                      .response?.data?.detail
                  : undefined;
              toast.error(detail || "Gagal membuat undangan");
            }
          })();
        }}
      >
        Buat Undangan
      </Button>
      {inviteResult ? (
        <div className="mt-(--space-2)" data-testid="invite-result">
          <p className="text-(length:--font-size-body-compact) text-secondary">
            Bagikan tautan aktivasi (berlaku sampai{" "}
            {fmtDate(inviteResult.expires_at)}):
          </p>
          <code className="break-all text-primary">
            {inviteResult.activation_path}
          </code>
        </div>
      ) : null}

      <h3 className="mb-(--space-2) mt-(--space-5) font-semibold text-primary">
        Riwayat Aktivitas
      </h3>
      {timelineQ.isPending ? (
        <p className="text-secondary">Memuat riwayat…</p>
      ) : (timelineQ.data ?? []).length === 0 ? (
        <p className="text-secondary">Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className="space-y-(--space-2)" data-testid="pc-timeline">
          {(timelineQ.data ?? []).map((r) => (
            <li
              key={r.log_id}
              className="text-(length:--font-size-body-compact) text-primary"
            >
              <span className="tabular-nums text-secondary">
                {r.timestamp ? fmtDate(r.timestamp) : "—"}
              </span>{" "}
              · {auditLabel(r.action)} · {r.user_name || r.user_id || "—"}
              {r.reason ? ` — “${r.reason}”` : ""}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ConfirmModal({
  confirm,
  onClose,
  onConfirm,
}: {
  confirm: { tenant: PlatformTenant; to: string; label: string };
  onClose: () => void;
  onConfirm: (
    tenant: PlatformTenant,
    to: string,
    reason?: string,
  ) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { tenant, to, label } = confirm;
  const isSuspend = to === "suspended";
  const isArchive = to === "archived";

  return (
    <Modal
      title={`${label}: ${tenant.branding?.display_name || tenant.name}`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant={isSuspend || isArchive ? "outline" : "default"}
            className={isSuspend || isArchive ? "text-critical" : undefined}
            disabled={busy}
            data-testid="pc-confirm"
            onClick={() => {
              void (async () => {
                setBusy(true);
                await onConfirm(tenant, to, reason);
                setBusy(false);
              })();
            }}
          >
            {busy ? "Memproses…" : `Ya, ${label.toLowerCase()}`}
          </Button>
        </>
      }
    >
      {to === "active" ? (
        <p className="text-primary">
          Institusi akan bisa login dan memakai Smartboard.
        </p>
      ) : null}
      {isSuspend ? (
        <p className="text-primary">
          Pengguna institusi ini tidak akan bisa login. Data tetap tersimpan.
        </p>
      ) : null}
      {isArchive ? (
        <p className="text-primary">
          Institusi diarsipkan (soft-retire). Data tidak dihapus.
        </p>
      ) : null}
      {isSuspend || isArchive ? (
        <label className="mt-(--space-3) flex flex-col gap-(--space-1)">
          <span className="text-(length:--font-size-label) text-secondary">
            Alasan internal (opsional)
          </span>
          <textarea
            className="rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-2) text-primary"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            data-testid="pc-reason"
          />
        </label>
      ) : null}
    </Modal>
  );
}
