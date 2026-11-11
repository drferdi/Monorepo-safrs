export type RemoteMcpTransport = "streamable_http" | "sse";

/**
 * Curated marketplace directory for the Integrations overlay.
 *
 * Three sources feed the marketplace grid:
 * 1. The managed connection catalog (server-provided) — enriched here with
 *    descriptions and categories for known providers.
 * 2. Popular remote MCP servers (verified official endpoints).
 * 3. A library of installable agent skills (SKILL.md documents).
 *
 * Names are deduplicated at render time: a managed catalog connector always
 * wins over an MCP directory entry with the same normalized name.
 */

export type DirectoryCategory =
  | "productivity"
  | "developer"
  | "payments"
  | "creativity"
  | "knowledge";

export const CATEGORY_ORDER: DirectoryCategory[] = [
  "productivity",
  "developer",
  "payments",
  "creativity",
  "knowledge",
];

export function normalizeDirectoryKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Descriptions + categories for known managed-catalog connectors. */
export const CONNECTOR_META: Record<string, { description: string; category: DirectoryCategory }> =
  {
    gmail: { description: "Read and manage Gmail", category: "productivity" },
    googlecalendar: { description: "Manage Google Calendar events", category: "productivity" },
    googledrive: { description: "Drive, Docs, Sheets or Slides", category: "productivity" },
    slack: { description: "Read and manage Slack", category: "productivity" },
    notion: { description: "Notion docs and workflows", category: "productivity" },
    github: { description: "Triage PRs, issues, CI, and publish flows", category: "developer" },
    linear: { description: "Plan and track issues in Linear", category: "productivity" },
    dropbox: { description: "Browse and manage Dropbox files", category: "productivity" },
    trello: { description: "Get things done in Trello", category: "productivity" },
    asana: { description: "Manage Asana tasks and projects", category: "productivity" },
    figma: { description: "Inspect and reference Figma designs", category: "creativity" },
    canva: { description: "Create and manage Canva designs", category: "creativity" },
    stripe: { description: "Payments, customers, and invoices", category: "payments" },
    hubspot: { description: "CRM contacts, deals, and notes", category: "productivity" },
    jira: { description: "Manage Jira and Confluence", category: "productivity" },
    atlassian: { description: "Manage Jira and Confluence", category: "productivity" },
  };

export type McpDirectoryEntry = {
  /** Stable id used for keys and dedupe. */
  id: string;
  name: string;
  description: string;
  category: DirectoryCategory;
  endpoint: string;
  transport: RemoteMcpTransport;
  /** "oauth" servers offer browser authorization after install; "open" need none. */
  auth: "oauth" | "open";
};

/**
 * Popular official remote MCP servers. Endpoints verified against the
 * awesome-remote-mcp-servers catalog (jaw9c) — do not add unverified URLs.
 */
