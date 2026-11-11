# Glass workspace redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Sentrapedia workspace back to Glass's shape: one composer with a chip shortlist, a chat column, and a document pane on the right that replaces the Clinical Cockpit, with the AADI analysis rendered in Glass's differential shape from the stored engine result.

**Architecture:** Presentation layer only, reshaped in place in five stages that each leave the app usable. The message model, storage format v2, the AADI contract and gateway, auth and the evidence gate are untouched; new rendering reads the engine result already stored in `Message.sourceText`. New UI lives in small components (`chip-row`, `account-menu`, `document-pane`, `encounter-overview`, `analysis-document`, `guideline-citations`), and the old pieces (`IntentTabs`, quick actions, `ClinicalPanel`, the two-column `DiagnosisDocument` rail, the timed `ThinkingCard`) are deleted when their replacement lands.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, TypeScript, plain CSS in `src/app/globals.css` (no Tailwind), Vitest 5 with jsdom and Testing Library for UI tests, lucide-react icons.

**Spec:** `docs/specs/2026-11-04-glass-workspace-redesign-design.md` (reference captures in `docs/verification/glass-reference-2026-11-03/`).

## Global Constraints

- Plain CSS only, tokens not hex: tosca `--color-action-primary`, hover and accent ink unchanged; `src/app/sentra-tokens.css` is never edited; overrides go in `globals.css`.
- Radius: `--radius-control: 8px`, `--radius-structure: 12px` (overridden in `globals.css`); canvas `#fbfbfb`, 8 px margin, shadow `0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)`; chips 32 px high, 1 px border `rgba(31,31,31,.1)`, 500 weight; primary buttons radius 6 px.
- Fonts unchanged: Plus Jakarta Sans titles, Geist text. Copy: Indonesian sentence case, English medical terms kept, no closing disclaimers.
- Motion: 160 ms opacity fade on click-driven changes, no slide or scale; `prefers-reduced-motion` disables all motion. The pane opens with the same fade.
- Breakpoints stay `mobileMaxWidthPx = 760`, `compactMaxWidthPx = 1200` (`src/lib/layout.ts`); `tests/layout-constants.test.ts` keeps CSS and JS equal.
- No change to `Workspace` version, `Message`, `Encounter`, `Patient`, the AADI request/response schemas, `/api/*` routes, auth, consent, sync projection, PII guard. Therapy renders only through `applyTherapyGate`.
- Settings gain only optional fields; a legacy workspace loads unchanged.
- Commands: tests `npx vitest run <file>`, typecheck `npx tsc --noEmit`, lint `npx eslint <files>`; never the full suite per task except in Task 14.
- Each task is one commit on `feat/glass-workspace-redesign-2026-11-04`, message `feat(sentrapedia): … (R1)` or `test(sentrapedia): …`, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never commit `next-env.d.ts`.

## Review Focus

1. A stored AADI answer edited by the doctor (its `content` no longer matches `aadiDraft` output) must render as its markdown, never blank or as stale structure. Test in Task 11.
2. An encounter whose only answers are `question` mode must not open the document pane, and the Ekspor action must still include those answers. Test in Task 6.
3. A workspace saved before this change (no `environment`, no `modeInstructions`, settings dialog values) must load, and the home pill must show the default. Test in Task 13.
4. On a 375 px viewport the document sheet must trap focus, close on Escape, and return focus to the top-bar document button. Test in Task 6.
5. A chip clicked while an analysis is running must not cancel or resend it, and must leave the pending question in place. Test in Task 4.

---

### Task 1: Radius tokens and the Glass canvas sheet

**Files:**
- Modify: `src/app/globals.css` (the `:root` override block after the token import; `.app-shell`, `.main-canvas`, `.sidebar` rules at lines 54, 55, 112)
- Test: `tests/design-tokens.test.ts`

**Interfaces:**
- Produces: CSS custom properties `--radius-control: 8px`, `--radius-structure: 12px`, `--workspace-canvas-shadow` read by every later task; `.main-canvas` as a rounded sheet with 8 px margin.

- [ ] **Step 1: Write the failing test** in `tests/design-tokens.test.ts`, following its existing style of reading `globals.css` as text:

```ts
it("overrides the Sentra radii to Glass's rounded shape without touching the snapshot", () => {
  expect(globals).toMatch(/--radius-control:\s*8px/);
  expect(globals).toMatch(/--radius-structure:\s*12px/);
  expect(globals).toMatch(/--workspace-canvas-shadow:\s*0 1px 3px rgba\(0, ?0, ?0, ?\.1\), 0 1px 2px -1px rgba\(0, ?0, ?0, ?\.1\)/);
  expect(readFileSync("src/app/sentra-tokens.css", "utf8")).toMatch(/--radius-control: 2px/);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/design-tokens.test.ts` — expected FAIL on the first `toMatch`.
- [ ] **Step 3: Implement** in `globals.css`: in the workspace `:root` override block add the three properties; change `.main-canvas` to `background: #fbfbfb; border: 0; border-radius: var(--radius-structure); margin: 8px 8px 8px 4px; box-shadow: var(--workspace-canvas-shadow)`; set `.app-shell` background to the sidebar grey token already used by `.sidebar`; `.sidebar` width 256px. Remove `border-left/right` from `.main-canvas`.
- [ ] **Step 4: Run** `npx vitest run tests/design-tokens.test.ts tests/layout-constants.test.ts` — expected PASS.
- [ ] **Step 5: Commit** `feat(sentrapedia): Glass canvas sheet and rounded radius tokens (R1)`.

---

### Task 2: Sidebar order and the account menu

**Files:**
- Create: `src/components/account-menu.tsx`
- Modify: `src/components/sidebar.tsx` (nav groups lines 38–55, bottom row lines 60–62), `src/components/auth/session-boundary.tsx` (toolbar header), `src/components/workspace.tsx` (`DialogName` use), `src/app/globals.css`
- Test: `tests/ui/sidebar-menu.test.tsx` (new)

