"use client";

import { AppShell } from "../../../components/AppShell.tsx";
import { MasterCrud } from "../../../components/MasterCrud.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";

export default function MataPelajaranPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik"]}>
      <AppShell>
        <MasterCrud
          title="Mata Pelajaran"
          lede="Daftar mata pelajaran yang diajarkan. Setiap sesi pembelajaran terikat ke satu mata pelajaran."
          resource="subjects"
          fields={[
            { name: "name", label: "Nama", required: true },
            {
              name: "stage",
              label: "Jenjang",
              type: "select",
              options: () => [
                { value: "SD", label: "SD" },
                { value: "SMP", label: "SMP" },
                { value: "SMA", label: "SMA" },
              ],
            },
            {
              name: "description",
              label: "Deskripsi",
              type: "textarea",
              wide: true,
            },
            { name: "active", label: "Status", type: "boolean", default: true },
          ]}
          columns={[
            { key: "name", label: "Nama" },
            { key: "stage", label: "Jenjang" },
            { key: "description", label: "Deskripsi" },
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
