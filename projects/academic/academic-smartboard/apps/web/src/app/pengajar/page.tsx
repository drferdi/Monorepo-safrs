"use client";

import { AppShell } from "../../components/AppShell.tsx";
import { MasterCrud } from "../../components/MasterCrud.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../components/StatusBadge.tsx";
import { listSubjects } from "../../lib/api.ts";
import { rupiah } from "../../lib/labels.ts";
import type { MasterField } from "../../lib/masterCrud.ts";

function PengajarView() {
  const fields: MasterField[] = [
    { name: "name", label: "Nama", required: true },
    { name: "employee_id", label: "ID Pegawai" },
    { name: "phone", label: "Telepon" },
    { name: "email", label: "Email", type: "email" },
    { name: "address", label: "Alamat", wide: true },
    {
      name: "subject_ids",
      label: "Mata Pelajaran",
      type: "multi",
      options: (d) => {
        const subjects =
          (d.subjects as Array<{
            subject_id: string;
            name: string;
          }>) || [];
        return subjects.map((x) => ({
          value: x.subject_id,
          label: x.name,
        }));
      },
    },
    {
      name: "stages",
      label: "Jenjang Dikuasai",
      type: "multi",
      options: () => ["SD", "SMP", "SMA"].map((s) => ({ value: s, label: s })),
    },
    {
      name: "base_rate",
      label: "Tarif Dasar / Sesi (Rp)",
      type: "number",
    },
    { name: "joined_date", label: "Tanggal Bergabung", type: "date" },
    {
      name: "active",
      label: "Status",
      type: "boolean",
      default: true,
    },
  ];

  return (
    <MasterCrud
      title="Daftar Pengajar"
      lede="Data tentor beserta mata pelajaran, jenjang yang dikuasai, dan tarif dasar per sesi."
      resource="tutors"
      extraFetch={async () => {
        const subjects = await listSubjects();
        return { subjects };
      }}
      fields={fields}
      columns={[
        { key: "name", label: "Nama" },
        { key: "employee_id", label: "ID" },
        { key: "phone", label: "Telepon" },
        {
          key: "subject_ids",
          label: "Mapel",
          render: (r, d) => {
            const subjects =
              (d.subjects as Array<{ subject_id: string; name: string }>) || [];
            const ids = (r.subject_ids as string[]) || [];
            return (
              ids
                .map((id) => subjects.find((x) => x.subject_id === id)?.name)
                .filter(Boolean)
                .join(", ") || "—"
            );
          },
        },
        {
          key: "base_rate",
          label: "Tarif Dasar",
          render: (r) => rupiah(Number(r.base_rate)),
        },
        {
          key: "active",
          label: "Status",
          render: (r) => (
            <StatusBadge tone={r.active ? "success" : "neutral"}>
              {r.active ? "Aktif" : "Non-aktif"}
            </StatusBadge>
          ),
        },
      ]}
    />
  );
}

export default function PengajarPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik"]}>
      <AppShell>
        <PengajarView />
      </AppShell>
    </ProtectedRoute>
  );
}
