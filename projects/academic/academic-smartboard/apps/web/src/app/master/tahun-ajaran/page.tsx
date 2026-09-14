"use client";

import { AppShell } from "../../../components/AppShell.tsx";
import { MasterCrud } from "../../../components/MasterCrud.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";

export default function TahunAjaranPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik"]}>
      <AppShell>
        <MasterCrud
          title="Tahun Ajaran"
          lede="Periode akademik aktif. Jadwal, sesi, dan laporan dikelompokkan mengikuti tahun ajaran ini."
          resource="academic-years"
          fields={[
            {
              name: "name",
              label: "Nama",
              required: true,
              placeholder: "2025/2026",
            },
            {
              name: "start_date",
              label: "Mulai",
              type: "date",
              required: true,
            },
            {
              name: "end_date",
              label: "Selesai",
              type: "date",
              required: true,
            },
            { name: "active", label: "Aktif", type: "boolean", default: true },
          ]}
          columns={[
            { key: "name", label: "Nama" },
            { key: "start_date", label: "Mulai" },
            { key: "end_date", label: "Selesai" },
            {
              key: "active",
              label: "Status",
              render: (r) =>
                r.active ? (
                  <StatusBadge tone="success">Aktif</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Non-aktif</StatusBadge>
                ),
            },
          ]}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
