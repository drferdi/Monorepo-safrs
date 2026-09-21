"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { chartStatsFromLive } from "../lib/chart-stats";
import {
  type ControlAction,
  type LiveSnapshot,
  NAV,
  type NavId,
  type RiskTier,
  SITE,
} from "../lib/control-center";
import { RECOVERY_COMMAND, runnableById } from "../lib/exec/commands";
import { runCommand } from "../lib/exec/run";
import {
  type FeatureBoardBucket,
  featureEvidenceMetric,
  featureStatusClass,
  featureStatusLabel,
  splitFeatureBoardColumns,
} from "../lib/feature-board";
import { deriveSectionLead } from "../lib/section-lead";
import { deriveSituation, type SituationLevel } from "../lib/situation";

/** How often Situasi re-reads the repository via a soft RSC refresh. */
const SITUATION_REFRESH_MS = 30_000;

/**
 * Machine identities that commit to this repository. Matching on the author
 * name is a heuristic, not an authority — a human can set any name — so the
 * count is presented as an observation about names, never as a security claim.
 */
const AGENT_AUTHORS = /codex|claude|cursor|droid|agent|bot/i;

function situationVerdictClass(level: SituationLevel): string {
  if (level === "fail") return "verdict verdict--fail";
  if (level === "pass") return "verdict verdict--pass";
  if (level === "attention") return "verdict verdict--warn";
  return "verdict";
}

function attentionStatusClass(
  statusClass: "fail" | "warn" | "pass" | "idle",
): string {
  if (statusClass === "fail") return "status status--fail";
  if (statusClass === "pass") return "status status--pass";
  if (statusClass === "idle") return "status status--idle";
  return "status status--warn";
}

function sectionLeadStatusClass(
  status: "active" | "failed" | "attention",
): string {
  if (status === "failed") return "status status--fail";
  if (status === "active") return "status status--pass";
  return "status status--warn";
}

