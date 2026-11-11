"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { announceJourneyNavigation } from "./deep-link-landing";

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

    // Kunci gulir dokumen dan tandai latar belakang inert
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.dataset.timelineOpen = "true";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const mainContent = document.getElementById("smooth-wrapper");
    if (mainContent) {
      mainContent.setAttribute("inert", "");
      mainContent.setAttribute("aria-hidden", "true");
    }

    const panel = panelRef.current;
    const focusableElements = panel
      ? Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        )
      : [];

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const onKeyDown = (eventArgs: KeyboardEvent) => {
      if (eventArgs.key === "Escape") {
        eventArgs.stopPropagation();
        close();
        return;
      }

      if (eventArgs.key === "Tab" && focusableElements.length > 0) {
        if (eventArgs.shiftKey) {
          if (
            document.activeElement === firstFocusable ||
            document.activeElement === panel
          ) {
            eventArgs.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            eventArgs.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Fokus awal ke tautan pertama atau tombol tutup
    const initialFocusTarget =
      panel?.querySelector<HTMLElement>(".timeline-list a") ??
      panel?.querySelector<HTMLElement>("button");
    initialFocusTarget?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      delete document.body.dataset.timelineOpen;
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      if (mainContent) {
        mainContent.removeAttribute("inert");
        mainContent.removeAttribute("aria-hidden");
      }
    };
  }, [open, close]);

  const jump = useCallback((slug: string) => {
    setOpen(false);
    if (!document.getElementById(slug)) return;
    window.history.pushState(null, "", `#${slug}`);
    announceJourneyNavigation(slug);
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
          tabIndex={-1}
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