**Interfaces:**
- Produces: `AccountMenu({ name, plan, usage, onOpen, onSignOut, children }: { name: string; plan: "Lite"; usage?: { stepsToday: number; budgetUsd: number }; onOpen: (name: DialogName) => void; onSignOut?: () => void; children?: ReactNode })` — a popover anchored to the sidebar's account row; `children` is where `SessionBoundary` injects Clerk's `UserButton`. Menu items, in order: Pengaturan Agent (`"settings"`), Antrean kerja (`"queue"`), Referensi (`"knowledge"`), Tentang workspace (`"account"`), then a usage line, then Keluar when `onSignOut` is given.
- `SessionBoundary` gains prop `menuSlot?: (signOut: () => void, userButton: ReactNode) => ReactNode`; it renders no `session-toolbar` header when `menuSlot` is provided. The lock and idle behaviour is unchanged.
- Sidebar nav order: Baru, Buat Pasien, Buat Daftar Pasien, Mulai Scribe (`onDialog("scribe")`), Pengaturan Agent (`onDialog("settings")`), Cari; no group titles.

- [ ] **Step 1: Write the failing tests** in `tests/ui/sidebar-menu.test.tsx`:

```ts
it("lists Glass's six entries in order and no group titles", () => {
  render(<Sidebar state={initialWorkspace} open mobile={false} onToggle={noop} onDialog={noop} onNew={noop} onSelect={noop} onToast={noop}/>);
  const labels = within(screen.getByRole("navigation", { name: "Navigasi utama" })).getAllByRole("button").map(b => b.textContent?.replace(/⌘.*$/, "").trim());
  expect(labels).toEqual(["Baru", "Buat Pasien", "Buat Daftar Pasien", "Mulai Scribe", "Pengaturan Agent", "Cari"]);
  expect(screen.queryByText("Alat kerja")).toBeNull();
});
it("opens the account menu with settings, queue, references, about and sign out", async () => {
  const onOpen = vi.fn(), onSignOut = vi.fn();
  render(<AccountMenu name="dr. Rani" plan="Lite" onOpen={onOpen} onSignOut={onSignOut}/>);
  await userEvent.click(screen.getByRole("button", { name: /dr\. Rani/ }));
  expect(screen.getAllByRole("menuitem").map(i => i.textContent)).toEqual(["Pengaturan Agent", "Antrean kerja", "Referensi", "Tentang workspace", "Keluar"]);
  await userEvent.click(screen.getByRole("menuitem", { name: "Antrean kerja" }));
  expect(onOpen).toHaveBeenCalledWith("queue");
});
```

- [ ] **Step 2: Run** `npx vitest run tests/ui/sidebar-menu.test.tsx` — expected FAIL (module not found / labels differ).
- [ ] **Step 3: Implement** `AccountMenu` (menu button with `aria-haspopup="menu"`, `role="menu"`, Escape and outside click close, focus returns to the trigger) and reorder the sidebar; wire `SessionBoundary`'s `menuSlot` in `authenticated-workspace.tsx` so `WorkspaceApp` receives `onSignOut` and `userButton` props and passes them to `Sidebar`, which renders `AccountMenu` in place of the `.account` button. Remove `Antrean kerja`, `Templat dan favorit`, `Pustaka Klinis`, `Mode suara`, `Pusat perintah` and the `nav-group-title` spans from the nav. Style the menu with `--radius-control` and the hairline border.
- [ ] **Step 4: Run** `npx vitest run tests/ui/sidebar-menu.test.tsx tests/ui/beta-auth.test.tsx tests/user-access-flow.test.tsx` — expected PASS (update the beta-auth test that looked for the `session-toolbar` sign-out button to find it in the menu).
- [ ] **Step 5: Commit** `feat(sentrapedia): Glass sidebar order and an account menu replace the session toolbar (R1)`.

---

### Task 3: Mode openings and the chip shortlist

**Files:**
- Modify: `src/lib/drafts.ts` (`modes[]` entries, lines 11–29), `src/lib/studio.ts`
- Test: `tests/studio.test.ts`

