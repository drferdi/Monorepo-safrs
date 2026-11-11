"use client";

import { AppShell } from "../../../components/AppShell.tsx";
import { MasterCrud } from "../../../components/MasterCrud.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";

export default function JenjangPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik"]}>
      <AppShell>
        <MasterCrud
          title="Jenjang / Kelas"
          lede="Tingkat pendidikan dan kelas yang dilayani. Dipakai saat menyusun jadwal dan menempatkan murid."
          resource="grade-levels"
          fields={[
            {
              name: "name",
              label: "Nama",
              required: true,
              placeholder: "SD Kelas 5",
            },
            {
              name: "stage",
              label: "Jenjang",
              type: "select",
              required: true,
              options: () => [
                { value: "SD", label: "SD" },
                { value: "SMP", label: "SMP" },
                { value: "SMA", label: "SMA" },
              ],
            },
            { name: "order", label: "Urutan", type: "number", default: 0 },
          ]}
          columns={[
            { key: "name", label: "Nama" },
            { key: "stage", label: "Jenjang" },
            { key: "order", label: "Urutan" },
          ]}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