/** Resolve a CSS custom property to a concrete color for Recharts SVG fills. */
function readCssColor(variable: string): string {
  if (typeof document === "undefined") {
    return "currentColor";
  }
  const probe = document.createElement("span");
  probe.style.color = `var(${variable})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || "currentColor";
}

function useChartPalette() {
  const [palette, setPalette] = useState({
    pass: "currentColor",
    fail: "currentColor",
    warn: "currentColor",
    idle: "currentColor",
    text: "currentColor",
  });

  useEffect(() => {
    setPalette({
      pass: readCssColor("--color-status-success"),
      fail: readCssColor("--color-status-critical"),
      warn: readCssColor("--color-status-warning"),
      idle: readCssColor("--color-status-neutral"),
      text: readCssColor("--color-text-secondary"),
    });
  }, []);

  return palette;
}

function chartStatusColor(
  status: string,
  palette: ReturnType<typeof useChartPalette>,
): string {
  if (status === "connected") return palette.pass;
  if (status === "error") return palette.fail;
  if (status === "partially-connected" || status === "requires-configuration") {
    return palette.warn;
  }
  return palette.idle;
}

/** Two live bar charts for Situasi — Recharts + Sentra status tokens. */
function SituationCharts({ live }: { live: LiveSnapshot }) {
  const stats = chartStatsFromLive(live);
  const palette = useChartPalette();

  const featureData = [
    {
      name: "Jalan",
      value: stats.features.working,
      fill: palette.pass,
    },
    {
      name: "Belum jalan",
      value: stats.features.notWorking,
      fill: palette.fail,
    },
  ];

  const projectData = stats.projects.map((bucket) => ({
    name: bucket.label,
    value: bucket.count,
    fill: chartStatusColor(bucket.status, palette),
  }));

  const axisStyle = {
    fill: palette.text,
    fontSize: 11,
    fontFamily: "var(--font-family-mono)",
  };

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="t-section">Gambar ringkas</h2>
        <span className="rulelabel">Angka dari keadaan nyata sekarang</span>
      </div>
      <div className="grid">
        <figure className="span-7 chart-card">
          <figcaption className="t-label">
            Berapa fitur yang jalan vs yang belum
          </figcaption>
          <p
            className="t-compact muted"
            style={{ marginTop: "var(--space-2)" }}
          >
            Ada {stats.features.total} fitur. “Jalan” artinya semua bukti di
            komputer sudah lengkap.
          </p>
          <div
            className="chart-frame"
            role="img"
            aria-label={`Fitur yang jalan ${stats.features.working}, belum jalan ${stats.features.notWorking}, dari ${stats.features.total}`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={featureData}
                margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
              >
                <XAxis dataKey="name" tick={axisStyle} interval={0} />
                <YAxis
                  type="number"
                  allowDecimals={false}
                  tick={axisStyle}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-border-subtle)" }}
                  contentStyle={{
                    background: "var(--color-background-canvas)",
                    border: "1px solid var(--color-border-strong)",
                    borderRadius: "var(--radius-control)",
                    fontFamily: "var(--font-family-mono)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" name="Jumlah" radius={0}>
                  {featureData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>

        <figure className="span-4 chart-card">
          <figcaption className="t-label">Proyek menurut keadaannya</figcaption>
          <p
            className="t-compact muted"
            style={{ marginTop: "var(--space-2)" }}
          >
            Proyek aplikasi di rumah ini — {stats.projectTotal} buah.
          </p>
          {projectData.length === 0 ? (
            <p className="t-compact" style={{ marginTop: "var(--space-4)" }}>
              Belum ada proyek aplikasi di daftar bukti.
            </p>
          ) : (
            <div
              className="chart-frame"
              role="img"
              aria-label={`Proyek per status: ${projectData
                .map((b) => `${b.name} ${b.value}`)
                .join(", ")}`}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={projectData}
                  margin={{ top: 12, right: 12, left: 8, bottom: 48 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={axisStyle}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis
                    type="number"
                    allowDecimals={false}
                    tick={axisStyle}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-border-subtle)" }}
                    contentStyle={{
                      background: "var(--color-background-canvas)",
                      border: "1px solid var(--color-border-strong)",
                      borderRadius: "var(--radius-control)",
                      fontFamily: "var(--font-family-mono)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" name="Jumlah" radius={0}>
                    {projectData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </figure>
      </div>
    </section>
  );
}

/** Catalog on one page: two columns (projects+rules+tools | packages+…). */
function FeatureCatalogBoard({ live }: { live: LiveSnapshot }) {
  const { left, right } = splitFeatureBoardColumns(live.features);
  const total = live.features.length;
  const working = live.features.filter((f) => f.status === "connected").length;

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="t-section">Features</h2>
        <span className="rulelabel">
          {working}/{total} connected · one page · two columns
        </span>
      </div>
      <p
        className="t-compact muted"
        style={{ marginBottom: "var(--space-5)", maxWidth: "68ch" }}
      >
        Left: projects, rules, tools. Right: packages, data, knowledge, quality.
      </p>

      <div className="grid feature-board">
        <div className="span-6 feature-board__col">
          {left.map((bucket) => (
            <FeatureFamilyBlock bucket={bucket} key={bucket.group.id} />
          ))}
        </div>
        <div className="span-6 feature-board__col">
          {right.map((bucket) => (
            <FeatureFamilyBlock bucket={bucket} key={bucket.group.id} />
          ))}
        </div>
      </div>

      <p
        className="t-compact muted"
        style={{ marginTop: "var(--space-5)", maxWidth: "68ch" }}
      >
        Metrik = berapa bukti file yang ketemu di komputer. Arahkan ke status
        untuk membaca alasan lengkap.
      </p>
    </section>
  );
}

function FeatureFamilyBlock({ bucket }: { bucket: FeatureBoardBucket }) {
  return (
    <div className="feature-family">
      <div className="section__head">
        <h3 className="t-section">{bucket.group.title}</h3>
        <span className="rulelabel">
          {bucket.working}/{bucket.features.length} jalan
        </span>
      </div>
      <p
        className="t-compact muted"
        style={{ marginBottom: "var(--space-3)", maxWidth: "52ch" }}
      >
        {bucket.group.blurb}
      </p>
      <ul className="feature-family__list">
        {bucket.features.map((feature) => {
          const metric = featureEvidenceMetric(feature);
          const kind = featureStatusClass(feature.status);
          return (
            <li className="feature-family__item" key={feature.id}>
              <div className="feature-family__row">
                <strong className="feature-family__name">{feature.name}</strong>
                <span
                  className={
                    kind === "pass"
                      ? "status status--pass"
                      : kind === "fail"
                        ? "status status--fail"
                        : kind === "idle"
                          ? "status status--idle"
                          : "status status--warn"
                  }
                  title={feature.statusReason}
                >
                  {featureStatusLabel(feature.status)}
                </span>
                <span
                  className="t-data feature-family__metric"
                  title={feature.statusReason}
                >
                  {metric.label}
                </span>
              </div>
              <p className="t-compact feature-family__purpose">
                {feature.purpose}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Home hero: SAFRS Dashboard + typed welcome + day/date. */
const HOME_WELCOME = 'Welcome to Sentraverse, dr Ferdi Iskandar "The Gaffer"';

function formatHomeDate(now: Date): string {
  const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(
    now,
  );
  const rest = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const day = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${day}, ${rest}`;
}