**Interfaces:**
- Produces: `modes[].opening: string` (the sentence a chip puts into the composer, e.g. `"Susun diagnosis banding untuk kasus berikut:"`; `question` → `"Pertanyaan klinis:"`); `export const chipShortlist: ModeId[] = ["question", "ddx", "clinic", "ap", "refer", "education", "hpi", "avs"]` in `studio.ts` (eight ids; the spec's "Analisis kasus" and "Diagnosis Banding" both map to `ddx`, so the row shows one `ddx` chip labelled from `modes` and the second name is dropped — recorded in the commit message for Gaffer); `export function chipLabel(mode: ModeId, encounter?: Pick<Encounter, "messages">): string` returning `modes` label, or `"Perbarui " + label` when the encounter holds an assistant message of that mode; `export function headlineFor(visit: number): string` cycling `intentGroups.map(g => g.headline)`.

- [ ] **Step 1: Write the failing tests** in `tests/studio.test.ts`:

```ts
it("every mode carries an opening sentence ending in a colon", () => { for (const m of modes) expect(m.opening).toMatch(/:$/); });
it("the chip shortlist is eight distinct modes and ddx appears once", () => { expect(chipShortlist).toHaveLength(8); expect(new Set(chipShortlist).size).toBe(8); expect(chipShortlist.filter(id => id === "ddx")).toHaveLength(1); });
it("a chip reads Perbarui once the encounter holds a document of that mode", () => {
  expect(chipLabel("ddx")).toBe("Diagnosis Banding (DDx)");
  expect(chipLabel("ddx", { messages: [{ id: "1", role: "assistant", content: "x", mode: "ddx", createdAt: "" }] })).toBe("Perbarui Diagnosis Banding (DDx)");
});
it("the headline cycles through the intent headlines by visit", () => { expect(headlineFor(0)).toBe(intentGroups[0].headline); expect(headlineFor(4)).toBe(intentGroups[0].headline); });
```

- [ ] **Step 2: Run** `npx vitest run tests/studio.test.ts` — expected FAIL (`opening` undefined).
- [ ] **Step 3: Implement**: add `opening` to the `modes` type and each of the 18 entries; add `chipShortlist`, `chipLabel`, `headlineFor` to `studio.ts`.
- [ ] **Step 4: Run** `npx vitest run tests/studio.test.ts tests/workflow.test.ts` — expected PASS.
- [ ] **Step 5: Commit** `feat(sentrapedia): chip shortlist, mode opening sentences, and a rotating headline (R1)`.

---

### Task 4: The composer in Glass's shape

**Files:**
- Create: `src/components/chip-row.tsx`
- Modify: `src/components/composer.tsx` (remove `IntentTabs`, `ModePicker` trigger, `quick-actions`; move `CaseGuide` inside the card; add the settings toggle and `Mulai Scribe`), `src/app/globals.css` (`.composer`, `.composer-toolbar`, delete `.intent-groups`, `.quick-actions`, `.intent-modes`, `.composer-mode`, `.mode-trigger`, `.mode-menu*`, `.composer-hint`; add `.chip-row`)
- Test: `tests/ui/chip-row.test.tsx` (new), `tests/ui/case-strip.test.tsx`, `tests/ui/case-guide.test.tsx`

**Interfaces:**
- Consumes: `chipShortlist`, `chipLabel`, `modes[].opening` (Task 3).
- Produces: `ChipRow({ encounter, mode, busy, onChip }: { encounter?: Pick<Encounter, "messages">; mode: ModeId; busy: boolean; onChip: (mode: ModeId) => void })` — one `div[role="group"][aria-label="Mode"]` with `button.action-chip` per shortlist id, horizontally scrollable (`overflow-x: auto`, no wrap), `aria-pressed` on the active mode, all disabled while `busy`.
- Composer props: `onMode` unchanged; new `onScribe: () => void` (opens the scribe dialog); `onTemplate` and `templateKey` stay for the `/` picker; `inChat` unchanged. The chip handler in `Composer` is `(id) => { props.onMode(id); props.onPrompt(opening(id) + "\n"); focus textarea at end }` and never calls `onSubmit`. The `/` picker (`slash-picker`) now lists two labelled groups, **Mode** (all 18 via `modeCategories`) and **Templat pribadi**, with favourites first when any exist; the standalone `ModePicker` combobox is deleted.
- Toolbar left: Mulai Scribe (primary), Tambah Konteks; right: format select, settings toggle (`aria-label="Usia dan tanda vital"`, toggles `CaseStrip`), mic, send. The mic keeps dictation; Mulai Scribe is the dialog.

- [ ] **Step 1: Write the failing tests** in `tests/ui/chip-row.test.tsx`:

```ts
it("renders the shortlist as one scrollable row and marks the active mode", () => {
  render(<ChipRow mode="ddx" busy={false} onChip={noop}/>);
  const chips = screen.getAllByRole("button");
  expect(chips.map(c => c.textContent)).toEqual(chipShortlist.map(id => chipLabel(id)));
  expect(screen.getByRole("button", { name: "Diagnosis Banding (DDx)" })).toHaveAttribute("aria-pressed", "true");
});
it("a chip prefills the composer with the mode's opening and never submits", async () => {
  const onSubmit = vi.fn(), onPrompt = vi.fn(), onMode = vi.fn();
  render(<Composer {...composerProps({ onSubmit, onPrompt, onMode, prompt: "" })}/>);
  await userEvent.click(screen.getByRole("button", { name: "Catatan Klinis (SOAP)" }));
  expect(onMode).toHaveBeenCalledWith("clinic");
  expect(onPrompt).toHaveBeenCalledWith(modes.find(m => m.id === "clinic")!.opening + "\n");
  expect(onSubmit).not.toHaveBeenCalled();
});
it("chips are disabled while an analysis runs so a click cannot cancel or resend it", () => {
  render(<Composer {...composerProps({ busy: true, aadiEnabled: true })}/>);
  for (const chip of screen.getByRole("group", { name: "Mode" }).querySelectorAll("button")) expect(chip).toBeDisabled();
});
it("the slash picker lists every mode under Mode and personal templates under Templat pribadi", async () => {
  render(<Composer {...composerProps({ prompt: "/", templates: [{ id: "t1", name: "QA SOAP pribadi", mode: "clinic", sections: [], instructions: "" }] })}/>);
  expect(screen.getByRole("group", { name: "Mode" })).toBeInTheDocument();
  expect(screen.getAllByRole("option")).toHaveLength(modes.length + 1);
  expect(screen.getByRole("group", { name: "Templat pribadi" })).toBeInTheDocument();
});
it("no intent tabs, quick-action label, Templat lain or slash hint remain", () => {
  render(<Composer {...composerProps({})}/>);
  for (const text of ["Analisis", "Dokumentasi", "Rencana", "Komunikasi", "Tindakan cepat", "Templat lain", "/ untuk templat"]) expect(screen.queryByText(text)).toBeNull();
});
```

`composerProps(overrides)` is a local helper building the full `Composer` props with `noop`s and `initialWorkspace.settings`; copy the pattern from `tests/ui/case-strip.test.tsx`.

- [ ] **Step 2: Run** `npx vitest run tests/ui/chip-row.test.tsx` — expected FAIL.
- [ ] **Step 3: Implement** `ChipRow` and the composer changes; delete `IntentTabs` and `ModePicker`; keep `CaseStrip` and the dictation hook as they are. CSS: `.chip-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 10px 0 0 }`, `.action-chip` height 32px, radius `--radius-control`, border `1px solid rgba(31,31,31,.1)`, weight 500.
- [ ] **Step 4: Run** `npx vitest run tests/ui/chip-row.test.tsx tests/ui/case-strip.test.tsx tests/ui/case-guide.test.tsx` — expected PASS after updating the two older files where they clicked a quick-action chip or asserted the tabs (the case-guide tests switch mode through `onMode` directly).
- [ ] **Step 5: Commit** `feat(sentrapedia): one chip row under the composer; intent tabs and the template picker go (R1)`.

---

### Task 5: Home and the workspace shell without intent groups

**Files:**
- Modify: `src/components/workspace-views.tsx` (`HomeView`, `ChatComposer`, `WorkspaceHeader`), `src/components/workspace.tsx` (`intent`, `composerProps`, `onScribe`, scribe dialog wiring), `src/lib/studio.ts` (`composerPlaceholder` no longer reads groups), `src/app/globals.css` (`.home-headline`, `.home-pill`)
- Test: `tests/ui/workspace-smoke.test.tsx`

**Interfaces:**
- Consumes: `headlineFor`, `ChipRow` (via `Composer`), `onScribe`.
- Produces: `HomeView({ name, headline, pill, composer })` with `headline: string` and `pill: string` (`settings.environment ?? "Layanan primer"`, until Task 13 adds the field use the literal); `ChatComposer` without the `composer-hint` line; `WorkspaceHeader` loses `panelPressed`/`onPanel` for now (Task 6 reintroduces a document button).

- [ ] **Step 1: Write the failing test** in `tests/ui/workspace-smoke.test.tsx`:

```ts
it("the home shows a rotating headline, the Layanan primer pill, the composer and the chip row, with no tabs", () => {
  render(<WorkspaceApp principalId="local-development"/>);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(headlineFor(0));
  expect(screen.getByText("Layanan primer")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Mode" })).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Tujuan kerja" })).toBeNull();
});
```

- [ ] **Step 2: Run** `npx vitest run tests/ui/workspace-smoke.test.tsx -t "rotating headline"` — expected FAIL.
- [ ] **Step 3: Implement**: `WorkspaceState` keeps a `visit` counter in `sessionStorage` key `sentrapedia-visit` to pick `headlineFor(visit)`; remove `intent` and the `intentGroups` import from `workspace.tsx`; `composerPlaceholder(mode)` returns the mode's own placeholder; pass `onScribe: () => openDialog("scribe")`.
- [ ] **Step 4: Run** `npx vitest run tests/ui/workspace-smoke.test.tsx tests/ui/draft-actions.test.tsx` — expected PASS (in `draft-actions`, "routes a next step into the composer" still passes because `startStep` remains until Task 8).
- [ ] **Step 5: Commit** `feat(sentrapedia): the home is a headline, a pill, the composer and the chip row (R1)`.

---

### Task 6: The document pane

**Files:**
- Create: `src/components/document-pane.tsx`, `src/lib/document-pane.ts`
- Modify: `src/components/workspace.tsx` (replace `panelOpen`/`ClinicalPanel` with pane state), `src/components/workspace-views.tsx` (`WorkspaceHeader` gets `documentCount`, `paneOpen`, `onPane`), `src/components/document-studio.tsx` (export `DocumentContent`; `DocumentStudio` loses the toolbar and section rail, becomes the pane body), `src/app/globals.css` (`.workspace-split`, `.document-pane`, `.document-sheet` under 1200 px, delete `.clinical-panel`, `.diagnosis-nav`, `.studio-toolbar`, `.section-control`)
- Test: `tests/document-pane.test.ts` (new, pure), `tests/ui/document-pane.test.tsx` (new)

**Interfaces:**
- Produces (lib): `export function paneDocuments(encounter?: Pick<Encounter, "messages">): Message[]` — assistant messages whose `mode !== "question"`, in creation order; `export function paneOpensFor(encounter?: Pick<Encounter, "messages">): boolean` — `paneDocuments(...).length > 0`.
- Produces (component): `DocumentPane({ encounter, activeId, onActive, overview, tools, onClose, dispatch, onToast }: { encounter: Encounter; activeId: string | "overview"; onActive: (id: string | "overview") => void; overview: ReactNode; tools: { onCopy: (m: Message) => void; onDownload: (m: Message) => void; onPrint: (m: Message) => void; pcare: (m: Message) => PcareCopy[] }; onClose: () => void; dispatch: (a: WorkspaceAction) => void; onToast: (t: string, tone?: "error") => void })`. Tabs: "Ringkasan encounter", then one per document (title from `documentTitle(content)` or the mode label, with `workspaceDate(createdAt)` short time), then a "Lainnya +n" `role="menu"` when documents exceed two. Tools row: history (toggles `HistoryPanel`), copy, "Salin ke P-Care" menu (items from `tools.pcare(m)`), print, download, collapse. Document head: title, time, the review status `<select>` and `ReviewPanel` toggle moved from `DocumentStudio`. Body: `DocumentContent` with an inline editor: an "Edit" control swaps the body for a `textarea` plus a toolbar of four buttons (Judul, Tebal, Miring, Daftar) that wrap the selection with `## `, `**`, `*`, `- ` via `export function applyMark(text: string, start: number, end: number, mark: "heading" | "bold" | "italic" | "list"): { text: string; start: number; end: number }` in `src/lib/document-pane.ts`; Simpan dispatches `message.edit`.
- Layout: when `paneOpensFor(encounter)` and viewport > 1200 px, `.workspace-body` gets `data-split="true"`: chat column `minmax(320px, 1fr)`, pane `minmax(380px, 1.2fr)`; the pane state is `{ open: boolean; activeId }` in `WorkspaceState`, opened automatically the first time `paneDocuments` becomes non-empty and set to that document, remembered per encounter id in a `Map`. At ≤ 1200 px the pane renders as `Dialog`-based sheet (`document-sheet`) opened from the header's document button (`aria-label="Dokumen encounter"`, with the count); it traps focus and closes on Escape like other dialogs.
- `ClinicalPanel`, the `"clinical"` dialog and `panelOpen` are removed from `workspace.tsx` here; Task 7 supplies the overview content, until then `overview` renders the placeholder text "Ringkasan encounter menyusul".

- [ ] **Step 1: Write the failing pure tests** in `tests/document-pane.test.ts`:

```ts
it("pane documents are assistant messages of every mode but question, in order", () => {
  const e = { messages: [u("question"), a("question"), u("ddx"), a("ddx"), a("clinic")] };
  expect(paneDocuments(e).map(m => m.mode)).toEqual(["ddx", "clinic"]);
  expect(paneOpensFor({ messages: [u("question"), a("question")] })).toBe(false);
});
it("applyMark wraps a selection and places the caret after it", () => {
  expect(applyMark("abc def", 4, 7, "bold")).toEqual({ text: "abc **def**", start: 4, end: 11 });
  expect(applyMark("abc", 0, 0, "heading")).toEqual({ text: "## abc", start: 3, end: 3 });
  expect(applyMark("x\ny", 2, 3, "list")).toEqual({ text: "x\n- y", start: 4, end: 5 });
});
```

- [ ] **Step 2: Write the failing UI tests** in `tests/ui/document-pane.test.tsx`:

```ts
it("opens the pane with the first document and keeps the chat for question answers only", async () => {
  // render WorkspaceApp in local mode, submit a clinic-mode draft via the composer, then:
  expect(await screen.findByRole("tablist", { name: "Dokumen encounter" })).toBeInTheDocument();
  expect(screen.getAllByRole("tab").map(t => t.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/^Ringkasan encounter/), expect.stringMatching(/Catatan Klinis/)]));
});
it("does not open the pane for an encounter holding only question answers, and Ekspor still carries them", …);
it("on a 375 px viewport the sheet opens from the header button, traps focus, closes on Escape and returns focus", …);
it("Lainnya +n appears from the third document and selects a tab", …);
it("editing with the toolbar wraps the selection and Simpan dispatches message.edit", …);
```

Use `window.matchMedia` mocks as `tests/ui/diagnosis-phone-fold.test.tsx` does for the viewport case.

- [ ] **Step 3: Run** `npx vitest run tests/document-pane.test.ts tests/ui/document-pane.test.tsx` — expected FAIL (modules missing).
- [ ] **Step 4: Implement** the lib, the component, the CSS and the `workspace.tsx` wiring; delete `ClinicalPanel` usage (keep the file for Task 7 to mine, then delete there); remove `DiagnosisDocument`'s rail usage from `DocumentStudio` (the typed reveal of a fresh answer moves with the body into the pane: keep `typing` and `DiagnosisDocument`'s streaming for one more task, rendered single-column by passing a new prop `rail={false}`).
- [ ] **Step 5: Run** `npx vitest run tests/document-pane.test.ts tests/ui/document-pane.test.tsx tests/ui/workspace-smoke.test.tsx tests/ui/diagnosis-nav.test.tsx` — expected PASS; delete `tests/ui/diagnosis-nav.test.tsx` and the rail cases of `diagnosis-fold`/`diagnosis-phone-fold` that no longer apply, keeping their fold-on-phone assertions on the pane body.
- [ ] **Step 6: Commit** `feat(sentrapedia): documents open in a right-hand pane; the two-column rail and the cockpit panel go (R1)`.