export const MCP_DIRECTORY: McpDirectoryEntry[] = [
  {
    id: "github-mcp",
    name: "GitHub",
    description: "Triage PRs, issues, CI, and publish flows",
    category: "developer",
    endpoint: "https://api.githubcopilot.com/mcp",
    transport: "streamable_http",
    auth: "oauth",
  },
  {
    id: "linear-mcp",
    name: "Linear",
    description: "Plan and track issues in Linear",
    category: "productivity",
    endpoint: "https://mcp.linear.app/sse",
    transport: "sse",
    auth: "oauth",
  },
  {
    id: "sentry-mcp",
    name: "Sentry",
    description: "Investigate errors and performance issues",
    category: "developer",
    endpoint: "https://mcp.sentry.dev/sse",
    transport: "sse",
    auth: "oauth",
  },
  {
    id: "notion-mcp",
    name: "Notion",
    description: "Notion docs and workflows",
    category: "productivity",
    endpoint: "https://mcp.notion.com/sse",
    transport: "sse",
    auth: "oauth",
  },
  {
    id: "asana-mcp",
    name: "Asana",
    description: "Manage Asana tasks and projects",
    category: "productivity",
    endpoint: "https://mcp.asana.com/sse",
    transport: "sse",
    auth: "oauth",
  },
  {
    id: "atlassian-mcp",
    name: "Atlassian",
    description: "Manage Jira and Confluence",
    category: "productivity",
    endpoint: "https://mcp.atlassian.com/v1/sse",
    transport: "sse",
    auth: "oauth",
  },
  {
    id: "intercom-mcp",
    name: "Intercom",
    description: "Search conversations and help customers",
    category: "productivity",
    endpoint: "https://mcp.intercom.com/sse",
    transport: "sse",
    auth: "oauth",
  },
  {
    id: "vercel-mcp",
    name: "Vercel",
    description: "Deployments, projects, and logs on Vercel",
    category: "developer",
    endpoint: "https://mcp.vercel.com/",
    transport: "streamable_http",
    auth: "oauth",
  },
  {
    id: "cloudflare-docs-mcp",
    name: "Cloudflare Docs",
    description: "Search Cloudflare documentation",
    category: "developer",
    endpoint: "https://docs.mcp.cloudflare.com/sse",
    transport: "sse",
    auth: "open",
  },
  {
    id: "deepwiki-mcp",
    name: "DeepWiki",
    description: "Ask questions about public GitHub repos",
    category: "knowledge",
    endpoint: "https://mcp.deepwiki.com/sse",
    transport: "sse",
    auth: "open",
  },
  {
    id: "huggingface-mcp",
    name: "Hugging Face",
    description: "Search models, datasets, and papers",
    category: "knowledge",
    endpoint: "https://hf.co/mcp",
    transport: "streamable_http",
    auth: "open",
  },
  {
    id: "stripe-mcp",
    name: "Stripe",
    description: "Payments, customers, and invoices",
    category: "payments",
    endpoint: "https://mcp.stripe.com/",
    transport: "streamable_http",
    auth: "oauth",
  },
  {
    id: "paypal-mcp",
    name: "PayPal",
    description: "Manage PayPal payments and orders",
    category: "payments",
    endpoint: "https://mcp.paypal.com/sse",
    transport: "sse",
    auth: "oauth",
  },
  {
    id: "square-mcp",
    name: "Square",
    description: "Square payments, catalog, and customers",
    category: "payments",
    endpoint: "https://mcp.squareup.com/sse",
    transport: "sse",
    auth: "oauth",
  },
  {
    id: "canva-mcp",
    name: "Canva",
    description: "Create and manage Canva designs",
    category: "creativity",
    endpoint: "https://mcp.canva.com/mcp",
    transport: "streamable_http",
    auth: "oauth",
  },
  {
    id: "webflow-mcp",
    name: "Webflow",
    description: "Manage Webflow sites and CMS content",
    category: "creativity",
    endpoint: "https://mcp.webflow.com/sse",
    transport: "sse",
    auth: "oauth",
  },
];

export type SkillLibraryEntry = {
  id: string;
  name: string;
  description: string;
  /** Full SKILL.md document installed verbatim via agentSkills.create. */
  content: string;
};

function skillMd(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body.trim()}\n`;
}

/**
 * Installable agent skills. Workflow-discipline skills are original condensed
 * write-ups inspired by popular open-source skill packs (e.g. Superpowers).
 */
export const SKILL_LIBRARY: SkillLibraryEntry[] = [
  {
    id: "deep-planning",
    name: "Deep Planning",
    description:
      "Brainstorm, write a plan, then execute in small verified steps — inspired by the Superpowers workflow.",
    content: skillMd(
      "Deep Planning",
      "Brainstorm, write a plan, then execute in small verified steps — inspired by the Superpowers workflow.",
      `Use this skill before any multi-step or risky task.

## 1. Brainstorm first
- Restate the goal in one sentence and list what "done" observably looks like.
- List at least two approaches with one-line tradeoffs. Pick one and say why.
- Surface unknowns and assumptions explicitly. Ask only about the ones that change the outcome.

## 2. Write the plan
- Break the work into steps of at most a few minutes each.
- Each step names: the change, the file or system touched, and how to verify it.
- Order steps so each leaves the system working.

## 3. Execute with checkpoints
- Do one step, verify it, then move on. Never batch unverified steps.
- When verification fails: stop, diagnose the root cause, adjust the plan, retry.
- If two attempts fail the same way, step back to the brainstorm instead of trying harder.

## 4. Close out
- Compare the result against the "done" criteria from step 1.
- Report what was verified, what was not, and any follow-ups.`,
    ),
  },
  {
    id: "systematic-debugging",
    name: "Systematic Debugging",
    description:
      "Find the root cause with evidence before changing code — reproduce, isolate, fix, prove.",
    content: skillMd(
      "Systematic Debugging",
      "Find the root cause with evidence before changing code — reproduce, isolate, fix, prove.",
      `Use this skill whenever something is broken and the cause is not proven yet.