function useTypedWelcome(fullText: string): string {
  const [shown, setShown] = useState("");

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(fullText);
      return;
    }

    setShown("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setShown(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(timer);
      }
    }, 28);

    return () => window.clearInterval(timer);
  }, [fullText]);

  return shown;
}

function HomeDashboardLead({ live }: { live: LiveSnapshot }) {
  const lead = deriveSectionLead("home", live);
  const typed = useTypedWelcome(HOME_WELCOME);
  const todayLabel = useMemo(() => formatHomeDate(new Date()), []);
  const typingDone = typed.length >= HOME_WELCOME.length;

  return (
    <header className="section-lead grid">
      <div className="span-7">
        <p className="t-label">SAFRS</p>
        <h1 className="t-page" id="section-lead-home">
          SAFRS Dashboard
        </h1>
        <p
          className="dashboard-welcome"
          aria-live="polite"
          style={{ marginTop: "var(--space-4)", maxWidth: "68ch" }}
        >
          <span className="dashboard-welcome__text">{typed}</span>
          <span
            className={
              typingDone
                ? "dashboard-welcome__caret dashboard-welcome__caret--done"
                : "dashboard-welcome__caret"
            }
            aria-hidden="true"
          />
        </p>
        <p className="t-compact muted" style={{ marginTop: "var(--space-3)" }}>
          {todayLabel}
        </p>
      </div>
      <div className="span-4">
        <div
          className={
            lead.status === "failed"
              ? "verdictline verdictline--fail"
              : lead.status === "active"
                ? "verdictline verdictline--pass"
                : "verdictline verdictline--warn"
          }
          role="status"
          aria-label={`Status: ${lead.statusLabel}. ${lead.statusReason}`}
        >
          <p className="t-label">Keadaan sekarang</p>
          <p style={{ marginTop: "var(--space-2)" }}>
            <span className={sectionLeadStatusClass(lead.status)}>
              {lead.statusLabel}
            </span>
          </p>
          <p
            className="t-compact"
            style={{ marginTop: "var(--space-3)", maxWidth: "44ch" }}
          >
            {lead.statusReason}
          </p>
        </div>
      </div>
    </header>
  );
}

/** Mandatory block: feature name, purpose, status + reason. */
function SectionLead({ live, id }: { live: LiveSnapshot; id: NavId }) {
  if (id === "home") {
    return <HomeDashboardLead live={live} />;
  }
  const lead = deriveSectionLead(id, live);
  return (
    <header className="section-lead grid">
      <div className="span-7">
        <p className="t-label">Apa ini</p>
        <h1 className="t-page" id={`section-lead-${id}`}>
          {lead.name}
        </h1>
        <p
          className="muted"
          style={{ marginTop: "var(--space-3)", maxWidth: "68ch" }}
        >
          <span className="t-label" style={{ display: "block" }}>
            Buat apa
          </span>
          {lead.purpose}
        </p>
      </div>
      <div className="span-4">
        <div
          className={
            lead.status === "failed"
              ? "verdictline verdictline--fail"
              : lead.status === "active"
                ? "verdictline verdictline--pass"
                : "verdictline verdictline--warn"
          }
          role="status"
          aria-label={`Status: ${lead.statusLabel}. ${lead.statusReason}`}
        >
          <p className="t-label">Keadaan sekarang</p>
          <p style={{ marginTop: "var(--space-2)" }}>
            <span className={sectionLeadStatusClass(lead.status)}>
              {lead.statusLabel}
            </span>
          </p>
          <p
            className="t-compact"
            style={{ marginTop: "var(--space-3)", maxWidth: "44ch" }}
          >
            {lead.statusReason}
          </p>
        </div>
      </div>
    </header>
  );
}

