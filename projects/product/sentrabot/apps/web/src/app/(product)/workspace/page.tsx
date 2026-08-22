"use client";

import Link from "next/link";
import { useState } from "react";
import { SENTRABOT_PERSONAS } from "../../../lib/personas.ts";

const defaultBots = SENTRABOT_PERSONAS.slice(0, 2).map((persona, index) => ({
  id: persona.id,
  name: persona.name,
  title: persona.title,
  status: index === 0 ? ("ready" as const) : ("running" as const),
}));

export default function WorkspacePage() {
  const [selectedId, setSelectedId] = useState(defaultBots[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const selected =
    defaultBots.find((bot) => bot.id === selectedId) ?? defaultBots[0];
  const visibleBots = defaultBots.filter((bot) =>
    `${bot.name} ${bot.title}`.toLowerCase().includes(query.toLowerCase()),
  );

  if (!selected) {
    return null;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <Link className="brand-link" href="/">
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            <span>Sentra Bot</span>
          </Link>
        </div>
        <span className="environment">
          <span
            className="status-glyph status-glyph--success"
            aria-hidden="true"
          >
            ●
          </span>{" "}
          SELF-HOST / SIGNUP TERTUTUP
        </span>
      </header>
      <div className="workspace-grid">
        <aside className="sidebar" aria-label="Navigasi bot">
          <div className="sidebar-heading">
            <span className="eyebrow">WORKSPACE</span>
            <span className="mono">LOKAL</span>
          </div>
          <label className="search-label" htmlFor="bot-search">
            Cari bot
          </label>
          <input
            id="bot-search"
            className="control"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nama atau tujuan"
          />
          <nav className="bot-list" aria-label="Bot">
            {visibleBots.map((bot) => (
              <button
                className={`bot-row ${selected.id === bot.id ? "bot-row--active" : ""}`}
                key={bot.id}
                onClick={() => setSelectedId(bot.id)}
                type="button"
              >
                <span className="bot-row-mark" aria-hidden="true">
                  {bot.name.slice(0, 1)}
                </span>
                <span className="bot-row-copy">
                  <strong>{bot.name}</strong>
                  <small>{bot.title}</small>
                </span>
                <span
                  role="img"
                  className={`status-glyph status-glyph--${bot.status === "running" ? "accent" : "neutral"}`}
                  aria-label={bot.status}
                >
                  ●
                </span>
              </button>
            ))}
          </nav>
          <Link
            className="button button--outline sidebar-action"
            href="/intake"
          >
            + Persona baru
          </Link>
        </aside>
        <section className="conversation" aria-labelledby="bot-title">
          <div className="conversation-header">
            <div>
              <p className="eyebrow">BOT AKTIF / {selected.id.toUpperCase()}</p>
              <h1 id="bot-title">{selected.name}</h1>
              <p>{selected.title}</p>
            </div>
            <span className="status-word">
              <span
                className="status-glyph status-glyph--success"
                aria-hidden="true"
              >
                ●
              </span>
              SIAP
            </span>
          </div>
          <div className="message-stream" aria-live="polite">
            <div className="message message--system">
              <span className="message-seq mono">001</span>
              <div>
                <strong>Sesi siap</strong>
                <p>
                  Eksekusi dibatasi pada workspace ini. Kredensial provider
                  tetap di server.
                </p>
              </div>
            </div>
            <div className="message">
              <span className="message-seq mono">002</span>
              <div>
                <strong>Apa yang harus dikerjakan?</strong>
                <p>
                  Kirim prompt untuk memulai run. Status persetujuan dan
                  takeover muncul di sini.
                </p>
              </div>
            </div>
          </div>
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (message.trim()) setMessage("");
            }}
          >
            <label htmlFor="prompt">Prompt</label>
            <textarea
              id="prompt"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Jelaskan tugas terbatas berikutnya"
              rows={3}
            />
            <div className="composer-footer">
              <span className="helper">
                Kunci provider tidak disimpan di browser.
              </span>
              <button
                className="button button--primary"
                type="submit"
                disabled={!message.trim()}
              >
                Jalankan <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </section>
        <aside className="context-panel" aria-label="Konteks run">
          <p className="eyebrow">KONTEKS RUN</p>
          <dl className="facts">
            <div>
              <dt>MODE</dt>
              <dd>TEAM COMPUTER</dd>
            </div>
            <div>
              <dt>PROVIDER</dt>
              <dd>BYOK / BELUM TERHUBUNG</dd>
            </div>
            <div>
              <dt>MEMORI</dt>
              <dd>
                MEMORY.md{" "}
                <span
                  role="img"
                  className="status-glyph status-glyph--success"
                  aria-label="tersedia"
                >
                  ●
                </span>
              </dd>
            </div>
          </dl>
          <div className="context-note">
            <span
              className="status-glyph status-glyph--neutral"
              aria-hidden="true"
            >
              ○
            </span>
            <p>Run, artefak, dan rutinitas tetap dalam scope workspace Anda.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
