"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  importTutorDirectory,
  inviteTutorDirectory,
  listTutorDirectory,
  type TutorDirectoryRow,
} from "../../../lib/api.ts";

const STATUS_LABEL: Record<string, string> = {
  pending_invite: "Menunggu undangan",
  invited: "Undangan terkirim",
  active: "Aktif",
  disabled: "Dinonaktifkan",
};

function TutorDirectoryView() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState("");

  const rowsQ = useQuery({
    queryKey: ["tutor-directory"],
    queryFn: listTutorDirectory,
  });
  const rows = rowsQ.data ?? [];

  const importWorkbook = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Pilih file DATA_TENTOR_EMAIL.xlsx terlebih dahulu");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await importTutorDirectory(body);
      const { added, updated, pending_approval: pending } = data.counts;
      if (pending) {
        toast.success(
          `${added} baru, ${updated} diperbarui · ${pending} data pengajar menunggu persetujuan Owner`,
        );
      } else {
        toast.success(`${added} baru, ${updated} diperbarui`);
      }
      void qc.invalidateQueries({ queryKey: ["tutor-directory"] });
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Import workbook gagal");
    } finally {
      setBusy(false);
    }
  };

  const invite = async (row: TutorDirectoryRow) => {
    setInviting(row.directory_id);
    try {
      const data = await inviteTutorDirectory(row.directory_id);
      const link = `${window.location.origin}${data.activation_path}`;
      setInviteLink(link);
      await navigator.clipboard?.writeText(link);
      toast.success(
        "Link aktivasi dibuat dan disalin jika browser mengizinkan",
      );
      void qc.invalidateQueries({ queryKey: ["tutor-directory"] });
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Undangan gagal dibuat");
    } finally {
      setInviting(null);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-(--space-4)">
        <PageHead
          seq="SET"
          eyebrow="Pengaturan"
          title="Directory Tutor"
          lede="Kelola identitas tutor, mentor, dan guru yang dapat menerima akses Sentra. Import tidak mengubah role atau status akun aktif."
        />

        <section className="rounded-control border border-line-subtle bg-surface p-(--space-4)">
          <p className="mb-(--space-3) text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
            Import workbook
          </p>
          <div className="flex flex-wrap items-end gap-(--space-3)">
            <label className="flex min-w-[16rem] flex-1 flex-col gap-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Workbook tutor
              </span>
              <input
                id="tutor-directory-file"
                ref={fileRef}
                className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                type="file"
                accept=".xlsx"
              />
            </label>
            <Button
              type="button"
              size="sm"
              onClick={() => void importWorkbook()}
              disabled={busy}
              data-testid="btn-import-tutor-directory"
            >
              {busy ? "Mengimpor…" : "Import directory"}
            </Button>
          </div>
        </section>

        {inviteLink ? (
          <section
            className="rounded-control border border-line-subtle bg-canvas p-(--space-4)"
            role="status"
          >
            <strong className="text-primary">
              Link aktivasi siap dibagikan
            </strong>
            <p className="mt-(--space-2) break-all text-(length:--font-size-body-compact) text-secondary">
              {inviteLink}
            </p>
          </section>
        ) : null}

        <p className="text-(length:--font-size-body) text-secondary">
          <span className="font-semibold text-primary">{rows.length}</span>{" "}
          tutor di directory
        </p>

        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="w-full min-w-[40rem] text-left text-(length:--font-size-body)">
            <thead className="border-b border-line-subtle bg-surface text-secondary">
              <tr>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Nama
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Email
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Status
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Akun
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium" />
              </tr>
            </thead>
            <tbody>
              {rowsQ.isPending && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Memuat…
                  </td>
                </tr>
              )}
              {!rowsQ.isPending && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Belum ada directory tutor.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.directory_id}
                  className="border-t border-line-subtle text-primary"
                >
                  <td className="px-(--space-3) py-(--space-2) font-semibold">
                    {row.name}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">{row.email}</td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <StatusBadge tone="info">
                      {STATUS_LABEL[row.status] || row.status}
                    </StatusBadge>
                  </td>
                  <td className="px-(--space-3) py-(--space-2) text-(length:--font-size-body-compact)">
                    {row.user_id ? "Terhubung" : "Belum dibuat"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {row.status !== "active" && row.status !== "disabled" ? (
                      <button
                        type="button"
                        className="text-accent-text underline disabled:opacity-50"
                        onClick={() => void invite(row)}
                        disabled={inviting === row.directory_id}
                        data-testid={`btn-invite-${row.directory_id}`}
                      >
                        {inviting === row.directory_id
                          ? "Membuat…"
                          : "Kirim undangan →"}
                      </button>
                    ) : null}
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

export default function TutorDirectoryPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik"]}>
      <TutorDirectoryView />
    </ProtectedRoute>
  );
}