---

### Task 7: Ringkasan encounter

**Files:**
- Create: `src/components/encounter-overview.tsx`
- Modify: `src/components/workspace.tsx` (pass `overview`), `src/lib/aadi/presentation.ts` (export `taskDraftFrom(result: AadiResult): string`), `src/app/globals.css`
- Delete: `src/components/clinical-panel.tsx`
- Test: `tests/ui/encounter-overview.test.tsx` (new), `tests/diagnosis-presentation.test.ts`

**Interfaces:**
- Consumes: `contextFacts`, `encounterTimeline`, `workspaceDate` (studio.ts); `storedCase` (export it from presentation.ts in this task: `export function storedCase(...)`).
- Produces: `EncounterOverview({ state, encounter, patient, onContext, onPatient, onSelect, onMakeTasks, syncState }: { state: Workspace; encounter: Encounter; patient?: Patient; onContext: () => void; onPatient: () => void; onSelect: (id: string) => void; onMakeTasks: (text: string) => void; syncState?: "off" | "ready" })` with four `<section>`s titled Timeline, Ringkasan sumber, Pasien, Daftar tugas, and a footer "Tersimpan di browser". `taskDraftFrom(result)` returns the `nextBestActions` as `"<verb>: <item>"` lines (reuse the `actionVerb` map), empty string when none; the Daftar tugas section shows the lines and a "Buat" button calling `onMakeTasks(text)` which runs `generate(text, "tasks", false)` in `workspace.tsx`.

