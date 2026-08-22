"use client";

import { useMemo, useState } from "react";

import { actionStatus } from "../lib/action-status";
import { ACTIONS, actionById } from "../lib/actions";
import { mergeAgentRows } from "../lib/agents-view";
import {
  AGENTS,
  KNOWLEDGE,
  PACKAGES,
  PROJECTS,
  RISK_COPY,
  SAFETY_LABEL,
  STATUS_LABEL,
  TASK_STATES,
  UNUSED_PACKS,
} from "../lib/catalog";
import {
  type ControlAction,
  type LiveFeature,
  type LiveSnapshot,
  NAV,
  type NavId,
  type RiskTier,
  SITE,
} from "../lib/control-center";
import { RECOVERY_COMMAND, runnableById } from "../lib/exec/commands";
import { runCommand } from "../lib/exec/run";

const LIVE_STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  "partially-connected": "Partially connected",
  "not-yet-connected": "Not yet connected",
  "requires-configuration": "Requires configuration",
  "requires-human-action": "Requires human action",
  error: "Error",
};

/** Attention first: an operator should not have to hunt for what is wrong. */
const LIVE_STATUS_ORDER = [
  "error",
  "requires-human-action",
  "requires-configuration",
  "partially-connected",
  "not-yet-connected",
  "connected",
];

/**
 * Machine identities that commit to this repository. Matching on the author
 * name is a heuristic, not an authority — a human can set any name — so the
 * count is presented as an observation about names, never as a security claim.
 */
const AGENT_AUTHORS = /codex|claude|cursor|droid|agent|bot/i;

function liveStatusClass(status: string) {
  if (status === "error") return "status status--fail";
  if (status === "connected") return "status status--pass";
  return "status status--warn";
}

function byAttention(a: LiveFeature, b: LiveFeature) {
  const delta =
    LIVE_STATUS_ORDER.indexOf(a.status) - LIVE_STATUS_ORDER.indexOf(b.status);
  return delta !== 0 ? delta : a.name.localeCompare(b.name, "id");
}

const HOME_ACTION_IDS = [
  "doctor",
  "status",
  "setup",
  "dev",
  "test",
  "deploy-production",
] as const;

function SentraMark() {
  return (
    <svg className="mark" viewBox="0 0 1000 1000" aria-hidden="true">
      <g transform="translate(106.54 60.00) scale(1.08241) translate(-270 -227)">
        <path
          className="mk-accent"
          d="M890.70 227.38 L766.99 226.87 L262.40 626.09 L386.11 626.60 Z"
        />
        <path
          className="mk-body"
          d="M262.23 869.92 L754.48 480.46 L753.02 478.60 A146.02 146.02 0 0 1 934.22 707.63 L932.76 705.78 L509.10 1040.97 L385.39 1040.45 L884.88 645.26 L880.54 639.78 A59.50 59.50 0 0 0 806.71 546.46 L802.36 540.97 L385.94 870.44 Z"
        />
      </g>
    </svg>
  );
}

/**
 * Run control.
 *
 * Only renders a live button when the action's id is in the allowlist. Anything
 * else keeps the honest disabled state — the board does not pretend it can run
 * what it has not been given permission to run.
 *
 * A mutating command shows its effect and demands the exact confirmation phrase
 * before the button enables. The phrase is compared on the server too; this is
 * the explanation, not the gate.
 */
