"use client";

import { Send, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { KAYYISA_QUICK_PROMPTS } from "../lib/kayyisaGuide.ts";
import { useKayyisaChat } from "../lib/useKayyisaChat.ts";
import { renderKayyisaEmphasis } from "./KayyisaColumn.tsx";
import { Button } from "./ui/button.tsx";

/**
 * Kak Kayyisa FAB — arsip KayyisaAgent tanpa framer-motion.
 * CSS transitions + prefers-reduced-motion only.
 */
export function KayyisaAgent() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, busy, ask } = useKayyisaChat();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const log = listRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, busy, open]);

  const submit = (query: string) => {
    setInput("");
    void ask(query);
  };

  return (
    <div className="pointer-events-none fixed bottom-(--space-4) right-(--space-4) z-(--z-drawer) flex flex-col items-end gap-(--space-3)">
      {open ? (
        <section
          id={panelId}
          className="pointer-events-auto flex max-h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-control border border-line-subtle bg-canvas shadow-overlay motion-safe:animate-in motion-safe:fade-in"
          role="dialog"
          aria-modal="false"
          aria-label="Kak Kayyisa — panduan smartboard"
        >
          <header className="flex items-center justify-between border-b border-line-subtle bg-surface px-(--space-3) py-(--space-2)">
            <div>
              <div className="font-semibold text-primary">Kak Kayyisa</div>
              <div className="text-(length:--font-size-label) text-secondary">
                Panduan smartboard
              </div>
            </div>
            <button
              type="button"
              className="rounded-control p-(--space-2) text-secondary hover:bg-canvas"
              aria-label="Tutup Kak Kayyisa"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </header>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-(--space-3)"
            role="log"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "mb-(--space-3) ml-auto max-w-[90%] rounded-control bg-surface px-(--space-3) py-(--space-2) text-(length:--font-size-body) text-primary"
                    : "mb-(--space-3) mr-auto max-w-[90%] text-(length:--font-size-body) text-primary"
                }
              >
                <p>{renderKayyisaEmphasis(m.text)}</p>
                {m.topic?.link ? (
                  <Link
                    href={m.topic.link as Route}
                    className="mt-(--space-1) inline-block text-(length:--font-size-body-compact) text-accent-text underline"
                  >
                    {m.topic.linkLabel || "Buka →"}
                  </Link>
                ) : null}
              </div>
            ))}
            {busy ? (
              <p
                className="text-(length:--font-size-body) text-secondary"
                data-testid="kayyisa-thinking"
              >
                Sedang menyusun jawaban…
              </p>
            ) : null}
          </div>

          <div
            className="flex flex-wrap gap-(--space-2) border-t border-line-subtle px-(--space-3) py-(--space-2)"
            role="group"
            aria-label="Saran cepat"
          >
            {KAYYISA_QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="rounded-control border border-line-subtle bg-canvas px-(--space-2) py-(--space-1) text-(length:--font-size-body-compact) text-primary hover:bg-surface"
                onClick={() => submit(p.query)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <form
            className="flex gap-(--space-2) border-t border-line-subtle p-(--space-3)"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <label className="sr-only" htmlFor="kayyisa-fab-input">
              Tanya Kak Kayyisa
            </label>
            <input
              id="kayyisa-fab-input"
              ref={inputRef}
              className="min-h-(--target-min) min-w-0 flex-1 rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya fitur…"
              autoComplete="off"
              data-testid="kayyisa-fab-input"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim()}
              aria-label="Kirim"
              data-testid="kayyisa-fab-send"
            >
              <Send size={14} aria-hidden="true" />
            </Button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="pointer-events-auto inline-flex min-h-(--target-min) items-center gap-(--space-2) rounded-control border border-line-subtle bg-action px-(--space-4) text-action-text shadow-overlay transition-opacity duration-(--motion-duration-fast) hover:bg-action-hover motion-reduce:transition-none"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Tutup Kak Kayyisa" : "Buka Kak Kayyisa"}
        data-testid="kayyisa-fab"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hidden sm:inline">Kak Kayyisa</span>
        <span className="sm:hidden">Kayyisa</span>
      </button>
    </div>
  );
}