const HOME_ACTION_IDS = [
  "doctor",
  "status",
  "setup",
  "dev",
  "test",
  "deploy-production",
] as const;

function SentraChromeBrand() {
  return (
    <div className="chrome__brand" aria-label="Sentra Control Center">
      {/* Official master logomark (docs/brand) — transparent, token-colored via mask. */}
      <span className="chrome__logo" aria-hidden="true" />
      <span className="chrome__wordmark">
        <span className="chrome__wordmark-name">Sentra</span>
        <span className="chrome__wordmark-product">Control Center</span>
      </span>
    </div>
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
  const router = useRouter();
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
    router.refresh();
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

  const situation = deriveSituation(live);
  const nextSteps = deriveNextSteps(live);
  const gateRows = live.gates.available ? live.gates.gates : [];

  return (
    <>
      <SectionLead live={live} id="home" />

      <header className="pagehead grid">
        <div className="pagehead__id">
          <p className="t-label">Sekarang</p>
          <h2 className="t-display">Bagaimana keadaan rumah proyek</h2>
          <p
            className="muted"
            style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}
          >
            Dibaca dari file di komputer ini — bukan ditebak, bukan ditulis
            tangan.
          </p>
        </div>
        <div className="pagehead__verdict">
          <div
            className={situationVerdictClass(situation.level)}
            role="status"
            aria-live="polite"
            aria-label={`Kesimpulan: ${situation.verdictWord}`}
          >
            <p className="t-label">Kesimpulan</p>
            <p className="verdict__word">{situation.verdictWord}</p>
            <p
              className="t-compact muted"
              style={{ marginTop: "var(--space-3)", maxWidth: "44ch" }}
            >
              {situation.verdictSentence}
            </p>
          </div>
        </div>
      </header>

      <SituationCharts live={live} />

      <FeatureCatalogBoard live={live} />

      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Angka singkat</h2>
          <span className="rulelabel">
            {live.gitAvailable
              ? `${live.branch} · ${live.head}`
              : "Riwayat perubahan tidak terbaca"}
            {" · "}
            dibaca {live.readAt}
          </span>
        </div>
        <div className="grid">
          <div className="span-7">
            <dl
              className="factlist factlist--counts"
              aria-label="Hitungan rusak, perlu dilihat, dan baik"
            >
              <div>
                <dt>Rusak</dt>
                <dd>{situation.counts.failed}</dd>
              </div>
              <div>
                <dt>Perlu dilihat</dt>
                <dd>{situation.counts.warned}</dd>
              </div>
              <div>
                <dt>Baik</dt>
                <dd>{situation.counts.passed}</dd>
              </div>
            </dl>

            {situation.primaryActionId ? (
              <div style={{ marginTop: "var(--space-5)" }}>
                <p className="t-label">Langkah pertama yang disarankan</p>
                <p
                  className="t-compact muted"
                  style={{ marginTop: "var(--space-2)", maxWidth: "68ch" }}
                >
                  {situation.primaryActionWhy}
                </p>
                <div style={{ marginTop: "var(--space-4)" }}>
                  <RunStep id={situation.primaryActionId} />
                </div>
              </div>
            ) : (
              <p
                className="t-compact muted"
                style={{ marginTop: "var(--space-5)", maxWidth: "68ch" }}
              >
                Tidak ada langkah pertama yang perlu diambil sekarang.
              </p>
            )}

            {gateRows.length > 0 ? (
              <div style={{ marginTop: "var(--space-6)" }}>
                <div className="section__head">
                  <h3 className="t-section">Pemeriksaan sebelum dibagikan</h3>
                  <span className="rulelabel">
                    {situation.summary.gatesPass} lolos ·{" "}
                    {situation.summary.gatesFail} belum lolos
                  </span>
                </div>
                <div className="tablewrap">
                  <table aria-label="Pemeriksaan sebelum dibagikan">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Nama cek</th>
                        <th scope="col">Hasil</th>
                        <th scope="col">Kenapa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gateRows.map((gate, index) => (
                        <tr
                          className={
                            gate.verdict === "PASS" ? undefined : "row--fail"
                          }
                          key={gate.check_id}
                        >
                          <td className="t-data">
                            {String(index + 1).padStart(2, "0")}
                          </td>
                          <td className="t-data">{gate.check_id}</td>
                          <td>
                            <span
                              className={
                                gate.verdict === "PASS"
                                  ? "status status--pass"
                                  : "status status--fail"
                              }
                            >
                              {gate.verdict === "PASS"
                                ? "Lolos"
                                : "Belum lolos"}
                            </span>
                          </td>
                          <td className="t-compact">{gate.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : live.gates.problem ? (
              <p
                className="t-compact"
                style={{ marginTop: "var(--space-5)", maxWidth: "68ch" }}
              >
                {live.gates.problem}
              </p>
            ) : null}
          </div>

          <aside className="span-4">
            <p className="t-label">Angka samping</p>
            <dl className="factlist" style={{ marginTop: "var(--space-3)" }}>
              <div>
                <dt>Cek berbagi lolos / belum</dt>
                <dd>
                  {situation.summary.gatesUnavailable
                    ? "—"
                    : `${situation.summary.gatesPass} / ${situation.summary.gatesFail}`}
                </dd>
              </div>
              <div>
                <dt>Papan pekerjaan</dt>
                <dd>{situation.summary.planeStatus}</dd>
              </div>
              <div>
                <dt>Pekerjaan masih jalan</dt>
                <dd>{situation.summary.planeActive}</dd>
              </div>
              <div>
                <dt>Yang bentrok</dt>
                <dd>{situation.summary.planeConflicts}</dd>
              </div>
              <div>
                <dt>Komputer</dt>
                <dd>
                  {situation.summary.healthOk === null
                    ? "—"
                    : situation.summary.healthOk
                      ? "Siap"
                      : `${situation.summary.healthBlocked} belum oke`}
                </dd>
              </div>
              <div>
                <dt>Fitur perlu dilihat</dt>
                <dd>{situation.summary.featuresAttention}</dd>
              </div>
              <div>
                <dt>File belum disimpan ke riwayat</dt>
                <dd>{situation.summary.dirtyPaths}</dd>
              </div>
              <div>
                <dt>Folder proyek</dt>
                <dd className="t-data">{live.repoRoot}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="alert">
          <h2>Batas papan ini</h2>
          <p>{SITE.honesty}</p>
        </div>
      </section>

      {situation.attention.length > 0 ? (
        <section className="section">
          <div className="section__head">
            <h2 className="t-section">Yang perlu dilihat</h2>
            <span className="rulelabel">
              {situation.attention.length} dari keadaan nyata
            </span>
          </div>
          <div className="grid">
            <div className="span-7 stack">
              {situation.attention.map((row) => (
                <div className="rule" key={row.id}>
                  <p className="t-label">
                    {row.source === "gate"
                      ? "cek berbagi"
                      : row.source === "plane"
                        ? "papan pekerjaan"
                        : row.source === "health"
                          ? "komputer"
                          : "fitur"}{" "}
                    ·{" "}
                    <span className={attentionStatusClass(row.statusClass)}>
                      {row.statusWord}
                    </span>
                  </p>
                  <h3>{row.title}</h3>
                  <p
                    className="t-compact"
                    style={{ marginTop: "var(--space-2)", maxWidth: "68ch" }}
                  >
                    {row.reason}
                  </p>
                </div>
              ))}
            </div>
            <aside className="span-4">
              <p className="t-label">Urutan dibaca</p>
              <p
                className="t-compact muted"
                style={{ marginTop: "var(--space-3)", maxWidth: "44ch" }}
              >
                Dulu yang rusak di pemeriksaan berbagi, lalu papan pekerjaan,
                lalu komputer, lalu fitur. Perbaiki penyebabnya — barisnya
                hilang sendiri saat dicek lagi.
              </p>
            </aside>
          </div>
        </section>
      ) : null}

      {live.problems.length > 0 ? (
        <section className="section">
          <div className="alert">
            <h2>Masalah saat membaca rumah proyek</h2>
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
          <h2 className="t-section">Langkah berikutnya</h2>
          <span className="rulelabel">
            {nextSteps.length === 0
              ? "Tidak ada yang tertunda"
              : `${nextSteps.length} diturunkan dari pembacaan ini`}
          </span>
        </div>

        {nextSteps.length === 0 ? (
          <div className="grid">
            <div className="span-7">
              <p>Tidak ada langkah yang tertunda.</p>
              <p
                className="t-compact muted"
                style={{ marginTop: "var(--space-3)", maxWidth: "68ch" }}
              >
                Mesin siap, tidak ada keputusan yang menunggu, dan working tree
                bersih. Langkah baru muncul di sini ketika pemeriksaan gagal
                atau pekerjaan menunggu keputusan.
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
                    style={{ marginTop: "var(--space-2)", maxWidth: "68ch" }}
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
                  {step.runId && step.runId !== situation.primaryActionId ? (
                    <div style={{ marginTop: "var(--space-4)" }}>
                      <RunStep id={step.runId} />
                    </div>
                  ) : step.runId && step.runId === situation.primaryActionId ? (
                    <p
                      className="t-compact muted"
                      style={{ marginTop: "var(--space-3)", maxWidth: "68ch" }}
                    >
                      Sudah ditawarkan sebagai langkah pertama di atas.
                    </p>
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
              <p className="t-label">Dari mana langkah ini</p>
              <dl className="factlist" style={{ marginTop: "var(--space-3)" }}>
                <div>
                  <dt>Pemeriksaan kesiapan terhalang</dt>
                  <dd>
                    {live.health.available
                      ? live.health.checks.filter((check) => !check.ok).length
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Keputusan menunggu</dt>
                  <dd>
                    {
                      live.features.filter(
                        (feature) => feature.status === "requires-human-action",
                      ).length
                    }
                  </dd>
                </div>
                <div>
                  <dt>Cacat katalog</dt>
                  <dd>
                    {
                      live.features.filter(
                        (feature) => feature.status === "error",
                      ).length
                    }
                  </dd>
                </div>
                <div>
                  <dt>Path belum di-commit</dt>
                  <dd>{live.dirtyPaths}</dd>
                </div>
              </dl>
            </aside>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Aksi yang aman dipahami</h2>
          <span className="rulelabel">
            Penjelasan; eksekusi hanya jika diizinkan
          </span>
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
      <SectionLead live={live} id="projects" />

      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Peta rumah proyek</h2>
          <span className="rulelabel">
            Dibaca dari daftar anggota dan setiap paket di komputer ini
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
      <SectionLead live={live} id="agents" />

      {!live.roles.available ? (
        <p className="t-compact muted">
          .safrs/policy.json tidak terbaca di checkout ini — kolom May memakai
          teks katalog, bukan kebijakan live.
        </p>
      ) : null}
      <section className="section">
        <div className="tablewrap">
          <table aria-label="Daftar agen dan peran">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Jenis</th>
                <th>Boleh</th>
                <th>Tidak boleh</th>
                <th>Batas</th>
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
      <SectionLead live={live} id="tasks" />

      {plane.available ? (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Daftar task saat ini</h2>
              <span className="rulelabel">
                Dibaca lewat tools/status, bukan dihitung ulang di sini
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
              <h2 className="t-section">Kesimpulan aturan kerja</h2>
              <span className="rulelabel">
                {plane.observedAt ?? "baru saja"}
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
                  <p className="t-label">Keadaan sekarang</p>
                  <h3
                    className="t-display"
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    {plane.status}
                  </h3>
                  {plane.failedChecks.length > 0 ? (
                    <p className="lede">
                      Yang menolak: {plane.failedChecks.join(", ")}
                    </p>
                  ) : (
                    <p className="lede muted">
                      Semua pemeriksaan aturan kerja lolos sekarang.
                    </p>
                  )}
                  {plane.nextAction ? (
                    <p
                      className="t-compact"
                      style={{ marginTop: "var(--space-3)" }}
                    >
                      <strong>Saran dari rumah proyek:</strong>{" "}
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
            <p className="t-label">Papan pekerjaan tidak terbaca</p>
            <p className="lede">{plane.problem}</p>
          </div>
        </section>
      )}

      <header className="pagehead grid">
        <div className="pagehead__id">
          <p className="t-label">Pekerjaan dan alur</p>
          <h1 className="t-page">Hanya perintah yang sudah diizinkan</h1>
          <p
            className="muted"
            style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}
          >
            Setiap tombol punya nama yang sudah dikenal. Perintah bebas dari
            browser tidak diterima.
          </p>
        </div>
      </header>
      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Arti keadaan pekerjaan</h2>
          <span className="rulelabel">
            Ini panduan tetap — bukan jejak hidup
          </span>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Keadaan</th>
                <th>Artinya</th>
                <th>Mengubah sesuatu?</th>
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

/** Local environment fix strip — allowlisted only. */
const LOCAL_FIX_IDS = [
  "setup",
  "db-start",
  "db-generate",
  "db-migrate",
  "db-seed",
  "doctor",
] as const;

function LocalFixPanel({
  title = "Local fix",
  hint = "Docker Desktop harus sudah terbuka di Windows. Tombol di bawah hanya menjalankan perintah yang diizinkan di mesin lokal.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="t-section">{title}</h2>
        <span className="rulelabel">setup · postgres · prisma · cek ulang</span>
      </div>
      <p
        className="t-compact muted"
        style={{ marginBottom: "var(--space-4)", maxWidth: "68ch" }}
      >
        {hint}
      </p>
      <div className="stack local-fix-stack">
        {LOCAL_FIX_IDS.map((id) => (
          <div className="local-fix-row" key={id}>
            <RunStep id={id} />
          </div>
        ))}
      </div>
    </section>
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
    [
      "doctor",
      "setup",
      "db-start",
      "db-generate",
      "db-migrate",
      "db-seed",
      "db-stop",
    ].includes(action.id),
  );

  const health = live.health;
  const ready = health.checks.filter((check) => check.ok);
  const blocked = health.checks.filter((check) => !check.ok);
  const unsafe = blocked.filter((check) => check.severity === "unsafe");

  return (
    <>
      <SectionLead live={live} id="health" />

      {health.available && health.problem === null ? (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Hasil cek komputer</h2>
              <span className="rulelabel">
                Dicek otomatis saat papan dibuka
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
                  <p className="t-label">Kesimpulan</p>
                  <h3
                    className="t-display"
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    {health.ok ? "Siap dipakai" : "Belum siap"}
                  </h3>
                  <p className="lede muted">
                    {health.ok
                      ? "Semua peralatan yang dibutuhkan sudah oke. Proyek bisa dijalankan di komputer ini."
                      : `${health.checks.length} pemeriksaan dijalankan. ${blocked.length} belum oke — lihat tabel, lalu pakai Local fix di bawah.`}
                  </p>
                </div>
              </div>
              <div className="span-4">
                <div className="locked">
                  <p className="t-label">Angka</p>
                  <dl
                    className="factlist"
                    style={{ marginTop: "var(--space-3)" }}
                  >
                    <div>
                      <dt>Baik</dt>
                      <dd>{ready.length}</dd>
                    </div>
                    <div>
                      <dt>Belum oke</dt>
                      <dd>{blocked.length}</dd>
                    </div>
                    <div>
                      <dt>Ditolak karena berbahaya</dt>
                      <dd>{unsafe.length}</dd>
                    </div>
                    <div>
                      <dt>Jumlah dicek</dt>
                      <dd>{health.checks.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Semua pemeriksaan</h2>
              <span className="rulelabel">
                {health.checks.length} cek · tombol perbaikan di baris yang
                belum oke
              </span>
            </div>
            <div className="tablewrap">
              <table>
                <caption className="sr-only">
                  Pemeriksaan peralatan komputer
                </caption>
                <thead>
                  <tr>
                    <th scope="col">No.</th>
                    <th scope="col">Bagian</th>
                    <th scope="col">Hasil</th>
                    <th scope="col">Bacaan</th>
                    <th scope="col">Cara perbaiki</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {health.checks.map((check, index) => {
                    const recoveryId = RECOVERY_COMMAND[check.id];
                    return (
                      <tr
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
                                ? "Bahaya"
                                : "Belum siap"}
                          </span>
                        </td>
                        <td>{check.summary}</td>
                        <td>
                          {check.ok
                            ? "—"
                            : check.id === "docker-engine" ||
                                check.id === "docker-installed"
                              ? `${check.recovery} (harus dibuka manual di Windows — tidak bisa dari papan).`
                              : check.recovery}
                        </td>
                        <td>
                          {!check.ok && recoveryId ? (
                            <RunStep id={recoveryId} />
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="section">
          <div className="section__head">
            <h2 className="t-section">Hasil cek komputer</h2>
            <span className="rulelabel">Tidak dapat dievaluasi</span>
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

      <LocalFixPanel
        title="Local fix"
        hint="Halaman Health khusus untuk memperbaiki mesin lokal. Docker Desktop Windows harus dibuka manual. Tombol: setup, Postgres, Prisma generate/migrate/seed, lalu cek ulang."
      />

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
      <SectionLead live={live} id="activity" />

      {activity.available ? (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="t-section">Alur perubahan</h2>
              <span className="rulelabel">
                30 hari terakhir di {live.branch}
              </span>
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
            <h2>Riwayat perubahan tidak terbaca</h2>
            <p>
              Riwayat tidak bisa ditampilkan karena alat pencatat perubahan
              tidak jalan di folder proyek ini.
            </p>
          </div>
        </section>
      )}
      <section className="section">
        <div className="section__head">
          <h2 className="t-section">Delapan pemeriksaan sebelum dibagikan</h2>
          <span className="rulelabel">
            Dicek otomatis — bukan ditulis tangan
          </span>
        </div>
        {live.gates.available ? (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">
                Hasil pemeriksaan sebelum dibagikan
              </caption>
              <thead>
                <tr>
                  <th scope="col">No.</th>
                  <th scope="col">Nama cek</th>
                  <th scope="col">Hasil</th>
                  <th scope="col">Kenapa</th>
                  <th scope="col">Dicek</th>
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
                        {gate.verdict === "PASS" ? "Lolos" : "Belum lolos"}
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

function GovernanceSection({ live }: { live: LiveSnapshot }) {
  return (
    <>
      <SectionLead live={live} id="governance" />

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
          <h2>Persetujuan yang menunggu</h2>
          <p>
            Belum diamati di papan ini. Persetujuan R2 terikat pada isi yang
            tepat. Otorisasi R3 hanya dari manusia berwenang untuk operasi yang
            diajukan secara eksplisit.
          </p>
        </div>
      </section>
    </>
  );
}

function KnowledgeSection({ live }: { live: LiveSnapshot }) {
  return (
    <>
      <SectionLead live={live} id="knowledge" />

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
  const router = useRouter();
  const [section, setSection] = useState<NavId>("home");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const current = useMemo(
    () => NAV.find((item) => item.id === section) ?? NAV[0],
    [section],
  );

  // Soft-refresh the SSR snapshot on a fixed interval while Situasi is open so
  // gates/plane/health stay current without a new dependency or polling API.
  useEffect(() => {
    if (section !== "home") {
      return;
    }
    const timer = window.setInterval(() => {
      router.refresh();
    }, SITUATION_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router, section]);

  function openAction(id: string) {
    setSelectedAction((currentId) => (currentId === id ? null : id));
  }

  return (
    <div>
      <header className="chrome">
        <SentraChromeBrand />
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
            {section === "governance" ? (
              <GovernanceSection live={live} />
            ) : null}
            {section === "knowledge" ? <KnowledgeSection live={live} /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
