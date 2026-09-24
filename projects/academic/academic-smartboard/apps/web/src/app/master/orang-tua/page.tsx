"use client";

import { AppShell } from "../../../components/AppShell.tsx";
import { MasterCrud } from "../../../components/MasterCrud.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";

export default function OrangTuaPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik"]}>
      <AppShell>
        <MasterCrud
          title="Orang Tua"
          lede="Kontak wali murid. Akun wali hanya dapat melihat anak yang terhubung di sini."
          resource="parents"
          fields={[
            { name: "name", label: "Nama", required: true },
            {
              name: "relation",
              label: "Hubungan",
              type: "select",
              options: () => [
                { value: "Ayah", label: "Ayah" },
                { value: "Ibu", label: "Ibu" },
                { value: "Wali", label: "Wali" },
              ],
            },
            { name: "phone", label: "Telepon" },
            { name: "email", label: "Email", type: "email" },
            { name: "address", label: "Alamat", wide: true },
          ]}
          columns={[
            { key: "name", label: "Nama" },
            { key: "relation", label: "Hubungan" },
            { key: "phone", label: "Telepon" },
            { key: "email", label: "Email" },
            {
              key: "student_ids",
              label: "Anak",
              render: (r) =>
                String(Array.isArray(r.student_ids) ? r.student_ids.length : 0),
            },
          ]}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
