"use client";

import { AppShell } from "../../../components/AppShell.tsx";
import { MasterCrud } from "../../../components/MasterCrud.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";

export default function SekolahPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik"]}>
      <AppShell>
        <MasterCrud
          title="Sekolah"
          lede="Sekolah asal murid. Dipakai untuk pengelompokan laporan dan rekap perkembangan."
          resource="schools"
          fields={[
            { name: "name", label: "Nama Sekolah", required: true, wide: true },
            {
              name: "level",
              label: "Jenjang",
              type: "select",
              required: true,
              options: () => [
                { value: "SD", label: "SD" },
                { value: "SMP", label: "SMP" },
                { value: "SMA", label: "SMA" },
              ],
            },
            { name: "curriculum", label: "Kurikulum" },
            { name: "address", label: "Alamat", wide: true },
            {
              name: "notes",
              label: "Catatan Khusus",
              type: "textarea",
              wide: true,
            },
          ]}
          columns={[
            { key: "name", label: "Nama" },
            { key: "level", label: "Jenjang" },
            { key: "curriculum", label: "Kurikulum" },
            { key: "address", label: "Alamat" },
          ]}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
