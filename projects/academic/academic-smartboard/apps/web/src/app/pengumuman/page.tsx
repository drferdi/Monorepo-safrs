"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
  createAnnouncement,
  getAnnouncementReceipts,
  listAnnouncements,
} from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";
import { ROLE_LABEL } from "../../lib/labels.ts";

const AUDIENCE_ROLES = [
  "owner",
  "admin_akademik",
  "tentor",
  "finance",
  "murid_ortu",
  "content_manager",
] as const;

function formatWhen(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function PengumumanView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isPublisher = useMemo(
    () => user?.role === "owner" || user?.role === "admin_akademik",
    [user],
  );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [receipts, setReceipts] = useState<Record<string, unknown>>({});

  const listQ = useQuery({
    queryKey: ["announcements"],
    queryFn: listAnnouncements,
  });

  const items = listQ.data?.items ?? [];

  const publishM = useMutation({
    mutationFn: () =>
      createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        audience_roles: audience,
        pinned,
        publish_now: !publishAt,
        publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setAudience([]);
      setPinned(false);
      setPublishAt("");
      toast.success(publishAt ? "Pengumuman dijadwalkan." : "Pengumuman terbit.");
      void qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err: unknown) => {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Pengumuman gagal disimpan.");
    },
  });

  async function loadReceipts(id: string): Promise<void> {
    try {
      const data = await getAnnouncementReceipts(id);
      setReceipts((prev) => ({ ...prev, [id]: data }));
    } catch {
      toast.error("Gagal memuat tanda terima.");
    }
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="KOM"
        eyebrow="Komunikasi"
        title="Pengumuman"
        lede="Pengumuman resmi satu arah — terjadwal, tersemat, dan terukur keterbacaannya."
      />

      {isPublisher ? (
        <section
          aria-label="Buat pengumuman"
          className="space-y-(--space-3) rounded-control border border-line-subtle p-(--space-4)"
        >
          <h2 className="text-(length:--font-size-title-section) font-semibold">
            Pengumuman baru
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              publishM.mutate();
            }}
            className="space-y-(--space-3)"
          >
            <label className="block space-y-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Judul
              </span>
              <input
                id="ann-title"
                className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Isi
              </span>
              <textarea
                id="ann-body"
                rows={4}
                className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </label>
            <fieldset className="space-y-(--space-2)">
              <legend className="text-(length:--font-size-label) text-secondary">
                Audiens
              </legend>
              <div className="flex flex-wrap gap-(--space-3)">
                {AUDIENCE_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-(--space-2)">
                    <input
                      type="checkbox"
                      checked={audience.includes(role)}
                      onChange={(e) => {
                        setAudience((prev) =>
                          e.target.checked
                            ? [...prev, role]
                            : prev.filter((r) => r !== role),
                        );
                      }}
                    />
                    <span>
                      {ROLE_LABEL[role as keyof typeof ROLE_LABEL] || role}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-(--space-2)">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              <span>Sematkan di atas</span>
            </label>
            <label className="block space-y-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Jadwalkan (opsional)
              </span>
              <input
                type="datetime-local"
                className="min-h-(--target-min) rounded-control border border-line-subtle px-(--space-3)"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
              />
            </label>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={
                  publishM.isPending || !title.trim() || !body.trim()
                }
              >
                {publishM.isPending ? "Menyimpan…" : "Terbitkan"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {listQ.isPending ? (
        <p className="text-secondary">Memuat pengumuman…</p>
      ) : listQ.isError ? (
        <p role="alert" className="text-critical">
          Gagal memuat pengumuman.{" "}
          <Button type="button" variant="outline" size="sm" onClick={() => void listQ.refetch()}>
            Coba lagi
          </Button>
        </p>
      ) : items.length === 0 ? (
        <p className="text-secondary">Belum ada pengumuman.</p>
      ) : (
        <ol className="space-y-(--space-4)">
          {items.map((a) => (
            <li
              key={a.announcement_id}
              className="rounded-control border border-line-subtle p-(--space-4)"
            >
              <p className="text-(length:--font-size-label) text-secondary">
                {a.pinned ? "Disematkan · " : ""}
                {formatWhen(
                  (a as { published_at?: string }).published_at ||
                    a.publish_at ||
                    a.created_at,
                )}
              </p>
              <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
                {a.title}
              </h2>
              <p className="mt-(--space-2) whitespace-pre-wrap text-secondary">
                {a.body}
              </p>
              {isPublisher ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-(--space-3)"
                  onClick={() => void loadReceipts(a.announcement_id)}
                >
                  Lihat tanda terima
                </Button>
              ) : null}
              {receipts[a.announcement_id] ? (
                <pre className="mt-(--space-2) overflow-x-auto text-(length:--font-size-label) text-secondary">
                  {JSON.stringify(receipts[a.announcement_id], null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function PengumumanPage() {
  return (
    <ProtectedRoute
      roles={[
        "owner",
        "admin_akademik",
        "tentor",
        "murid_ortu",
        "finance",
        "content_manager",
      ]}
    >
      <AppShell>
        <PengumumanView />
      </AppShell>
    </ProtectedRoute>
  );
}
