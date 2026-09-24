"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../components/StatusBadge.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
  type ApprovalRow,
  decideApproval,
  listApprovals,
  listAuthUsers,
} from "../../lib/api.ts";
import { fmtDate } from "../../lib/labels.ts";

const RESOURCE_LABEL: Record<string, string> = {
  students: "Murid",
  tutors: "Pengajar",
  teams: "TIM",
};
const ACTION_LABEL: Record<string, string> = {
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
};
const ACTION_TONE: Record<string, "success" | "info" | "critical" | "neutral"> =
  {
    create: "success",
    update: "info",
    delete: "critical",
  };

function summarize(ap: ApprovalRow): string {
  return ap.payload?.name || ap.resource_id || "—";
}

function PersetujuanView() {
  const qc = useQueryClient();
  const approvalsQ = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () => listApprovals({ status: "pending" }),
  });
  const usersQ = useQuery({
    queryKey: ["auth-users"],
    queryFn: listAuthUsers,
  });

  const requesterName = (userId?: string) =>
    usersQ.data?.find((u) => u.user_id === userId)?.name || userId || "—";

  const decide = async (id: string, decision: "approve" | "reject") => {
    const note =
      decision === "reject" ? window.prompt("Alasan penolakan:") || "" : "";
    try {
      await decideApproval(id, { decision, note });
      toast.success(
        decision === "approve" ? "Disetujui dan diterapkan" : "Ditolak",
      );
      void qc.invalidateQueries({ queryKey: ["approvals"] });
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal");
    }
  };

  const rows = approvalsQ.data ?? [];

  return (
    <AppShell>
      <div className="flex flex-col gap-(--space-4)">
        <PageHead
          seq="SET"
          eyebrow="Pengaturan"
          title="Persetujuan"
          lede="Perubahan data master oleh Admin Akademik menunggu persetujuan Owner sebelum diterapkan."
        />

        <p className="text-(length:--font-size-body) text-secondary">
          <span className="font-semibold text-primary">{rows.length}</span>{" "}
          menunggu
        </p>

        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="w-full min-w-[48rem] text-left text-(length:--font-size-body)">
            <thead className="border-b border-line-subtle bg-surface text-secondary">
              <tr>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Diajukan
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Diminta oleh
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Jenis Data
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Aksi
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Ringkasan
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Keputusan
                </th>
              </tr>
            </thead>
            <tbody>
              {approvalsQ.isPending && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Memuat…
                  </td>
                </tr>
              )}
              {!approvalsQ.isPending && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Tidak ada pengajuan menunggu persetujuan.
                  </td>
                </tr>
              )}
              {rows.map((ap) => (
                <tr
                  key={ap.approval_id}
                  data-testid={`row-approval-${ap.approval_id}`}
                  className="border-t border-line-subtle text-primary"
                >
                  <td className="px-(--space-3) py-(--space-2) tabular-nums">
                    {fmtDate(ap.created_at)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {requesterName(ap.requested_by)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <StatusBadge tone="neutral">
                      {RESOURCE_LABEL[ap.resource || ""] || ap.resource}
                    </StatusBadge>
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <StatusBadge
                      tone={ACTION_TONE[ap.action || ""] || "neutral"}
                    >
                      {ACTION_LABEL[ap.action || ""] || ap.action}
                    </StatusBadge>
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {summarize(ap)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <div className="flex flex-wrap gap-(--space-2)">
                      <Button
                        type="button"
                        size="sm"
                        data-testid={`btn-approve-${ap.approval_id}`}
                        onClick={() => void decide(ap.approval_id, "approve")}
                      >
                        Setujui
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-critical"
                        data-testid={`btn-reject-${ap.approval_id}`}
                        onClick={() => void decide(ap.approval_id, "reject")}
                      >
                        Tolak
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

export default function PersetujuanPage() {
  return (
    <ProtectedRoute roles={["owner"]}>
      <PersetujuanView />
    </ProtectedRoute>
  );
}