## Rules
- No fix before a reproduction. If it cannot be reproduced, gather logs until it can.
- Read the actual error, not the summary of it. Quote the decisive line.
- Change one variable at a time. Binary-search the surface: half the input, half the code path.
- Distinguish "where it crashed" from "where it went wrong" — walk backwards to the first bad value.

## Loop
1. Reproduce reliably (smallest input that still fails).
2. Form one hypothesis that explains all observed evidence.
3. Design the cheapest test that could falsify it.
4. Run it. If falsified, back to 2 with the new evidence.
5. Fix the root cause, not the symptom.
6. Prove the fix: original reproduction passes, and a regression test pins it.

## Anti-patterns
- Shotgun edits, sleep/retry band-aids, catching and swallowing the error.
- Declaring victory because the error moved.`,
    ),
  },
  {
    id: "test-driven-development",
    name: "Test-Driven Development",
    description: "Red, green, refactor — write the failing test first, then the minimum code.",
    content: skillMd(
      "Test-Driven Development",
      "Red, green, refactor — write the failing test first, then the minimum code.",
      `Use this skill when implementing features or fixing bugs in code with a test runner.

## Cycle
1. RED — write one small test for the next behavior. Run it. It must fail for the expected reason.
2. GREEN — write the minimum code that makes it pass. Resist generalizing.
3. REFACTOR — clean up duplication and naming while all tests stay green.
4. Repeat with the next behavior.

## Guidance
- Test behavior through public interfaces, not implementation details.
- One assertion topic per test; name the test after the behavior it proves.
- Bug fix = first a failing test that reproduces the bug, then the fix.
- If a test is hard to write, the design is telling you something — listen before mocking everything.`,
    ),
  },
  {
    id: "code-review-checklist",
    name: "Code Review Checklist",
    description:
      "Review a diff for correctness, security, and simplicity — findings ranked by severity.",
    content: skillMd(
      "Code Review Checklist",
      "Review a diff for correctness, security, and simplicity — findings ranked by severity.",
      `Use this skill when asked to review code, a diff, or a pull request.

## Pass 1 — Correctness
- Trace every changed code path with a concrete failing input in mind.
- Check edge cases: empty, null, zero, negative, huge, concurrent, repeated.
- Verify error handling: what happens when each awaited call fails?

## Pass 2 — Security
- Inputs validated at the boundary? Secrets kept out of logs and client responses?
- Authorization checked on every mutated resource, not just the happy path?

## Pass 3 — Simplicity
- Could this be done with less code or an existing helper?
- Is anything speculative (unused flexibility, premature abstraction)?

## Report
- One finding per line: file:line, severity (blocker/major/minor), the problem, the fix.
- No praise padding. If the diff is clean, say so in one line.`,
    ),
  },
  {
    id: "crisp-writing",
    name: "Crisp Writing",
    description: "Rewrite drafts to be shorter and clearer — lead with the point, cut filler.",
    content: skillMd(
      "Crisp Writing",
      "Rewrite drafts to be shorter and clearer — lead with the point, cut filler.",
      `Use this skill when drafting or editing emails, docs, announcements, or reports.

## Method
1. Find the one sentence the reader must remember. Move it to the top.
2. Cut filler: "just", "really", "in order to", "it should be noted", hedges that add no information.
3. Prefer verbs over noun phrases ("decide" not "make a decision").
4. One idea per paragraph; one topic per sentence where possible.
5. Replace abstractions with concrete numbers, dates, and names.
6. Read it aloud once — anything you stumble on, rewrite.

## Structure for asks
- What you need, from whom, by when — in the first two lines.
- Context after the ask, never before it.`,
    ),
  },
  {
    id: "meeting-summaries",
    name: "Meeting Summaries",
    description:
      "Turn transcripts or notes into decisions, action items with owners, and open questions.",
    content: skillMd(
      "Meeting Summaries",
      "Turn transcripts or notes into decisions, action items with owners, and open questions.",
      `Use this skill when given a transcript, chat log, or raw meeting notes.

## Output format
1. **TL;DR** — three lines maximum.
2. **Decisions** — what was decided and by whom. Only actual decisions, not topics discussed.
3. **Action items** — one line each: owner, action, deadline (write "no deadline set" when absent).
4. **Open questions** — unresolved points that need a follow-up.

## Rules
- Attribute decisions and actions to named people only when the source names them.
- Do not invent deadlines, owners, or conclusions that are not in the source.
- Keep the original language of the meeting for names and project terms.`,
    ),
  },
];