- [ ] **Step 1: Write the failing tests**:

```ts
// tests/diagnosis-presentation.test.ts
it("taskDraftFrom lists next best actions as verb: item lines", () => { expect(taskDraftFrom(resultWith([{ kind: "test", item: "Foto toraks", reason: "" }]))).toBe("Periksa: Foto toraks"); expect(taskDraftFrom(resultWith([]))).toBe(""); });
// tests/ui/encounter-overview.test.tsx
it("shows timeline, source summary, patient and the task draft, and Buat makes a tasks document", …);
it("shows the link control when the encounter has no patient", …);
```

- [ ] **Step 2: Run** both files — expected FAIL.
- [ ] **Step 3: Implement**, moving the facts/timeline markup from `clinical-panel.tsx` into the new component, then delete `clinical-panel.tsx` and its CSS.
- [ ] **Step 4: Run** `npx vitest run tests/ui/encounter-overview.test.tsx tests/diagnosis-presentation.test.ts tests/ui/document-pane.test.tsx` — expected PASS.
- [ ] **Step 5: Commit** `feat(sentrapedia): Ringkasan encounter tab replaces the Clinical Cockpit (R1)`.

---

### Task 8: The chat column

**Files:**
- Modify: `src/components/message-card.tsx` (assistant turn as prose, document card, actions), `src/components/workspace-views.tsx` (`Conversation`), `src/lib/aadi/presentation.ts` (delete `nextSteps`, `analysisSteps`, `NextStep`), `src/components/workspace.tsx` (delete `startStep`, `stepToast`; add `onOpenDocument`), `src/app/globals.css` (`.user-message` bubble, `.assistant-message` without card chrome, `.document-card`, delete `.next-steps`, `.quick-copy`, `.message-header`)
- Test: `tests/ui/draft-actions.test.tsx`, `tests/diagnosis-presentation.test.ts`, `tests/ui/message-card.test.tsx` (new)

