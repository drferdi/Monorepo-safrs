"use client";

import { Maximize2, Minimize2, Send } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import type { GuideTopic } from "../lib/kayyisaGuide.ts";
import { KAYYISA_QUICK_PROMPTS } from "../lib/kayyisaGuide.ts";
import { useKayyisaChat } from "../lib/useKayyisaChat.ts";
import { TerminalPanel, WindowLights } from "./TerminalPanel.tsx";
import { Button } from "./ui/button.tsx";

/** Guide replies mark emphasis with `**…**`; nothing else is parsed. */
export function renderKayyisaEmphasis(text: string): ReactNode {
  // Key each part by its character offset in the text: unique once empty parts are dropped.
  let offset = 0;
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => {
      const key = offset;
      offset += part.length;
      return part.startsWith("**") && part.endsWith("**") ? (
        <strong key={key}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={key}>{part}</Fragment>
      );
    });
}

function TopicLink({ topic }: { topic: GuideTopic }) {
  if (!topic.link) return null;
  return (
    <Link
      href={topic.link as Route}
      className="mt-(--space-1) inline-block text-(length:--font-size-body-compact) text-accent-text underline"
    >
      {topic.linkLabel || "Buka →"}
    </Link>
  );
}

/**
 * Kak Kayyisa as a column on the smartboard (arsip KayyisaColumn).
 * Shares useKayyisaChat with the FAB so answers stay consistent.
 */
export function KayyisaColumn() {
  const [input, setInput] = useState("");
  const [tall, setTall] = useState(false);
  const { messages, busy, ask } = useKayyisaChat();
  const logRef = useRef<HTMLDivElement>(null);

  // Follow the conversation: scroll to the newest message or the thinking line.
  useEffect(() => {
    const log = logRef.current;
    if (!log || (messages.length === 0 && !busy)) return;
    log.scrollTop = log.scrollHeight;
  }, [messages, busy]);

  const submit = (query: string) => {
    setInput("");
    void ask(query);
  };

  return (
    <TerminalPanel
      seq="01"
      module="KAYYISA"
      meta="Panduan"
      title="Kak Kayyisa"
      labelledBy="kayyisa-column-title"
      testId="kayyisa-column"
    >
      <div className="mb-(--space-2) flex items-center justify-end">
        <button
          type="button"
          className="rounded-control p-(--space-2) text-secondary hover:bg-surface"
          onClick={() => setTall((v) => !v)}
          aria-pressed={tall}
          aria-label={
            tall ? "Perkecil kotak percakapan" : "Perbesar kotak percakapan"
          }
          title={tall ? "Perkecil" : "Perbesar"}
          data-testid="kayyisa-resize"
        >
          {tall ? (
            <Minimize2 size={14} aria-hidden="true" />
          ) : (
            <Maximize2 size={14} aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        className={
          tall
            ? "mb-(--space-3) max-h-96 overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-3)"
            : "mb-(--space-3) max-h-56 overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-3)"
        }
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Percakapan"
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
            {m.topic ? <TopicLink topic={m.topic} /> : null}
            {m.citations && m.citations.length > 0 ? (
              <ul
                className="mt-(--space-2) list-disc pl-(--space-4) text-(length:--font-size-body-compact) text-secondary"
                data-testid="kayyisa-citations"
              >
                {m.citations.map((c) => (
                  <li key={`${c.document}-${c.subject}-${c.phase}`}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-text underline"
                    >
                      {c.document} · {c.subject} fase {c.phase}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        {busy ? (
          <div
            className="text-(length:--font-size-body) text-secondary"
            data-testid="kayyisa-thinking"
          >
            Sedang menyusun jawaban…
          </div>
        ) : null}
      </div>

      <fieldset
        className="min-w-0 mb-(--space-3) flex flex-wrap gap-(--space-2)"
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
      </fieldset>

      <form
        className="flex gap-(--space-2)"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <label className="sr-only" htmlFor="kayyisa-column-input">
          Tanya Kak Kayyisa
        </label>
        <input
          id="kayyisa-column-input"
          className="min-h-(--target-min) min-w-0 flex-1 rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya fitur smartboard…"
          autoComplete="off"
          data-testid="kayyisa-input"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim()}
          aria-label="Kirim"
          data-testid="kayyisa-send"
        >
          <Send size={14} aria-hidden="true" />
        </Button>
      </form>
      {/* WindowLights kept available for chrome parity consumers */}
      <span className="sr-only">
        <WindowLights />
      </span>
    </TerminalPanel>
  );
}