function RunControl({ action }: { action: ControlAction }) {
  const runnable = runnableById(action.id);
  const [phase, setPhase] = useState<
    "ready" | "confirming" | "running" | "done"
  >("ready");
  const [typed, setTyped] = useState("");
  const [outcome, setOutcome] = useState<{
    ok: boolean;
    summary: string;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
  } | null>(null);

  if (!runnable) {
    return (
      <button type="button" className="btn" disabled aria-disabled="true">
        Tidak tersedia di sini
      </button>
    );
  }

  const command = runnable;
  const needsPhrase = command.mutation && command.confirmPhrase !== undefined;

  async function run() {
    setPhase("running");
    setOutcome(null);
    const result = await runCommand(command.id, typed);
    setOutcome(result);
    setPhase("done");
  }

  // The first button is always live. A mutating command opens its confirmation
  // on press rather than sitting disabled behind a phrase nobody has read yet —
  // a board whose every button is greyed out reads as broken, and the operator
  // cannot tell a safeguard from a defect.
  function press() {
    if (needsPhrase && phase !== "confirming") {
      setPhase("confirming");
      return;
    }
    void run();
  }

  const confirmed = !needsPhrase || typed === command.confirmPhrase;

  return (
    <div className="stack">
      <div className="actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={press}
          disabled={phase === "running"}
          aria-disabled={phase === "running"}
        >
          {phase === "running" ? "Sedang berjalan…" : command.label}
        </button>
        <span className="rulelabel">
          {command.risk} · batas {Math.round(command.timeoutMs / 1000)}s
        </span>
      </div>

      {phase === "confirming" ? (
        <div className="verdictline verdictline--warn">
          <p className="t-label">Konfirmasi diperlukan</p>
          <p
            className="t-compact"
            style={{ marginTop: "var(--space-2)", maxWidth: "68ch" }}
          >
            {command.effect}
          </p>
          <label className="field" style={{ marginTop: "var(--space-3)" }}>
            <span
              className="t-compact"
              style={{ display: "block", marginBottom: "var(--space-2)" }}
            >
              Ketik persis untuk mengizinkan: {command.confirmPhrase}
            </span>
            <input
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={command.confirmPhrase}
              spellCheck={false}
            />
          </label>
          <div className="actions" style={{ marginTop: "var(--space-3)" }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void run()}
              disabled={!confirmed}
              aria-disabled={!confirmed}
            >
              Jalankan sekarang
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPhase("ready");
                setTyped("");
              }}
            >
              Batal
            </button>
          </div>
        </div>
      ) : null}

      {phase !== "confirming" ? (
        <p className="t-compact muted" style={{ maxWidth: "68ch" }}>
          {command.effect}
        </p>
      ) : null}

      {phase === "running" ? (
        <p className="t-compact muted" aria-live="polite">
          Perintah dijalankan di repository ini. Progresnya tidak bisa diukur,
          jadi tidak ada bar yang digerakkan.
        </p>
      ) : null}

      {outcome ? (
        <div
          className={
            outcome.ok
              ? "verdictline verdictline--pass"
              : "verdictline verdictline--fail"
          }
          aria-live="polite"
        >
          <p className="t-label">
            {outcome.ok ? "Berhasil" : "Gagal"} · {outcome.durationMs} ms
            {outcome.exitCode === null ? "" : ` · exit ${outcome.exitCode}`}
          </p>
          <p className="t-compact" style={{ marginTop: "var(--space-2)" }}>
            {outcome.summary}
          </p>
          {outcome.stdout ? (
            <details className="disclosure">
              <summary>Keluaran</summary>
              <pre>{outcome.stdout}</pre>
            </details>
          ) : null}
          {outcome.stderr ? (
            <details className="disclosure">
              <summary>Keluaran kesalahan</summary>
              <pre>{outcome.stderr}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RunStep({ id }: { id: string }) {
  const command = runnableById(id);
  if (!command) {
    return null;
  }
  return (
    <RunControl
      action={
        {
          id: command.id,
          name: command.label,
          risk: command.risk,
        } as ControlAction
      }
    />
  );
}

function ActionPanel({
  action,
  onOpen,
  selected,
}: {
  action: ControlAction;
  onOpen: (id: string) => void;
  selected: boolean;
}) {
  return (
    <article className={selected ? "panel panel--active" : "panel"}>
      <div className="panel__body">
        <p className="t-label">
          {action.risk} · {SAFETY_LABEL[action.safety]}
        </p>
        <h3>{action.name}</h3>
        <p className="t-compact muted">{action.purpose}</p>
        <p>
          <span
            className={
              actionStatus(action.id) === "available"
                ? "status status--pass"
                : "status status--idle"
            }
          >
            {STATUS_LABEL[actionStatus(action.id)]}
          </span>
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={() => onOpen(action.id)}
          >
            {selected ? "Hide explanation" : "Review decision"}
          </button>
        </div>
        <div style={{ marginTop: "var(--space-4)" }}>
          <RunControl action={action} />
        </div>
        {selected ? <ActionDisclosure action={action} /> : null}
      </div>
    </article>
  );
}

function ActionDisclosure({ action }: { action: ControlAction }) {
  return (
    <div className="stack">
      <div className="notice">
        <strong>What this is.</strong> {action.purpose}
        <br />
        <strong>Why it is used.</strong> {action.why}
        <br />
        <strong>Is it safe?</strong> {action.approval} Effect: {action.effect}
        <br />
        <strong>If it were run.</strong> {action.expected}
        <br />
        <strong>Result here.</strong> {STATUS_LABEL[actionStatus(action.id)]}.
        <br />
        <strong>Next.</strong> {action.next}
      </div>
      <details className="disclosure">
        <summary>Details</summary>
        <dl className="factlist">
          <div>
            <dt>Risk</dt>
            <dd>{action.risk}</dd>
          </div>
          <div>
            <dt>Safety class</dt>
            <dd>{SAFETY_LABEL[action.safety]}</dd>
          </div>
          <div>
            <dt>Mutation</dt>
            <dd>{action.mutation ? "Changes state" : "Read only"}</dd>
          </div>
          <div>
            <dt>Time limit</dt>
            <dd>{action.timeout}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{action.source}</dd>
          </div>
        </dl>
        <p className="t-compact muted">{action.confirmation}</p>
      </details>
      <details className="disclosure">
        <summary>Advanced</summary>
        <pre>{action.command}</pre>
      </details>
    </div>
  );
}

/**
 * The next steps are derived, never authored.
 *
 * Each one comes from something just read: a readiness check that is blocking,
 * a feature whose code sits on an unmerged branch, a catalog entry pointing at
 * nothing, an uncommitted working tree. If the repository has nothing pending,
 * the list is genuinely empty and says so — a report, not an invitation.
 *
 * Order is real information here, so the entries carry sequence markers: what
 * blocks the machine comes before what waits on a decision, because a decision
 * taken on a machine that cannot run is a decision taken blind.
 */
type NextStep = {
  id: string;
  title: string;
  why: string;
  /** Shown as the equivalent terminal command, for the operator who wants it. */
  command: string | null;
  /** Allowlisted command that performs this step, when one can. */
  runId: string | null;
  /** Stated when no button can exist, so the gap is explicit. */
  humanOnly: string | null;
  risk: RiskTier;
};

function deriveNextSteps(live: LiveSnapshot): NextStep[] {
  const steps: NextStep[] = [];

  // 1. Anything blocking the machine. Docker first: it is the prerequisite the
  //    database, Postgres, and Prisma checks all wait on.
  const blocked = live.health.available
    ? live.health.checks.filter((check) => !check.ok)
    : [];
  const dockerFirst = [...blocked].sort((a, b) => {
    const rank = (area: string) => (area === "DOCKER" ? 0 : 1);
    return rank(a.area) - rank(b.area);
  });

  for (const check of dockerFirst) {
    const runId = RECOVERY_COMMAND[check.id] ?? null;
    steps.push({
      id: `health-${check.id}`,
      title: check.recovery || check.summary,
      why: `${check.area}: ${check.summary} Selama ini belum beres, ${blocked.length} pemeriksaan kesiapan tetap terhalang.`,
      command: null,
      runId,
      humanOnly: runId
        ? null
        : "Langkah ini harus Anda lakukan sendiri di komputer — tidak ada perintah yang bisa menggantikannya.",
      risk: check.severity === "unsafe" ? "R2" : "R1",
    });
  }

  // 2. Work that exists but waits on a human decision.
  for (const feature of live.features) {
    if (feature.status === "requires-human-action") {
      steps.push({
        id: `decision-${feature.id}`,
        title: `Putuskan penggabungan ${feature.name}`,
        why: feature.statusReason,
        command: feature.branch ? `git merge ${feature.branch}` : null,
        runId: null,
        humanOnly:
          "Penggabungan adalah keputusan manusia bertingkat R2. Papan ini menyiapkannya, tidak pernah menjalankannya.",
        risk: feature.risk,
      });
    }
  }

  // 3. Defects in the board's own catalog. These are ours to fix, not Chief's.
  for (const feature of live.features) {
    if (feature.status === "error") {
      steps.push({
        id: `defect-${feature.id}`,
        title: `Perbaiki katalog untuk ${feature.name}`,
        why: feature.statusReason,
        command: null,
        runId: null,
        humanOnly:
          "Cacat ini ada di katalog papan ini sendiri, jadi perbaikannya lewat perubahan kode.",
        risk: "R1",
      });
    }
  }

  // 4. Housekeeping that blocks governance from passing.
  if (live.dirtyPaths > 0) {
    steps.push({
      id: "dirty-tree",
      title: "Simpan atau kembalikan perubahan yang belum di-commit",
      why: `${live.dirtyPaths} berkas berubah di working tree. Pemeriksa kepemilikan task menolak perubahan yang tidak dimiliki task aktif, sehingga tata kelola tidak akan lolos.`,
      command: "pnpm task claim",
      runId: null,
      humanOnly:
        "Klaim task membutuhkan id, judul, dan cakupan yang hanya Anda ketahui, jadi tidak bisa dijalankan dari satu tombol.",
      risk: "R1",
    });
  }

  return steps;
}

function HomeSection({
  selectedAction,
  onOpen,
  live,
}: {
  selectedAction: string | null;
  onOpen: (id: string) => void;
  live: LiveSnapshot;
}) {
  const actions = HOME_ACTION_IDS.map((id) => actionById(id)).filter(
    (action): action is ControlAction => Boolean(action),
  );

  const attention = live.features
    .filter((feature) => feature.status !== "connected")
    .sort(byAttention);

  const nextSteps = deriveNextSteps(live);
  const library = live.library;

  return (
    <>
      <header className="pagehead grid">
        <div className="pagehead__id">
          <p className="t-label">Command Center</p>
          <h1 className="t-display">{SITE.title}</h1>
          <p
            className="muted"
            style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}
          >
            {SITE.promise}
          </p>
        </div>
        <div className="pagehead__verdict">
          <div className="verdict">
            <p className="t-label">Current declaration</p>
            <p className="verdict__word">{SITE.declaration}</p>
            <p
              className="t-compact muted"
              style={{ marginTop: "var(--space-3)" }}
            >
              Controlled, Secure, and Regulated are not claimed. The main branch
              is not yet proven to be protected.
            </p>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="alert">
          <h2>Board limits</h2>
          <p>{SITE.honesty}</p>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Repository, as read just now</h2>
          <span className="rulelabel">
            {live.gitAvailable
              ? `${live.branch} · ${live.head}`
              : "Git unavailable"}
          </span>
        </div>
        <div className="grid">
          <div className="span-7">
            <div className="locked">
              <p className="t-label">Read from disk and git</p>
              <dl className="factlist">
                <div>
                  <dt>Working tree</dt>
                  <dd>{live.dirtyPaths} changed paths</dd>
                </div>
                <div>
                  <dt>Checkout</dt>
                  <dd>{live.repoRoot}</dd>
                </div>
                <div>
                  <dt>Features registered</dt>
                  <dd>{live.features.length}</dd>
                </div>
                <div>
                  <dt>Need attention</dt>
                  <dd>{attention.length}</dd>
                </div>
                <div>
                  <dt>Unmerged branches</dt>
                  <dd>{live.unmergedBranches.length}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="span-4">
            <div className="locked">
              <p className="t-label">Not on main</p>
              <dl className="factlist" style={{ marginTop: "var(--space-3)" }}>
                {live.unmergedBranches.length === 0 ? (
                  <div>
                    <dt>Everything local is on main</dt>
                    <dd>0</dd>
                  </div>
                ) : (
                  live.unmergedBranches.map((item) => (
                    <div key={item.name}>
                      <dt>{item.name}</dt>
                      <dd>{item.commitsAhead}</dd>
                    </div>
                  ))
                )}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {attention.length > 0 ? (
        <section className="section">
          <div className="section__head">
            <h2 className="t-section">What needs attention</h2>
            <span className="rulelabel">
              Derived from evidence, not hand-authored
            </span>
          </div>
          <div className="grid">
            <div className="span-7 stack">
              {attention.map((feature) => (
                <div className="rule" key={feature.id}>
                  <p className="t-label">
                    {feature.risk} · {feature.area}
                  </p>
                  <h3>{feature.name}</h3>
                  <p className="t-compact muted">{feature.purpose}</p>
                  <p style={{ marginTop: "var(--space-3)" }}>
                    <span className={liveStatusClass(feature.status)}>
                      {LIVE_STATUS_LABEL[feature.status] ?? feature.status}
                    </span>
                  </p>
                  <p
                    className="t-compact"
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    {feature.statusReason}
                  </p>
                  {feature.caveat ? (
                    <p
                      className="t-compact muted"
                      style={{ marginTop: "var(--space-2)", maxWidth: "68ch" }}
                    >
                      {feature.caveat}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <aside className="span-4">
              <div className="locked">
                <p className="t-label">Pustaka Medis</p>
                {library.available ? (
                  <>
                    <dl
                      className="factlist"
                      style={{ marginTop: "var(--space-3)" }}
                    >
                      <div>
                        <dt>Siap dipakai</dt>
                        <dd>{library.readyToUse ?? "belum diketahui"}</dd>
                      </div>
                      <div>
                        <dt>Sudah diproses</dt>
                        <dd>{library.canonicalDocuments ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Belum diproses</dt>
                        <dd>{library.notYetParsed ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Gagal</dt>
                        <dd>{library.failed}</dd>
                      </div>
                      <div>
                        <dt>PDF sumber</dt>
                        <dd>{library.sourcePdfs ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Tercatat di manifest</dt>
                        <dd>{library.manifestEntries}</dd>
                      </div>
                    </dl>
                    {library.readyUnknownReason ? (
                      <p
                        className="t-compact"
                        style={{
                          marginTop: "var(--space-4)",
                          maxWidth: "44ch",
                        }}
                      >
                        {library.readyUnknownReason}
                      </p>
                    ) : (
                      <p
                        className="t-compact muted"
                        style={{
                          marginTop: "var(--space-4)",
                          maxWidth: "44ch",
                        }}
                      >
                        Menghitung dokumen yang tercatat, lolos parse, dan lolos
                        gerbang mutu.
                      </p>
                    )}
                    {library.failures.length > 0 ? (
                      <details
                        className="disclosure"
                        style={{ marginTop: "var(--space-3)" }}
                      >
                        <summary>
                          Yang gagal ({library.failures.length})
                        </summary>
                        {library.failures.map((failure) => (
                          <p className="t-compact" key={failure.docId}>
                            <strong>{failure.docId}</strong> — {failure.error}
                          </p>
                        ))}
                      </details>
                    ) : null}
                    {library.problems.map((problem) => (
                      <p
                        className="t-compact"
                        key={problem}
                        style={{
                          marginTop: "var(--space-3)",
                          maxWidth: "44ch",
                        }}
                      >
                        {problem}
                      </p>
                    ))}
                  </>
                ) : (
                  <p
                    className="t-compact muted"
                    style={{ marginTop: "var(--space-3)", maxWidth: "44ch" }}
                  >
                    {library.problems[0]}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {live.problems.length > 0 ? (
        <section className="section">
          <div className="alert">
            <h2>Problems while reading the repository</h2>
            <ul>
              {live.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Next steps</h2>
          <span className="rulelabel">
            {nextSteps.length === 0
              ? "Nothing pending"
              : `${nextSteps.length} derived from this reading`}
          </span>
        </div>

        {nextSteps.length === 0 ? (
          <div className="grid">
            <div className="span-7">
              <p>Tidak ada langkah yang tertunda.</p>
              <p
                className="t-compact muted"
                style={{ marginTop: "var(--space-3)" }}
              >
                Mesin siap, tidak ada keputusan yang menunggu, dan working tree
                bersih. Langkah baru akan muncul di sini sendiri ketika sebuah
                pemeriksaan gagal atau pekerjaan baru menunggu keputusan.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid">
            <div className="span-7 stack">
              {nextSteps.map((step, index) => (
                <div className="rule" key={step.id}>
                  <p className="t-label">
                    <span className="seq">
                      {String(index + 1).padStart(2, "0")}
                    </span>{" "}
                    {step.risk}
                  </p>
                  <h3>{step.title}</h3>
                  <p
                    className="t-compact muted"
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    {step.why}
                  </p>
                  {step.command ? (
                    <p
                      className="t-data"
                      style={{ marginTop: "var(--space-3)" }}
                    >
                      {step.command}
                    </p>
                  ) : null}
                  {step.runId ? (
                    <div style={{ marginTop: "var(--space-4)" }}>
                      <RunStep id={step.runId} />
                    </div>
                  ) : (
                    <p
                      className="t-compact muted"
                      style={{ marginTop: "var(--space-3)", maxWidth: "68ch" }}
                    >
                      {step.humanOnly}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <aside className="span-4">
              <div className="locked">
                <p className="t-label">Where these come from</p>
                <dl
                  className="factlist"
                  style={{ marginTop: "var(--space-3)" }}
                >
                  <div>
                    <dt>Readiness checks blocking</dt>
                    <dd>
                      {live.health.available
                        ? live.health.checks.filter((check) => !check.ok).length
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Decisions waiting</dt>
                    <dd>
                      {
                        live.features.filter(
                          (feature) =>
                            feature.status === "requires-human-action",
                        ).length
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Catalog defects</dt>
                    <dd>
                      {
                        live.features.filter(
                          (feature) => feature.status === "error",
                        ).length
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Uncommitted paths</dt>
                    <dd>{live.dirtyPaths}</dd>
                  </div>
                </dl>
                <p
                  className="t-compact muted"
                  style={{ marginTop: "var(--space-4)", maxWidth: "44ch" }}
                >
                  Setiap langkah di kiri berasal dari salah satu hitungan ini.
                  Tidak ada yang ditulis tangan — perbaiki penyebabnya, dan
                  langkahnya hilang sendiri.
                </p>
              </div>
            </aside>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Actions that are safe to understand</h2>
          <span className="rulelabel">Not executed here</span>
        </div>
        <div className="grid">
          {actions.map((action) => (
            <div className="span-7" key={action.id}>
              <ActionPanel
                action={action}
                onOpen={onOpen}
                selected={selectedAction === action.id}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ProjectsSection({
  selectedAction,
  onOpen,
  live,
}: {
  selectedAction: string | null;
  onOpen: (id: string) => void;
  live: LiveSnapshot;
}) {
  const projectActions = ACTIONS.filter((action) =>
    ["dev", "test", "capability-preview", "capability-apply"].includes(
      action.id,
    ),
  );

  const workspace = live.workspace;
  const byReach = [...workspace.members].sort(
    (a, b) => b.blastRadius.length - a.blastRadius.length,
  );

  return (
    <>
      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Repository map</h2>
          <span className="rulelabel">
            Read from pnpm-workspace.yaml and every package.json
          </span>
        </div>

        <div className="grid">
          <div className="span-7">
            <div className="locked">
              <p className="t-label">Workspace members</p>
              <dl className="factlist">
                {workspace.groups.map((group) => (
                  <div key={group.group}>
                    <dt>{group.group}</dt>
                    <dd>{group.count}</dd>
                  </div>
                ))}
                <div>
                  <dt>Total</dt>
                  <dd>{workspace.members.length}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="span-4">
            <div className="locked">
              <p className="t-label">Widest reach</p>
              <dl className="factlist" style={{ marginTop: "var(--space-3)" }}>
                {byReach.slice(0, 4).map((member) => (
                  <div key={member.name}>
                    <dt>{member.name}</dt>
                    <dd>{member.blastRadius.length}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {workspace.problems.length > 0 ? (
          <div className="notice">
            {workspace.problems.map((problem) => (
              <p key={problem}>{problem}</p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Blast radius</h2>
          <span className="rulelabel">What moves when one member changes</span>
        </div>
        <p className="t-compact muted">
          The question only a monorepo has. Change a member here and everything
          in its reach column is affected — that is the number to know before
          approving a change to a shared package.
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Location</th>
                <th>Reach</th>
                <th>Affected</th>
                <th>Depends on</th>
              </tr>
            </thead>
            <tbody>
              {byReach.map((member) => (
                <tr key={member.name}>
                  <td>{member.name}</td>
                  <td>{member.path}</td>
                  <td>{member.blastRadius.length}</td>
                  <td>
                    {member.blastRadius.length === 0
                      ? "Nothing depends on it"
                      : member.blastRadius.join(", ")}
                  </td>
                  <td>
                    {member.dependsOn.length === 0
                      ? "No workspace dependency"
                      : member.dependsOn.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <header className="pagehead grid">
        <div className="pagehead__id">
          <p className="t-label">Projects</p>
          <h1 className="t-page">One product capsule, one template</h1>
          <p
            className="muted"
            style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}
          >
            Only Golden Path is a real product. The capsule template is
            governance scaffolding, not a second application.
          </p>
        </div>
      </header>
      <section className="section">
        <div className="grid">
          {PROJECTS.map((project) => (
            <article className="span-7 panel" key={project.id}>
              <div className="panel__body">
                <p className="t-label">{project.kind}</p>
                <h2>{project.name}</h2>
                <p>{project.purpose}</p>
                <p className="t-compact muted">{project.boundary}</p>
                <dl className="factlist">
                  <div>
                    <dt>Recorded state</dt>
                    <dd>{project.state}</dd>
                  </div>
                  <div>
                    <dt>Owner</dt>
                    <dd>{project.owner}</dd>
                  </div>
                </dl>
                {project.capabilities.length ? (
                  <ul className="stack">
                    {project.capabilities.map((item) => (
                      <li className="t-compact" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="t-compact muted">{project.notes}</p>
                {project.commands.length ? (
                  <details className="disclosure">
                    <summary>Advanced</summary>
                    <pre>{project.commands.join("\n")}</pre>
                  </details>
                ) : null}
              </div>
            </article>
          ))}
          <aside className="span-4 stack">
            <article className="panel">
              <div className="panel__body">
                <p className="t-label">Shared packages</p>
                <ul className="stack">
                  {PACKAGES.map((item) => (
                    <li key={item.id}>
                      <strong>{item.name}</strong>
                      <p className="t-compact muted">{item.purpose}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
            <article className="panel">
              <div className="panel__body">
                <p className="t-label">Optional unused packages</p>
                <p className="t-compact muted">
                  {UNUSED_PACKS.join(", ")}. Recorded as reserves, not live
                  capability.
                </p>
              </div>
            </article>
          </aside>
        </div>
      </section>
      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Project actions</h2>
          <span className="rulelabel">Allowlist only</span>
        </div>
        <div className="stack">
          {projectActions.map((action) => (
            <ActionPanel
              key={action.id}
              action={action}
              onOpen={onOpen}
              selected={selectedAction === action.id}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function AgentsSection({ live }: { live: LiveSnapshot }) {
  const rows = mergeAgentRows(
    AGENTS,
    live.roles.available ? live.roles.roles : {},
  );

  return (
    <>
      <header className="pagehead grid">
        <div className="pagehead__id">
          <p className="t-label">Agents</p>
          <h1 className="t-page">Capability is not authority</h1>
          <p
            className="muted"
            style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}
          >
            Human roles and automation identities are kept separate. No agent
            may deploy production from this board.
          </p>
        </div>
      </header>
      {!live.roles.available ? (
        <p className="t-compact muted">
          .safrs/policy.json tidak terbaca di checkout ini — kolom May memakai
          teks katalog, bukan kebijakan live.
        </p>
      ) : null}
      <section className="section">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>May</th>
                <th>May not</th>
                <th>Limit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((agent) => (
                <tr key={agent.id}>
                  <td>
                    <strong>{agent.name}</strong>
                    <p className="t-compact muted">{agent.purpose}</p>
                  </td>
                  <td>{agent.kind === "role" ? "Role" : "Automation"}</td>
                  <td>
                    {agent.may}
                    {agent.fromPolicy ? (
                      <p className="t-compact muted">
                        Dibaca dari .safrs/policy.json
                      </p>
                    ) : null}
                  </td>
                  <td>{agent.mayNot}</td>
                  <td>{agent.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TasksSection({
  selectedAction,
  onOpen,
  live,
}: {
  selectedAction: string | null;
  onOpen: (id: string) => void;
  live: LiveSnapshot;
}) {
  const plane = live.plane;
  const taskActions = ACTIONS.filter((action) =>
    [
      "doctor",
      "setup",
      "dev",
      "test",
      "lint",
      "typecheck",
      "build",
      "check",
      "supply-chain",
      "saf-gate-all",
      "governance",
      "db-start",
      "db-stop",
      "db-migrate",
      "db-seed",
      "db-reset",
      "db-studio",
      "task-list",
      "task-claim",
      "task-state",
      "task-close",
      "deploy-production",
    ].includes(action.id),
  );

  return (
    <>
      {plane.available ? (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Task registry, as recorded now</h2>
              <span className="rulelabel">
                Read through tools/status, not re-implemented here
              </span>
            </div>
            <div className="grid">
              <div className="span-7">
                <div className="tablewrap">
                  <table>
                    <caption className="sr-only">Recorded tasks</caption>
                    <thead>
                      <tr>
                        <th scope="col">Task</th>
                        <th scope="col">State</th>
                        <th scope="col">Risk</th>
                        <th scope="col">Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plane.tasks.map((task) => (
                        <tr key={task.id}>
                          <th scope="row">{task.title}</th>
                          <td>
                            <span
                              className={
                                task.state === "CLOSED" ||
                                task.state === "MERGED"
                                  ? "status status--pass"
                                  : task.state === "FAILED" ||
                                      task.state === "CONFLICT"
                                    ? "status status--fail"
                                    : task.state === "ABORTED"
                                      ? "status status--idle"
                                      : "status status--warn"
                              }
                            >
                              {task.state}
                            </span>
                          </td>
                          <td className="num">{task.risk}</td>
                          <td>{task.owner_label ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="span-4">
                <div className="locked">
                  <p className="t-label">Counted</p>
                  <dl
                    className="factlist"
                    style={{ marginTop: "var(--space-3)" }}
                  >
                    <div>
                      <dt>Recorded</dt>
                      <dd>{plane.tasks.length}</dd>
                    </div>
                    <div>
                      <dt>Still mutating</dt>
                      <dd>{plane.activeTasks.length}</dd>
                    </div>
                    <div>
                      <dt>Ownership conflicts</dt>
                      <dd>{plane.conflicts.length}</dd>
                    </div>
                    <div>
                      <dt>Lease chains valid</dt>
                      <dd>
                        {
                          plane.leases.filter((lease) => lease.chain_valid)
                            .length
                        }
                        {" of "}
                        {plane.leases.length}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Governance verdict</h2>
              <span className="rulelabel">
                {plane.observedAt ?? "just now"}
              </span>
            </div>
            <div className="grid">
              <div className="span-7">
                <div
                  className={
                    plane.status === "PASS"
                      ? "verdictline verdictline--pass"
                      : "verdictline verdictline--fail"
                  }
                >
                  <p className="t-label">Status</p>
                  <h3
                    className="t-display"
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    {plane.status}
                  </h3>
                  {plane.failedChecks.length > 0 ? (
                    <p className="lede">
                      Pemeriksa yang menolak: {plane.failedChecks.join(", ")}
                    </p>
                  ) : (
                    <p className="lede muted">
                      Seluruh pemeriksa tata kelola lolos pada pembacaan ini.
                    </p>
                  )}
                  {plane.nextAction ? (
                    <p
                      className="t-compact"
                      style={{ marginTop: "var(--space-3)" }}
                    >
                      <strong>Langkah menurut repository:</strong>{" "}
                      {plane.nextAction}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="span-4">
                {plane.warnings.length > 0 ? (
                  <>
                    <p className="t-label">
                      Peringatan ({plane.warnings.length})
                    </p>
                    <ul
                      className="t-compact muted stack"
                      style={{ marginTop: "var(--space-3)", maxWidth: "44ch" }}
                    >
                      {plane.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="t-compact muted">Tidak ada peringatan.</p>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="section">
          <div className="verdictline verdictline--fail">
            <p className="t-label">Bidang kendali tidak terbaca</p>
            <p className="lede">{plane.problem}</p>
          </div>
        </section>
      )}

      <header className="pagehead grid">
        <div className="pagehead__id">
          <p className="t-label">Tasks and flows</p>
          <h1 className="t-page">Only operations that are already allowed</h1>
          <p
            className="muted"
            style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}
          >
            Every button refers to a known action identity. Free-form commands
            from the browser are not accepted.
          </p>
        </div>
      </header>
      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Task status</h2>
          <span className="rulelabel">No live trail here</span>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Meaning</th>
                <th>Mutation</th>
              </tr>
            </thead>
            <tbody>
              {TASK_STATES.map((state) => (
                <tr key={state.id}>
                  <td className="t-data">{state.id}</td>
                  <td>{state.meaning}</td>
                  <td>
                    {state.mutation ? "Actively changing" : "Does not change"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section stack">
        {taskActions.map((action) => (
          <ActionPanel
            key={action.id}
            action={action}
            onOpen={onOpen}
            selected={selectedAction === action.id}
          />
        ))}
      </section>
    </>
  );
}

function HealthSection({
  selectedAction,
  onOpen,
  live,
}: {
  selectedAction: string | null;
  onOpen: (id: string) => void;
  live: LiveSnapshot;
}) {
  const healthActions = ACTIONS.filter((action) =>
    ["doctor", "setup", "db-start", "db-reset"].includes(action.id),
  );

  const health = live.health;
  const ready = health.checks.filter((check) => check.ok);
  const blocked = health.checks.filter((check) => !check.ok);
  const unsafe = blocked.filter((check) => check.severity === "unsafe");

  return (
    <>
      {health.available && health.problem === null ? (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Machine readiness</h2>
              <span className="rulelabel">
                Run by tools/doctor, not re-implemented here
              </span>
            </div>

            <div className="grid">
              <div className="span-7">
                <div
                  className={
                    health.ok
                      ? "verdictline verdictline--pass"
                      : "verdictline verdictline--warn"
                  }
                >
                  <p className="t-label">Verdict</p>
                  <h3
                    className="t-display"
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    {health.ok ? "Siap dipakai" : "Belum siap"}
                  </h3>
                  <p className="lede muted">
                    {health.ok
                      ? "Setiap prasyarat lokal terpenuhi. Aplikasi dapat dijalankan di komputer ini."
                      : `${health.checks.length} pemeriksaan dijalankan. ${blocked.length} di antaranya menghalangi, dan masing-masing membawa langkah perbaikannya sendiri di bawah.`}
                  </p>
                </div>
              </div>
              <div className="span-4">
                <div className="locked">
                  <p className="t-label">Counted</p>
                  <dl
                    className="factlist"
                    style={{ marginTop: "var(--space-3)" }}
                  >
                    <div>
                      <dt>Passed</dt>
                      <dd>{ready.length}</dd>
                    </div>
                    <div>
                      <dt>Blocked</dt>
                      <dd>{blocked.length}</dd>
                    </div>
                    <div>
                      <dt>Rejected as unsafe</dt>
                      <dd>{unsafe.length}</dd>
                    </div>
                    <div>
                      <dt>Checks run</dt>
                      <dd>{health.checks.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Every check</h2>
              <span className="rulelabel">
                {health.checks.length} checks · recovery on the blocked ones
              </span>
            </div>
            <div className="tablewrap">
              <table>
                <caption className="sr-only">Machine readiness checks</caption>
                <thead>
                  <tr>
                    <th scope="col">No.</th>
                    <th scope="col">Area</th>
                    <th scope="col">Result</th>
                    <th scope="col">Reading</th>
                    <th scope="col">Recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {health.checks.map((check, index) => (
                    <tr
                      // Tinted only when the configuration was rejected as
                      // unsafe. A not-yet-ready check carries its glyph and
                      // word; tinting it too would flatten the urgency.
                      className={
                        check.severity === "unsafe" ? "row--fail" : undefined
                      }
                      key={check.id}
                    >
                      <td className="num">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <th scope="row">{check.area}</th>
                      <td>
                        <span
                          className={
                            check.ok
                              ? "status status--pass"
                              : check.severity === "unsafe"
                                ? "status status--fail"
                                : "status status--warn"
                          }
                        >
                          {check.ok
                            ? "Siap"
                            : check.severity === "unsafe"
                              ? "Ditolak"
                              : "Belum siap"}
                        </span>
                      </td>
                      <td>{check.summary}</td>
                      <td>{check.ok ? "—" : check.recovery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="section">
          <div className="section__head">
            <h2 className="t-section">Machine readiness</h2>
            <span className="rulelabel">Reading failed</span>
          </div>
          <div className="verdictline verdictline--fail">
            <p className="t-label">Tidak terbaca</p>
            <p className="lede">
              {health.problem ??
                "Pemeriksaan kesiapan tidak dapat dijalankan pada checkout ini."}
            </p>
          </div>
        </section>
      )}

      <section className="section stack">
        {healthActions.map((action) => (
          <ActionPanel
            key={action.id}
            action={action}
            onOpen={onOpen}
            selected={selectedAction === action.id}
          />
        ))}
      </section>
    </>
  );
}

function ActivitySection({ live }: { live: LiveSnapshot }) {
  const activity = live.activity;
  const agentCommits = activity.contributors
    .filter((contributor) => AGENT_AUTHORS.test(contributor.name))
    .reduce((total, contributor) => total + contributor.commits, 0);

  return (
    <>
      {activity.available ? (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Change flow</h2>
              <span className="rulelabel">Last 30 days on {live.branch}</span>
            </div>

            <div className="grid">
              <div className="span-7">
                <div className="locked">
                  <p className="t-label">Last 30 days</p>
                  <dl className="factlist">
                    <div>
                      <dt>Commits landed</dt>
                      <dd>{activity.lastMonth}</dd>
                    </div>
                    <div>
                      <dt>Written by agents</dt>
                      <dd>{agentCommits}</dd>
                    </div>
                    <div>
                      <dt>Written by people</dt>
                      <dd>{activity.lastMonth - agentCommits}</dd>
                    </div>
                    <div>
                      <dt>Branches not on main</dt>
                      <dd>{live.unmergedBranches.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="span-4">
                <div className="locked">
                  <p className="t-label">Contributors</p>
                  <dl
                    className="factlist"
                    style={{ marginTop: "var(--space-3)" }}
                  >
                    {activity.contributors.slice(0, 6).map((contributor) => (
                      <div key={contributor.name}>
                        <dt>{contributor.name}</dt>
                        <dd>{contributor.commits}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Recent commits</h2>
              <span className="rulelabel">Read from git, newest first</span>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Commit</th>
                    <th>Subject</th>
                    <th>Author</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.recent.map((commit) => (
                    <tr key={commit.hash}>
                      <td>{commit.relative}</td>
                      <td>{commit.hash}</td>
                      <td>
                        {commit.subject}
                        {commit.isMerge ? " (merge)" : ""}
                      </td>
                      <td>{commit.author}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Who and where</h2>
              <span className="rulelabel">
                Contributors and the files they moved
              </span>
            </div>
            <div className="grid">
              <div className="span-7">
                <p className="t-label">Busiest files</p>
                <dl
                  className="factlist"
                  style={{ marginTop: "var(--space-3)" }}
                >
                  {activity.hotPaths.map((entry) => (
                    <div key={entry.path}>
                      <dt>{entry.path}</dt>
                      <dd>{entry.changes}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="span-4">
                <p className="t-label">How to read this</p>
                <p
                  className="t-compact muted"
                  style={{ marginTop: "var(--space-3)", maxWidth: "44ch" }}
                >
                  Counted over the same 30 days. A file near the top is where
                  the repository&apos;s effort actually went — which is not
                  always where the work was planned.
                </p>
              </div>
            </div>
          </section>

          {live.unmergedBranches.length > 0 ? (
            <section className="section">
              <div className="section__head">
                <h2 className="t-section">Work not yet on main</h2>
                <span className="rulelabel">
                  Each one is a decision waiting
                </span>
              </div>
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Commits ahead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.unmergedBranches.map((branch) => (
                      <tr key={branch.name}>
                        <td>{branch.name}</td>
                        <td>{branch.commitsAhead}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="section">
          <div className="alert">
            <h2>Git tidak terbaca</h2>
            <p>
              Riwayat perubahan tidak dapat ditampilkan karena git tidak dapat
              dijalankan pada checkout ini.
            </p>
          </div>
        </section>
      )}
      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Delapan gerbang publikasi</h2>
          <span className="rulelabel">
            Dievaluasi oleh saf gate --all, bukan disusun tangan
          </span>
        </div>
        {live.gates.available ? (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">Verdict gerbang publikasi</caption>
              <thead>
                <tr>
                  <th scope="col">No.</th>
                  <th scope="col">Gerbang</th>
                  <th scope="col">Verdict</th>
                  <th scope="col">Alasan</th>
                  <th scope="col">Diperiksa</th>
                </tr>
              </thead>
              <tbody>
                {live.gates.gates.map((gate, index) => (
                  <tr
                    className={
                      gate.verdict === "PASS" ? undefined : "row--fail"
                    }
                    key={gate.check_id}
                  >
                    <td className="num">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <th scope="row" className="t-data">
                      {gate.check_id}
                    </th>
                    <td>
                      <span
                        className={
                          gate.verdict === "PASS"
                            ? "status status--pass"
                            : "status status--fail"
                        }
                      >
                        {gate.verdict === "PASS" ? "Lolos" : "Ditolak"}
                      </span>
                    </td>
                    <td>
                      {gate.reason}
                      {gate.errors.length > 0
                        ? gate.errors.map((error, errorIndex) => (
                            <p
                              className="t-compact muted"
                              key={`${gate.check_id}-error-${errorIndex}`}
                            >
                              {error}
                            </p>
                          ))
                        : null}
                    </td>
                    <td className="num">
                      {gate.checked === null ? "—" : gate.checked}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="verdictline verdictline--fail">
            <p className="t-label">Tidak terbaca</p>
            <p className="lede">{live.gates.problem}</p>
          </div>
        )}
      </section>
    </>
  );
}

function GovernanceSection() {
  return (
    <>
      <header className="pagehead grid">
        <div className="pagehead__id">
          <p className="t-label">Governance</p>
          <h1 className="t-page">Authority stays visible</h1>
          <p
            className="muted"
            style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}
          >
            Humans govern, agents execute, and machines enforce. This board
            explains that boundary. It does not weaken it.
          </p>
        </div>
        <div className="pagehead__verdict">
          <div className="verdict">
            <p className="t-label">Operating model</p>
            <p className="verdict__word">SAFRS Core</p>
            <p
              className="t-compact muted"
              style={{ marginTop: "var(--space-3)" }}
            >
              {SITE.operatingModel}
            </p>
          </div>
        </div>
      </header>
      <section className="section">
        <div className="grid">
          {Object.entries(RISK_COPY).map(([tier, copy]) => (
            <article className="span-7 panel" key={tier}>
              <div className="panel__body">
                <p className="t-label">{tier}</p>
                <h2>{copy.title}</h2>
                <p>{copy.meaning}</p>
                <p className="t-compact muted">{copy.mutation}</p>
                <p className="t-compact">{copy.approval}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="alert">
          <h2>Pending approvals</h2>
          <p>
            Not observed here. R2 approval is bound to exact content. R3
            authorization is accepted only from an authorized human for the
            exact operation proposed.
          </p>
        </div>
      </section>
    </>
  );
}

function KnowledgeSection({ live }: { live: LiveSnapshot }) {
  return (
    <>
      <header className="pagehead grid">
        <div className="pagehead__id">
          <p className="t-label">Knowledge</p>
          <h1 className="t-page">Official documents first</h1>
          <p
            className="muted"
            style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}
          >
            If a summary and the specification conflict, the specification wins.
          </p>
        </div>
      </header>
      <section className="section">
        {live.knowledge.available ? (
          <>
            <div className="section__head">
              <h2 className="t-section">Registry dokumen resmi</h2>
              <span className="rulelabel">
                Dibaca dari .safrs/document-registry.json
              </span>
            </div>
            <div className="tablewrap">
              <table>
                <caption className="sr-only">Registry dokumen resmi</caption>
                <thead>
                  <tr>
                    <th scope="col">Urutan</th>
                    <th scope="col">Dokumen</th>
                    <th scope="col">Jenis</th>
                    <th scope="col">Normativitas</th>
                    <th scope="col">Cakupan</th>
                    <th scope="col">Lokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {live.knowledge.documents.map((document) => (
                    <tr key={document.id}>
                      <td className="num">
                        {document.read_order === undefined
                          ? "—"
                          : String(document.read_order).padStart(2, "0")}
                      </td>
                      <th scope="row">{document.id}</th>
                      <td>{document.type}</td>
                      <td>{document.normativity}</td>
                      <td>{document.scope}</td>
                      <td className="t-data">{document.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <p className="t-compact muted">
              Registry dokumen tidak terbaca di checkout ini — daftar di bawah
              adalah katalog papan, bukan registry live.
            </p>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Recorded location</th>
                  </tr>
                </thead>
                <tbody>
                  {KNOWLEDGE.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.title}</strong>
                      </td>
                      <td>{item.kind}</td>
                      <td>{item.purpose}</td>
                      <td className="t-data">{item.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}

export function ControlCenter({ live }: { live: LiveSnapshot }) {
  const [section, setSection] = useState<NavId>("home");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const current = useMemo(
    () => NAV.find((item) => item.id === section) ?? NAV[0],
    [section],
  );

  function openAction(id: string) {
    setSelectedAction((currentId) => (currentId === id ? null : id));
  }

  return (
    <div>
      <header className="chrome">
        <span className="tile" aria-hidden="true">
          <SentraMark />
        </span>
        <span className="wordmark">SENTRA</span>
        <span className="chrome__sep" />
        <p className="chrome__path">
          Monorepo-safrs / <b>{current.label}</b>
        </p>
        <p className="chrome__right t-label">{SITE.operatingModel}</p>
      </header>

      {/* A <nav> rather than a <div>: aria-label needs a landmark role to
          attach to, and this genuinely is navigation. */}
      <nav className="mobile-nav" aria-label="Sections">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={item.id === section ? "page" : undefined}
            onClick={() => setSection(item.id)}
          >
            {item.seq} {item.label}
          </button>
        ))}
      </nav>

      <div className="shell">
        <aside className="rail">
          <div className="rail__mark">
            <p className="wordmark">CONTROL</p>
            <p className="t-compact muted">{SITE.product}</p>
          </div>
          <nav aria-label="Primary navigation">
            <p className="rail__group t-label">Sections</p>
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={item.id === section ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                <span className="seq">{item.seq}</span>
                <span>
                  {item.label}
                  <span className="sr-only">. {item.hint}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className="rail__foot">
            <p className="t-compact muted">{SITE.observedAt}</p>
          </div>
        </aside>

        <main className="stage">
          <div className="wrap">
            {section === "home" ? (
              <HomeSection
                selectedAction={selectedAction}
                onOpen={openAction}
                live={live}
              />
            ) : null}
            {section === "projects" ? (
              <ProjectsSection
                selectedAction={selectedAction}
                onOpen={openAction}
                live={live}
              />
            ) : null}
            {section === "agents" ? <AgentsSection live={live} /> : null}
            {section === "tasks" ? (
              <TasksSection
                selectedAction={selectedAction}
                onOpen={openAction}
                live={live}
              />
            ) : null}
            {section === "health" ? (
              <HealthSection
                selectedAction={selectedAction}
                onOpen={openAction}
                live={live}
              />
            ) : null}
            {section === "activity" ? <ActivitySection live={live} /> : null}
            {section === "governance" ? <GovernanceSection /> : null}
            {section === "knowledge" ? <KnowledgeSection live={live} /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