**Interfaces:**
- Produces: `MessageCard` props become `{ message, onEdit, onToast, onReuse, onOpenDocument, encounterId, dispatch }`; for a `question` answer it renders the prose body (`DocumentContent`) and the action icons copy / print / download (`aria-label`s "Salin", "Cetak", "Unduh"); for any other assistant message it renders one line `"Draf <mode label> disusun."` and a `button.document-card` (title, `workspaceDate`) calling `onOpenDocument(message.id)`. User turns keep the reuse control. `onReview` leaves `MessageCard` (it lives in the pane now).

- [ ] **Step 1: Write the failing tests** in `tests/ui/message-card.test.tsx`:

```ts
it("a question answer is prose with copy, print and download, and no Lanjut or P-Care rows", () => {
  render(<MessageCard message={a("question", "Jawaban.")} …/>);
  expect(screen.getByText("Jawaban.")).toBeInTheDocument();
  expect(screen.getAllByRole("button").map(b => b.getAttribute("aria-label"))).toEqual(["Salin", "Cetak", "Unduh"]);
  expect(screen.queryByText(/Lanjut:/)).toBeNull(); expect(screen.queryByText(/P-Care/)).toBeNull();
});
it("a document answer is one line plus a card that opens the pane", async () => {
  const onOpenDocument = vi.fn();
  render(<MessageCard message={a("clinic", "# Catatan Klinis\n\n## S\nx")} onOpenDocument={onOpenDocument} …/>);
  expect(screen.getByText("Draf Catatan Klinis (SOAP) disusun.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /Catatan Klinis/ }));
  expect(onOpenDocument).toHaveBeenCalledWith(expect.any(String));
});
```

- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement**; remove `nextSteps` and its tests in `tests/diagnosis-presentation.test.ts` ("next steps and P-Care copies" in `draft-actions.test.tsx`: keep the P-Care assertion but move it to the pane test of Task 6, delete the next-step case). `pcareCopies` stays (used by the pane).
- [ ] **Step 4: Run** `npx vitest run tests/ui/message-card.test.tsx tests/ui/draft-actions.test.tsx tests/diagnosis-presentation.test.ts tests/ui/workspace-smoke.test.tsx` — expected PASS.
- [ ] **Step 5: Commit** `feat(sentrapedia): chat turns are prose and document cards; Lanjut and P-Care rows leave the chat (R1)`.

---

### Task 9: Honest progress and the pipeline trace

**Files:**
- Modify: `src/components/thinking-card.tsx`, `src/lib/typing.ts` (delete `thinkingSteps`, `thinkingStepMs`, `thinkingStepAt`), `src/lib/aadi/contract.ts` (`AadiAnalysis.pipeline?`), `src/lib/aadi/client.ts` (pass `pipeline` through when shaped `{ path: string; stages: { stage: string; ms: number; ok: boolean; code?: string }[] }`), `src/lib/aadi/presentation.ts` (`aadiMessage` stores `pipeline` inside `sourceText`; new `export function pipelineTrace(message): { stage: string; ms: number; ok: boolean }[]`), `src/components/message-card.tsx` (a folded "Jejak analisis" list under an AADI answer)
- Test: `tests/typing-lines.test.ts`, `tests/aadi-client.test.ts`, `tests/ui/thinking-card.test.tsx` (new)

**Interfaces:**
- Produces: `ThinkingCard({ onCancel, startedAt }: { onCancel: () => void; startedAt: number })` rendering `<div role="status" aria-live="polite"><ol class="thinking-steps">` with exactly two items: "Permintaan diterima" (done) and "Menunggu jawaban AADI · n dtk" (live, `n` from `performance.now() - startedAt`, updated each second). No other step names. `pipelineTrace(message)` returns the stored stages or `[]`.

- [ ] **Step 1: Write the failing tests**:

```ts
// tests/ui/thinking-card.test.tsx
it("shows only the two honest steps inside a live region that wraps the list", () => {
  render(<ThinkingCard onCancel={noop} startedAt={performance.now()}/>);
  const status = screen.getByRole("status"); expect(status.tagName).toBe("DIV");
  expect(within(status).getAllByRole("listitem").map(li => li.textContent)).toEqual(["Permintaan diterima", expect.stringMatching(/^Menunggu jawaban AADI · \d+ dtk$/)]);
  expect(screen.queryByText(/pedoman klinis ditelusuri/)).toBeNull();
});
// tests/aadi-client.test.ts
it("keeps the gateway's pipeline stages on the analysis when present, and tolerates their absence", …);
// tests/diagnosis-presentation.test.ts
it("pipelineTrace reads stored stages and returns [] for a legacy answer", …);
```

- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement**; in `message-card.tsx` render `<details class="pipeline-trace"><summary>Jejak analisis</summary><ol>…` with `stage · ms ms` per item when `pipelineTrace` is non-empty.
- [ ] **Step 4: Run** the three files plus `tests/aadi-pipeline.test.ts` — expected PASS; delete the `thinkingStepAt` cases from `tests/typing-lines.test.ts`.
- [ ] **Step 5: Commit** `feat(sentrapedia): the thinking card reports only what happened; the pipeline trace is kept with the answer (R1)`.

---

### Task 10: Kutipan pedoman cards

**Files:**
- Create: `src/components/guideline-citations.tsx`
- Modify: `src/components/document-studio.tsx` (`DocumentContent` renders `[n]` markers as links to `#cite-n`), `src/app/globals.css`
- Test: `tests/ui/guideline-citations.test.tsx` (new)

**Interfaces:**
- Consumes: `theOracleReferenceItems(body)` (presentation.ts), `readableSource`.
- Produces: `GuidelineCitations({ items, idPrefix }: { items: TheOracleReferenceItem[]; idPrefix: string })` — `<section aria-label="Kutipan pedoman">` with an `<ol>` of cards (`id={`${idPrefix}-${n}`}`): title, `readableSource(file)`, page when known, the first 8 characters of the chunk hash, and a `Terverifikasi` tag; the first two cards open, the rest behind a button "Tampilkan n kutipan lagi" / "Lipat kutipan".

- [ ] **Step 1: Write the failing tests**:

```ts
it("numbers the cards, shows two and folds the rest behind a count", async () => {
  render(<GuidelineCitations idPrefix="c" items={fiveItems}/>);
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  await userEvent.click(screen.getByRole("button", { name: "Tampilkan 3 kutipan lagi" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  expect(screen.getAllByText("Terverifikasi")).toHaveLength(5);
});
it("an in-text [2] links to the second card", () => { render(<DocumentContent content="Teks. [2]" onEdit={noop} citePrefix="c"/>); expect(screen.getByRole("link", { name: "[2]" })).toHaveAttribute("href", "#c-2"); });
```

- [ ] **Step 2: Run** — expected FAIL. **Step 3: Implement** (`DocumentContent` gains optional `citePrefix?: string`; without it `[n]` stays text). **Step 4: Run** the file plus `tests/ui/document-table.test.tsx` — expected PASS.
- [ ] **Step 5: Commit** `feat(sentrapedia): guideline passages render as numbered Kutipan pedoman cards (R1)`.

---

### Task 11: The structured analysis document

**Files:**
- Create: `src/components/analysis-document.tsx`, `src/lib/aadi/analysis-view.ts`
- Modify: `src/components/document-pane.tsx` (render `AnalysisDocument` when `analysisView(message)` is non-null, else `DocumentContent`), `src/app/globals.css`
- Test: `tests/analysis-view.test.ts` (new), `tests/ui/analysis-document.test.tsx` (new)

**Interfaces:**
- Consumes: `storedCase` (Task 7 export), `applyTherapyGate`, `gateEvidence` (`theoracle-evidence-gate.ts`), `theOracleReferenceItems`, `regimenLine`, `aadiFocus`, `GuidelineCitations`.
- Produces (lib): `export interface AnalysisView { focus?: AadiFocus; discussion: { facts: string[]; missing: string[]; note?: string }; tiers: { key: "likely" | "alternatives" | "cannotMiss"; title: "Kemungkinan utama" | "Alternatif" | "Jangan terlewat"; items: { label: string; icd10: string; status: string; supporting: string[]; opposing: string[] }[] }[]; nextSteps: { kind: "question" | "exam" | "test"; item: string; reason: string; indication?: string }[]; therapy?: { forDiagnosis: string; lines: { text: string; status: GateStatus }[]; interactions: string[]; contraindications: string[]; disposition?: string }; education: string[]; citations: TheOracleReferenceItem[] }` and `export function analysisView(message: Pick<Message, "sourceText" | "content" | "mode">): AnalysisView | null` — `null` when there is no stored engine result **or when `content` differs from `aadiDraft(result, …)` regenerated from the stored data** (an edited document renders as markdown, Review Focus 1). Status words come from the existing `statusLabels` map; the therapy comes from `applyTherapyGate(result, gateEvidence(therapyGrounding, grounding), stored)`; `education` is the `edukasi` lines `aadiDraft` already derives (extract that derivation into a shared helper rather than duplicating it).
- Produces (component): `AnalysisDocument({ message, citePrefix }: { message: Message; citePrefix: string })` — sections in the spec's order as `<section>` with `<h3>`; focus section first for `workup` / `icd10` / `refer`; each diagnosis a `<li>` with `<strong>label</strong> · icd10 · status`, then "Mendukung" and "Menyangkal" lists; the therapy section shows `regimenLine` text with a `data-gate` attribute (`verified` | `doseRemoved` | `removed`) and the word "Cek dosis obat" next to a non-verified line.

- [ ] **Step 1: Write the failing lib tests** in `tests/analysis-view.test.ts` using the fixtures of `tests/theoracle-aadi.test.ts`:

```ts
it("builds three tiers, next steps and gated therapy from a stored answer", () => {
  const view = analysisView(aadiMessage(analysisFixture))!;
  expect(view.tiers.map(t => t.title)).toEqual(["Kemungkinan utama", "Alternatif", "Jangan terlewat"]);
  expect(view.tiers[0].items[0]).toMatchObject({ icd10: analysisFixture.result.differential.likely[0].icd10, supporting: expect.any(Array) });
  expect(view.therapy?.lines.every(l => ["verified", "doseRemoved", "removed"].includes(l.status))).toBe(true);
});
it("puts the focus section first for workup, icd10 and refer", …);
it("returns null for a local draft, a legacy nine-part answer, and an edited AADI answer", () => {
  expect(analysisView({ sourceText: undefined, content: "# x", mode: "clinic" })).toBeNull();
  const edited = { ...aadiMessage(analysisFixture), content: "# diedit" }; expect(analysisView(edited)).toBeNull();
});
```

- [ ] **Step 2: Write the failing UI test** in `tests/ui/analysis-document.test.tsx`: section headings in order, a non-verified dose shows "Cek dosis obat", citations section present.
- [ ] **Step 3: Run** both — expected FAIL. **Step 4: Implement**. **Step 5: Run** both plus `tests/theoracle-evidence-gate.test.ts` `tests/theoracle-aadi.test.ts` — expected PASS.
- [ ] **Step 6: Commit** `feat(sentrapedia): the analysis renders as a Glass-shaped document from the stored engine result, therapy through the gate (R1)`.

---

### Task 12: Chat summary and the analysis in the pane

**Files:**
- Modify: `src/components/message-card.tsx` (AADI answer: `Ringkasan untuk dokter` lines + document card + pipeline trace, nothing else), `src/lib/aadi/presentation.ts` (`export function doctorSummary(content: string): string[]` extracting the five lines under `doctorSummaryTitle`), `src/components/document-pane.tsx` (typed reveal: the `DiagnosisDocument` streaming is removed; a fresh AADI document fades in whole), `src/components/diagnosis-document.tsx` (delete), `src/lib/fresh-answer.ts` (unchanged API)
- Test: `tests/ui/workspace-smoke.test.tsx`, `tests/diagnosis-presentation.test.ts`, delete `tests/ui/diagnosis-fold.test.tsx`, `tests/ui/diagnosis-phone-fold.test.tsx`, `tests/typing-table.test.ts` if only the rail used it

**Interfaces:**
- Consumes: `analysisView`, `AnalysisDocument`, `pipelineTrace`.
- Produces: in the chat an AADI answer is `<p>` per summary line, the document card titled "Analisis kasus", and the folded trace; the pane tab for it is "Analisis kasus".

