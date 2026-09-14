"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  createJournalEntry,
  createParentJournalMessage,
  listStudentJournal,
  type JournalEntry,
} from "../lib/api.ts";
import { useAuth } from "../lib/auth.tsx";
import {
  isJournalAuthorRole,
  isJournalParentRole,
  journalStatusLabel,
} from "../lib/journal.ts";
import { Button } from "./ui/button.tsx";

function formatJournalDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface CollaborativeJournalProps {
  studentId: string;
}

export function CollaborativeJournal({ studentId }: CollaborativeJournalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAuthor = isJournalAuthorRole(user?.role);
  const isParent = isJournalParentRole(user?.role);

  const [observation, setObservation] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [parentSummary, setParentSummary] = useState("");
  const [parentMessage, setParentMessage] = useState("");

  const journalQ = useQuery({
    queryKey: ["journal", studentId],
    queryFn: () => listStudentJournal(studentId),
    enabled: Boolean(studentId) && studentId !== "placeholder",
  });

  const saveStaff = useMutation({
    mutationFn: () =>
      createJournalEntry({
        student_id: studentId,
        observation: observation.trim(),
        recommendation: recommendation.trim(),
        parent_summary: parentSummary.trim(),
        visibility: parentSummary.trim() ? "ortu" : "internal",
      }),
    onSuccess: () => {
      setObservation("");
      setRecommendation("");
      setParentSummary("");
      toast.success("Catatan jurnal disimpan.");
      void qc.invalidateQueries({ queryKey: ["journal", studentId] });
    },
    onError: () => toast.error("Catatan jurnal gagal disimpan."),
  });

  const saveParent = useMutation({
    mutationFn: () =>
      createParentJournalMessage(studentId, { message: parentMessage.trim() }),
    onSuccess: () => {
      setParentMessage("");
      toast.success("Pesan terkirim ke jurnal kolaboratif.");
      void qc.invalidateQueries({ queryKey: ["journal", studentId] });
    },
    onError: () => toast.error("Pesan gagal dikirim."),
  });

  const items = journalQ.data?.items ?? [];
  const saving = saveStaff.isPending || saveParent.isPending;

  return (
    <section
      className="space-y-(--space-4) rounded-control border border-line-subtle bg-canvas p-(--space-4)"
      aria-label="Jurnal kolaboratif"
      data-testid="journal-collab"
    >
      <div>
        <p className="text-xs tracking-wide text-secondary uppercase">05</p>
        <h2 className="text-lg font-semibold text-primary">Jurnal Kolaboratif</h2>
        <p className="mt-1 text-sm text-secondary">
          Catatan internal staf tidak ditampilkan ke orang tua. Orang tua hanya
          melihat ringkasan yang disetujui dan pesan yang mereka kirim sendiri.
        </p>
      </div>

      {journalQ.isPending ? (
        <p className="text-secondary">Memuat jurnal…</p>
      ) : journalQ.isError ? (
        <div className="space-y-(--space-2)">
          <p className="text-secondary">Jurnal belum dapat dimuat.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void journalQ.refetch()}
          >
            Coba lagi
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-secondary" data-testid="journal-empty">
          {isAuthor
            ? "Belum ada catatan. Tulis observasi pertama, atau minta orang tua mengirim pesan."
            : "Belum ada ringkasan yang dibagikan. Anda dapat mengirim pesan kepada pengajar di bawah."}
        </p>
      ) : (
        <ol className="space-y-(--space-3)" data-testid="journal-thread">
          {items.map((entry) => (
            <JournalThreadItem
              key={entry.journal_id}
              entry={entry}
              isAuthor={isAuthor}
            />
          ))}
        </ol>
      )}

      {isAuthor ? (
        <form
          className="space-y-(--space-3) border-t border-line-subtle pt-(--space-4)"
          onSubmit={(e) => {
            e.preventDefault();
            if (!observation.trim() || saving) return;
            saveStaff.mutate();
          }}
        >
          <p className="text-sm font-medium text-primary">Catatan staf</p>
          <label className="block space-y-1 text-sm">
            <span className="text-secondary">Observasi · wajib</span>
            <textarea
              id="jrn-observation"
              className="w-full rounded-control border border-line bg-surface px-3 py-2 text-primary"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
              required
              minLength={3}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-secondary">Rekomendasi</span>
            <textarea
              id="jrn-recommendation"
              className="w-full rounded-control border border-line bg-surface px-3 py-2 text-primary"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={2}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-secondary">
              Ringkasan untuk orang tua (kosongkan bila belum disetujui)
            </span>
            <textarea
              id="jrn-parent-summary"
              className="w-full rounded-control border border-line bg-surface px-3 py-2 text-primary"
              value={parentSummary}
              onChange={(e) => setParentSummary(e.target.value)}
              rows={2}
            />
          </label>
          <Button
            type="submit"
            disabled={saving || observation.trim().length < 3}
          >
            {saving ? "Menyimpan…" : "Simpan catatan"}
          </Button>
        </form>
      ) : null}

      {isParent ? (
        <form
          className="space-y-(--space-3) border-t border-line-subtle pt-(--space-4)"
          data-testid="parent-compose"
          onSubmit={(e) => {
            e.preventDefault();
            if (parentMessage.trim().length < 3 || saving) return;
            saveParent.mutate();
          }}
        >
          <p className="text-sm font-medium text-primary">Pesan kepada pengajar</p>
          <label className="block space-y-1 text-sm">
            <span className="text-secondary">Pesan · wajib</span>
            <textarea
              id="jrn-parent-msg"
              className="w-full rounded-control border border-line bg-surface px-3 py-2 text-primary"
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              rows={3}
              required
              minLength={3}
              placeholder="Contoh: Mohon info latihan tambahan untuk minggu ini."
            />
          </label>
          <Button
            type="submit"
            disabled={saving || parentMessage.trim().length < 3}
          >
            {saving ? "Mengirim…" : "Kirim pesan"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}

interface JournalThreadItemProps {
  entry: JournalEntry;
  isAuthor: boolean;
}

function JournalThreadItem({ entry, isAuthor }: JournalThreadItemProps) {
  const source = entry.source === "parent" ? "parent" : "staff";
  const who =
    source === "parent"
      ? entry.author_name || "Orang tua"
      : entry.author_name || "Pengajar / Admin";

  return (
    <li className="rounded-control border border-line-subtle bg-surface p-(--space-3)">
      <p className="text-xs text-secondary">
        <span className="font-medium text-primary">{who}</span>
        {" · "}
        {formatJournalDate(entry.created_at)}
        {entry.tags?.length ? ` · ${entry.tags.join(" · ")}` : ""}
        {entry.status ? ` · ${journalStatusLabel(entry.status)}` : ""}
      </p>
      {isAuthor ? (
        <div className="mt-2 space-y-1 text-sm text-primary">
          <p>{entry.observation}</p>
          {entry.problem ? (
            <p className="text-secondary">Dugaan: {entry.problem}</p>
          ) : null}
          {entry.recommendation ? (
            <p className="text-secondary">Rekomendasi: {entry.recommendation}</p>
          ) : null}
          {entry.outcome ? (
            <p className="text-secondary">Hasil: {entry.outcome}</p>
          ) : null}
          {source === "staff" ? (
            entry.parent_summary ? (
              <p className="text-secondary">
                Dibagikan ke orang tua: {entry.parent_summary}
              </p>
            ) : (
              <p className="text-secondary">
                Ringkasan untuk orang tua belum ditulis.
              </p>
            )
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-primary">{entry.parent_summary}</p>
      )}
    </li>
  );
}
