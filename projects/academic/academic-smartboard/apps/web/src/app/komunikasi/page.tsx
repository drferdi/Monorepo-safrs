"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
  type Communication,
  type CommunicationDetail,
  getCommunication,
  listCommunications,
  patchCommunication,
  postCommunicationMessage,
} from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";

const CATEGORY_LABEL: Record<string, string> = {
  akademik: "Akademik",
  kehadiran: "Kehadiran",
  tugas: "Tugas",
  perilaku: "Perilaku",
  keuangan: "Keuangan",
  administrasi: "Administrasi",
  lainnya: "Lainnya",
};

const STATUS_LABEL: Record<string, string> = {
  terbuka: "Terbuka",
  menunggu_balasan: "Menunggu balasan",
  selesai: "Selesai",
  diarsipkan: "Diarsipkan",
};

const PRIORITY_LABEL: Record<string, string> = {
  rendah: "Rendah",
  normal: "Normal",
  tinggi: "Tinggi",
};

const STATUS_GLYPH: Record<string, string> = {
  terbuka: "○",
  menunggu_balasan: "◐",
  selesai: "●",
  diarsipkan: "▣",
};

function formatWhen(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function KomunikasiView() {
  const { user } = useAuth();
  const [items, setItems] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CommunicationDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const isStaff = useMemo(
    () => ["owner", "admin_akademik"].includes(user?.role ?? ""),
    [user],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      if (status) params.status = status;
      const data = await listCommunications(params);
      setItems(data.items || []);
      setDenied(false);
    } catch (e: unknown) {
      const statusCode =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { status?: number } }).response?.status
          : undefined;
      if (statusCode === 403) setDenied(true);
      else setError("Gagal memuat percakapan.");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openThread = useCallback(async (id: string) => {
    setOpenId(id);
    setDetail(null);
    try {
      const data = await getCommunication(id);
      setDetail(data);
    } catch {
      toast.error("Gagal membuka percakapan.");
      setOpenId(null);
    }
  }, []);

  async function sendReply(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!reply.trim() || sending || !openId) return;
    setSending(true);
    try {
      await postCommunicationMessage(openId, reply.trim());
      setReply("");
      await openThread(openId);
      await load();
    } catch {
      toast.error("Balasan gagal dikirim.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="KOM"
        eyebrow="Komunikasi"
        title="Percakapan"
        lede="Percakapan resmi dengan orang tua dan diskusi akademik internal. Setiap pesan tercatat dan dapat ditelusuri."
      />

      {denied ? (
        <p className="text-(length:--font-size-body) text-secondary">
          Anda tidak memiliki akses ke percakapan.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-(--space-3) rounded-control border border-line-subtle p-(--space-4)">
            <div className="space-y-(--space-1)">
              <label
                className="text-(length:--font-size-label) text-secondary"
                htmlFor="komunikasi-q"
              >
                Cari
              </label>
              <input
                id="komunikasi-q"
                type="search"
                className="min-h-(--target-min) min-w-[280px] rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Judul atau isi pesan"
              />
            </div>
            <div className="space-y-(--space-1)">
              <label
                className="text-(length:--font-size-label) text-secondary"
                htmlFor="komunikasi-status"
              >
                Status
              </label>
              <select
                id="komunikasi-status"
                className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Semua</option>
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-(length:--font-size-body) text-secondary">
              Memuat percakapan…
            </p>
          ) : error ? (
            <p className="text-(length:--font-size-body) text-secondary">
              {error}{" "}
              <button
                type="button"
                className="text-accent-text"
                onClick={() => void load()}
              >
                Coba lagi
              </button>
            </p>
          ) : items.length === 0 ? (
            <p className="text-(length:--font-size-body) text-secondary">
              Belum ada percakapan yang cocok dengan filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-control border border-line-subtle">
              <table className="min-w-full border-collapse text-(length:--font-size-body)">
                <thead>
                  <tr className="border-b border-line-subtle bg-surface">
                    <th
                      className="px-(--space-3) py-(--space-2) text-left"
                      scope="col"
                    >
                      Judul
                    </th>
                    <th
                      className="px-(--space-3) py-(--space-2) text-left"
                      scope="col"
                    >
                      Kategori
                    </th>
                    <th
                      className="px-(--space-3) py-(--space-2) text-left"
                      scope="col"
                    >
                      Prioritas
                    </th>
                    <th
                      className="px-(--space-3) py-(--space-2) text-left"
                      scope="col"
                    >
                      Status
                    </th>
                    <th
                      className="px-(--space-3) py-(--space-2) text-right"
                      scope="col"
                    >
                      Aktivitas terakhir
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.communication_id}
                      className="border-b border-line-subtle"
                    >
                      <td className="px-(--space-3) py-(--space-2)">
                        <button
                          type="button"
                          className="text-left text-accent-text hover:underline"
                          onClick={() => void openThread(c.communication_id)}
                        >
                          {c.title}
                        </button>
                      </td>
                      <td className="px-(--space-3) py-(--space-2)">
                        {CATEGORY_LABEL[c.category] || c.category}
                      </td>
                      <td className="px-(--space-3) py-(--space-2)">
                        {PRIORITY_LABEL[c.priority] || c.priority}
                      </td>
                      <td className="px-(--space-3) py-(--space-2)">
                        <span aria-hidden="true">
                          {STATUS_GLYPH[c.status] || "○"}
                        </span>{" "}
                        {STATUS_LABEL[c.status] || c.status}
                      </td>
                      <td className="px-(--space-3) py-(--space-2) text-right tabular-nums">
                        {formatWhen(c.last_message_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {openId && detail ? (
            <section
              className="space-y-(--space-4) rounded-control border border-line-subtle p-(--space-4)"
              aria-label="Isi percakapan"
            >
              <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
                {detail.communication.title}
              </h2>
              <ol className="space-y-(--space-3)">
                {detail.messages.map((m) => (
                  <li key={m.message_id}>
                    <p className="text-(length:--font-size-label) text-secondary">
                      {m.author_name} · {formatWhen(m.created_at)}
                      {m.internal ? " · catatan internal" : ""}
                    </p>
                    <p className="text-(length:--font-size-body) text-primary">
                      {m.body}
                    </p>
                  </li>
                ))}
              </ol>
              <form
                onSubmit={(e) => void sendReply(e)}
                className="space-y-(--space-3)"
              >
                <div className="space-y-(--space-1)">
                  <label
                    className="text-(length:--font-size-label) text-secondary"
                    htmlFor="komunikasi-reply"
                  >
                    Balasan
                  </label>
                  <textarea
                    id="komunikasi-reply"
                    className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
                <div className="flex justify-end gap-(--space-3)">
                  {isStaff ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await patchCommunication(openId, { status: "selesai" });
                        await openThread(openId);
                        await load();
                      }}
                    >
                      Tandai selesai
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={sending || !reply.trim()}
                  >
                    {sending ? "Mengirim…" : "Kirim balasan"}
                  </Button>
                </div>
              </form>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function KomunikasiPage() {
  return (
    <ProtectedRoute
      roles={["owner", "admin_akademik", "tentor", "murid_ortu", "finance"]}
    >
      <AppShell>
        <KomunikasiView />
      </AppShell>
    </ProtectedRoute>
  );
}