- [ ] **Step 1: Write the failing test** (update the smoke test "submits an analysis case, applies therapy dose gate, and restores encounter on remount"): after submit, the chat holds the five summary lines and a card; the pane tab "Analisis kasus" is selected; `[data-gate]` lines exist in the pane; after remount the same tab is restored.
- [ ] **Step 2: Run** `npx vitest run tests/ui/workspace-smoke.test.tsx -t "submits an analysis case"` — expected FAIL.
- [ ] **Step 3: Implement**; remove `DiagnosisDocument`, the typing stream in `Conversation` (the scroll-follow effect that targets `.diagnosis-document[aria-busy]`) and `typing.ts` exports only it used (`streamAt`, `typedAt`, `wordsUpTo` stay if `tests/typing-lines.test.ts` still covers them for other callers; otherwise delete with their tests).
- [ ] **Step 4: Run** `npx vitest run tests/ui tests/diagnosis-presentation.test.ts tests/typing-lines.test.ts` — expected PASS.
- [ ] **Step 5: Commit** `feat(sentrapedia): the chat keeps the doctor's summary; the analysis lives in the pane (R1)`.

---

### Task 13: Pengaturan Agent page and settings fields

**Files:**
- Create: `src/app/agent/page.tsx`, `src/components/agent-settings.tsx`
- Modify: `src/lib/workspace.ts` (`Settings.environment?: "Layanan primer" | "Rawat jalan"`, `Settings.modeInstructions?: Partial<Record<ModeId, string>>`, `loadWorkspace` tolerance), `src/lib/drafts.ts` (`createDraft` appends `modeInstructions[mode]` to the instructions it already applies), `src/components/sidebar.tsx` (Pengaturan Agent navigates to `/agent`), `src/components/workspace-forms.tsx` (delete the `"settings"` dialog and `SettingsForm`), `src/components/forms.tsx`, `src/components/workspace-views.tsx` (home pill reads `settings.environment`)
- Test: `tests/workspace.test.ts`, `tests/ui/agent-settings.test.tsx` (new), `tests/workspace-fixtures.test.ts`

**Interfaces:**
- Produces: `AgentSettings({ state, dispatch, theoracle }: { state: Workspace; dispatch: (a: WorkspaceAction) => void; theoracle: { id: string; chunks: number; model: string; hash: string; catalogVersion: string } | null })` with three `role="tab"`s: Preferensi (name, specialty, environment, language, model, instructions), Mode dan templat (18 modes each with a textarea bound to `modeInstructions`, the existing `TemplateLibrary` content, favourites), Pengetahuan (the manifest fields read-only or "Database belum terpasang"). The page at `/agent` resolves access exactly as `src/app/page.tsx` does, reads the manifest with `warmTheOracleGrounding`'s loader on the server, and renders the component inside the authenticated shell with a "Kembali ke encounter" link. Saving dispatches `settings.save`.

- [ ] **Step 1: Write the failing tests**:

```ts
// tests/workspace.test.ts
it("loads a workspace saved without environment or modeInstructions and keeps both undefined", () => { const { workspace } = loadWorkspace(JSON.stringify(legacyV2Workspace)); expect(workspace.settings.environment).toBeUndefined(); expect(workspace.settings.modeInstructions).toBeUndefined(); });
it("createDraft applies the mode's extra instruction after the global one", …);
// tests/ui/agent-settings.test.tsx
it("has three tabs and saves environment from Preferensi", …);
it("Pengetahuan says the database is not installed when there is no manifest", …);
```

- [ ] **Step 2: Run** — expected FAIL. **Step 3: Implement**. **Step 4: Run** the three files plus `tests/ui/workspace-smoke.test.tsx` (its "dialog round trip for Settings" case is rewritten to navigate to `/agent` through a mocked `next/navigation`) — expected PASS.
- [ ] **Step 5: Commit** `feat(sentrapedia): Pengaturan Agent is a page with preferences, modes and knowledge (R1)`.

---

### Task 14: Dead code, docs, full gates, browser evidence

**Files:**
- Modify: `src/app/globals.css` (remove every selector no component uses: `.intent-*`, `.quick-*`, `.mode-menu*`, `.composer-mode`, `.clinical-panel*`, `.diagnosis-nav*`, `.studio-toolbar`, `.section-control`, `.next-steps`, `.quick-copy`, `.message-header`, `.session-toolbar`), `.agents/AGENT-CONTEXT.md` (section 6 "UI shell" paragraph, section 11 tokens line), `docs/sentrapedia-ui.md` (new dated entry), `.agents/DECISIONS.md` (one entry "2026-11-04 — The workspace returns to Glass's shape" listing the five decisions), `.agents/HANDOFF.md` (new top entry; archive the oldest if six), `docs/DESIGN-AUDIT.md` (mark M-01, M-02, M-04 closed)
- Test: everything

- [ ] **Step 1: Find unused selectors**: `for s in $(grep -oE '^\.[a-z-]+' src/app/globals.css | sort -u); do grep -rq "${s#.}" src --include=*.tsx || echo $s; done` and delete those confirmed unused.
- [ ] **Step 2: Run** `npx tsc --noEmit` — expected exit 0; `npx eslint src tests` — expected 0 errors; `npx vitest run` — expected all pass; `npm run test:system` — expected all pass. Fix what fails before continuing; if the same check fails twice, stop and report (circuit breaker).
- [ ] **Step 3: Browser evidence**: start `sentrapedia-ui-only` with `SENTRAPEDIA_AUTH_MODE=local` in `.env.local` for the session, capture home and an encounter with an analysis at 1440, 1024 and 375 px into `docs/verification/glass-redesign-2026-11-04/` (JPG), run axe on home and encounter and record the counts in `docs/verification/glass-redesign-2026-11-04/README.md`. Remove the env line afterwards.
- [ ] **Step 4: Write the docs** listed above; the DECISIONS entry names the one deviation from the spec: a single `ddx` chip (Task 3).
- [ ] **Step 5: Commit** `docs(sentrapedia): record the Glass-shaped workspace, close audit M-01, M-02, M-04, and drop unused CSS (R1)`.
