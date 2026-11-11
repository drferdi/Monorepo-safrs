"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../../components/AppShell.tsx";
import {
  DataTable,
  type DataTableColumn,
} from "../../../components/DataTable.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { listStudents } from "../../../lib/api.ts";

const columns: DataTableColumn[] = [
  { key: "name", header: "Nama" },
  { key: "nis", header: "NIS" },
  { key: "gender", header: "Jenis Kelamin" },
  { key: "active", header: "Status" },
];

function MuridList() {
  const { data, status, refetch } = useQuery({
    queryKey: ["students"],
    queryFn: listStudents,
  });

  if (status === "pending") {
    return (
      <p className="text-(length:--font-size-body) text-secondary">
        Memuat data murid…
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-(--space-3)">
        <p
          role="alert"
          className="text-(length:--font-size-body) text-critical"
        >
          Gagal memuat data murid
        </p>
        <Button type="button" onClick={() => void refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  const rows = data.map((student) => ({
    student_id: student.student_id,
    name: student.name,
    nis: student.nis ?? "—",
    gender: student.gender === "L" ? "Laki-laki" : "Perempuan",
    active: student.active ? "Aktif" : "Nonaktif",
  }));

  return (
    <div className="space-y-(--space-5)">
      <h1 className="text-(length:--font-size-title-page) font-semibold text-primary">
        Murid
      </h1>
      <DataTable columns={columns} rows={rows} />
    </div>
  );
}

export default function MuridPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "tentor", "murid_ortu"]}>
      <AppShell>
        <MuridList />
      </AppShell>
    </ProtectedRoute>
  );
}
