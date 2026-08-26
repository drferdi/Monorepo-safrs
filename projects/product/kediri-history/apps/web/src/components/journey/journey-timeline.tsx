"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Timeline overlay: jalan keluar universal dari penceritaan linear
 * (UX Bible bagian 9 dan 10).
 *
 * Ini SATU-SATUNYA island klien di Journey. Ia tidak merender sejarah — ia
 * hanya menavigasi ke anchor yang sudah ada di dokumen. Kalau JavaScript
 * gagal, tombolnya tidak muncul dan pengunjung memakai /explore/timeline,
 * yang memuat kronologi yang sama sebagai HTML biasa.
 *
 * Perilaku yang dijaga:
 *   - navigasi seketika, bukan perjalanan animasi tujuh abad;
 *   - anchor diperbarui, sehingga Back mengembalikan konteks yang tepat;
 *   - fokus dipindahkan ke judul scene tujuan;
 *   - Escape menutup, fokus kembali ke pemicunya;
 *   - tidak ada pembajakan tombol panah global.
 */
export interface TimelineEntry {
  readonly slug: string;
  readonly dateDisplay: string;
  readonly title: string;
  readonly actTitle: string;
  readonly isHero: boolean;
}

export function JourneyTimeline({
  entries,
}: {
  readonly entries: readonly TimelineEntry[];
}): ReactElement {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (eventArgs: KeyboardEvent) => {
      if (eventArgs.key === "Escape") {
        eventArgs.stopPropagation();
        close();
      }
    };
    // Hanya saat panel terbuka, dan hanya Escape: tidak ada penangkapan
    // tombol panah yang merampas navigasi pembaca layar.
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector("a")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const jump = useCallback((slug: string) => {
    setOpen(false);
    // getElementById, bukan querySelector: anchor scene dimulai dengan angka
    // (1135-panjalu-jayati) dan "#1135-..." bukan selector CSS yang sah.
    const target = document.getElementById(slug);
    if (!target) return;
    // Riwayat asli, bukan alam semesta navigasi buatan sendiri.
    window.history.pushState(null, "", `#${slug}`);
    target.scrollIntoView({ block: "start" });
    const heading = document.getElementById(`${slug}-title`);
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, []);

  return (
    <div className="journey-timeline">
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Timeline
      </button>

      {open ? (
        <div
          className="timeline-panel"
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Lompat ke satu masa"
        >
          <div className="timeline-panel-head">
            <h2 className="archive-label">Lompat ke satu masa</h2>
            <button type="button" onClick={close}>
              Tutup
            </button>
          </div>
          <ol className="timeline-list">
            {entries.map((entry) => (
              <li key={entry.slug} data-hero={entry.isHero ? "true" : "false"}>
                <a
                  href={`#${entry.slug}`}
                  onClick={(clickEvent) => {
                    clickEvent.preventDefault();
                    jump(entry.slug);
                  }}
                >
                  <span className="timeline-date">{entry.dateDisplay}</span>
                  <span className="timeline-title">{entry.title}</span>
                  <span className="timeline-act">{entry.actTitle}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
