# MedBoard Glass Redesign — Plan 1: Foundation, Components, Shell, Sign-in

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every MedBoard page renders on one white Glass Health style theme (Inter, Oxford Blue, red-orange), inside a new icon-rail shell, with a restyled sign-in card and a shared component kit for the page plans that follow.

**Architecture:** Tokens first: `globals.css` gets the new palette and the Glass type scale, and the old token names become aliases so the 2,509 existing inline styles change colour at once. Dark/light theme rules and `ThemeProvider` are deleted. A small kit of presentational components (`src/components/ui/`, styled by `src/app/ui.css`) and a new shell (`AppNav` rail, `AppHeader`, `AppFooter`, styled by `src/app/shell.css`) replace the old sidebar and footer. No clinical logic, API, auth logic or data flow changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4 (already imported, not used by the new code), `lucide-react` icons, `@fontsource-variable/inter` (new, approved by Chief), `node:test` + `tsx` + `react-dom/server` for tests.

**Spec:** `projects/healthcare/medboard/docs/redesign-glass.md` (approved). This plan covers spec §6 steps 1–4. Pages (EMR, ACARS/HUB, Telemedicine, the rest, alias cleanup) get Plans 2–5.

All paths below are relative to the capsule root `projects/healthcare/medboard/`. Run every command from there.

## Global Constraints

- Palette (exact): surface `#ffffff`, surface-subtle `#f8fafc`, border `#e2e8f0`, text `#0f172a`, text-secondary `#64748b`, primary `#002147` / hover `#0b3266` / tint `#e8edf5`, accent `#e8461e` / tint `#fdece7`, critical `#b42318` / tint `#fef3f2`, warning `#b54708` / tint `#fffaeb`, success `#067647` / tint `#ecfdf3`.
- Type: Inter Variable only, no monospace (`--font-mono` stays an alias of the sans font). Scale `--text-xs` 11, `--text-sm` 13, `--text-base` 15, `--text-lg` 17, `--text-xl` 20, `--text-2xl` 24, `--text-3xl` 30 px. Body 13 px, line-height 1.4. Weights 400/500/600.
- Spacing uses the existing `--gap-*` tokens (4/8/12/16/24/32 px). Radius `--radius-sm` 6, `--radius-md` 8, `--radius-lg` 12, `--radius-xl` 16 px, `--radius-full` pill.
- One white theme. No `data-theme`, no theme toggle, no `ThemeProvider`.
- Status is never colour alone: critical says KRITIS, warning WASPADA, success AMAN. Alerts use a 2 px left rule and an optional tint, never a full colour block, gradient, pulse or emoji.
- Do not touch `src/lib/cdss/**` (R3), `src/lib/emr/**`, API routes, Prisma, auth logic, presence, Socket.IO.
- No `@ts-ignore`, `eslint-disable`, implicit `any` or `as` casts. Code, comments and commits in English.
- Stage explicit paths only. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not touch other sessions' files: `../med-assist/lib/api/sentra-api.ts`, its recommend-prescription test, `../med-assist/tests/e2e/zz-verify-kb-rx.spec.ts`, `../med-assist/docs/brand/`, root `.agents/HANDOFF.md`, `next-env.d.ts`, `runtime/*.json*`.

## Review Focus

1. Text that was light-on-dark (hard-coded `#fff`, `rgba(255,255,255,…)` as a text colour) now sits on white and disappears. Expected: every visible text node keeps at least 3:1 contrast. Pinned by the contrast probe in Task 6.
2. A nested route (`/hub/dr-a`, `/telemedicine/42`, `/report/clinical`) must light up its parent menu item, and `/hubx` must not light up `/hub`. Pinned by the `isNavActive` test in Task 4.
3. A returning user with `puskesmas:nav-collapsed` already stored keeps their choice; a new user starts collapsed. Pinned by the `readNavCollapsed` test in Task 4.
4. A plain button inside the sign-in form must not submit it. Pinned by the `Button` default-type test in Task 3.
5. A critical status rendered without its word. Pinned by the `StatusBadge`/`StatusAlert` test in Task 3.

---

## File map

| File | Responsibility |
|---|---|
| `src/app/globals.css` (modify) | Tokens, aliases, type scale; theme and old shell rules removed |
| `src/app/ui.css` (create) | Styles of the component kit (`.ui-*`) |
| `src/app/shell.css` (create) | Styles of rail, header, content area, footer (`.app-*`) |
| `src/app/layout.tsx` (modify) | Inter font, CSS imports, new shell structure, no theme |
| `src/components/ThemeProvider.tsx` (delete) | — |
| `src/components/ui/cx.ts` | Class-name join helper |
| `src/components/ui/button.tsx`, `chip.tsx`, `card.tsx`, `tabs.tsx`, `input.tsx`, `dialog.tsx`, `status.tsx`, `list.tsx`, `empty-state.tsx`, `page-header.tsx` | One presentational component each |
| `src/components/shell/nav-items.ts` | Menu groups, active-route rule, collapsed-state rule |
| `src/components/shell/initials.ts` | Avatar initials from a crew name |
| `src/components/AppNav.tsx` (rewrite) | Icon rail |
| `src/components/AppHeader.tsx` (create) | Brand, date, avatar menu with profile and logout |
| `src/components/AppFooter.tsx` (rewrite) | One-line footer |
| `src/components/CrewAccessGate.tsx` (modify, styles only) | Sign-in / request-access card |
| `src/app/page.tsx`, `src/app/icdx/page.tsx`, `src/app/telemedicine/page.tsx` (modify) | Drop `useTheme`/`isDark` branches |
| Old-palette literal files (modify, Task 2) | Gold/dark literals replaced |
| `src/app/design-tokens.test.ts`, `src/components/ui/ui.test.tsx`, `src/components/shell/shell.test.ts` (create) | Tests |
| `scripts/test-suite.ts` (modify) | New `design` suite |

---

### Task 1: One white theme with Glass tokens and Inter

**Files:**
- Create: `src/app/design-tokens.test.ts`
- Modify: `scripts/test-suite.ts` (add `design` suite before the `auth-hardening` suite)
- Modify: `src/app/globals.css` (lines 1–754 theme section, 761–846 type block, `body` rule at ~714)
- Modify: `src/app/layout.tsx`, `src/components/AppNav.tsx` (theme toggle only), `src/app/page.tsx`, `src/app/icdx/page.tsx`, `src/app/telemedicine/page.tsx`, `package.json`, `pnpm-lock.yaml`
- Delete: `src/components/ThemeProvider.tsx`

**Interfaces:**
- Produces (CSS custom properties used by every later task): `--surface`, `--surface-subtle`, `--border`, `--text`, `--text-secondary`, `--primary`, `--primary-hover`, `--primary-tint`, `--accent`, `--accent-tint`, `--critical`, `--critical-tint`, `--warning`, `--warning-tint`, `--success`, `--success-tint`, `--shadow-card`, `--shadow-dialog`, `--text-xs` … `--text-3xl`, `--radius-sm` … `--radius-xl`, `--radius-full`, `--text-on-accent`.

- [ ] **Step 1: Write the failing test**

Create `src/app/design-tokens.test.ts`:

```ts
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relative: string): string => readFileSync(path.join(root, relative), 'utf8')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(relative))
    else if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(relative)
  }
  return out
}

// Later :root blocks win, as in the browser.
function rootTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const block of css.matchAll(/(?:^|\n):root\s*\{([^}]*)\}/g)) {
    for (const declaration of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(declaration[1], declaration[2].trim().toLowerCase())
    }
  }
  return tokens
}

test('MedBoard has one white theme: no theme switch in the CSS, the layout or the components', () => {
  assert.equal(read('src/app/globals.css').includes('data-theme'), false)
  assert.equal(read('src/app/layout.tsx').includes('data-theme'), false)
  assert.equal(existsSync(path.join(root, 'src/components/ThemeProvider.tsx')), false)
  const users = sourceFiles('src').filter((file) => /ThemeProvider|useTheme\(/.test(read(file)))
  assert.deepEqual(users, [])
})

test('the palette is the one Chief chose: white, Oxford Blue, red-orange, dark red for critical', () => {
  const tokens = rootTokens(read('src/app/globals.css'))
  assert.equal(tokens.get('--surface'), '#ffffff')
  assert.equal(tokens.get('--primary'), '#002147')
  assert.equal(tokens.get('--accent'), '#e8461e')
  assert.equal(tokens.get('--critical'), '#b42318')
})

test('pages still on the old token names get the new palette', () => {
  const tokens = rootTokens(read('src/app/globals.css'))
  assert.equal(tokens.get('--bg-canvas'), 'var(--surface)')
  assert.equal(tokens.get('--bg-card'), 'var(--surface)')
  assert.equal(tokens.get('--text-main'), 'var(--text)')
  assert.equal(tokens.get('--text-muted'), 'var(--text-secondary)')
  assert.equal(tokens.get('--line-base'), 'var(--border)')
  assert.equal(tokens.get('--c-asesmen'), 'var(--primary)')
  assert.equal(tokens.get('--c-critical'), 'var(--critical)')
  assert.equal(tokens.get('--bg-surface-soft'), 'var(--surface-subtle)')
})

test('text follows Glass Health: Inter, 13 px body on the 11/13/15/17/20/24/30 scale', () => {
  const css = read('src/app/globals.css')
  const tokens = rootTokens(css)
  assert.match(tokens.get('--font-base') ?? '', /^"inter variable"/)
  assert.deepEqual(
    ['--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'].map((name) => tokens.get(name)),
    ['0.6875rem', '0.8125rem', '0.9375rem', '1.0625rem', '1.25rem', '1.5rem', '1.875rem']
  )
  assert.match(css, /\nbody\s*\{[^}]*font-size:\s*var\(--text-sm\);/)
  assert.match(read('src/app/layout.tsx'), /import '@fontsource-variable\/inter'/)
})
```

Register the suite in `scripts/test-suite.ts`, inserted directly before the object whose `name` is `'auth-hardening'`:

```ts
  {
    name: 'design',
    aliases: ['redesign', 'shell', 'tokens'],
    command: process.execPath,
    args: ['./node_modules/tsx/dist/cli.mjs', '--test', 'src/app/design-tokens.test.ts'],
  },
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/app/design-tokens.test.ts`
Expected: FAIL — 4 failing tests (`data-theme` present, `--surface` undefined, `--bg-canvas` is `#121214`, `--font-base` is IBM Plex).

- [ ] **Step 3: Strip the theme rules from `globals.css`**

Save this one-off script to the session scratchpad as `strip-css.mjs` (not committed; Task 4 uses it again):

```js
// Usage: node strip-css.mjs <file> <theme|shell>
// Removes top-level rules (and @media children) whose selector matches the mode; prints what it dropped.
import { readFileSync, writeFileSync } from 'node:fs'

const [file, mode] = process.argv.slice(2)
const SHELL = /^\.(app-shell|app-nav|nav-|app-content|app-page-stack|app-footer)/
const rules = {
  theme: { rule: (p) => p.includes('data-theme') || p.startsWith('.theme-toggle'), comment: (c) => /Theme/.test(c) },
  shell: {
    rule: (p, body) => SHELL.test(p) || (p === ':root' && body.includes('--nav-bg')),
    comment: (c) => /Shell Layout|Sidebar|AppNav|Brand header|Nav menu|Controls \(|── Footer|Content area/.test(c),
  },
}[mode]
if (!rules) throw new Error('mode must be theme or shell')

function parse(src) {
  const items = []
  let i = 0
  while (i < src.length) {
    const start = i
    while (i < src.length && /\s/.test(src[i])) i++
    if (i >= src.length) { items.push({ kind: 'space', text: src.slice(start) }); break }
    if (src.startsWith('/*', i)) {
      const end = src.indexOf('*/', i) + 2
      items.push({ kind: 'comment', text: src.slice(start, end), body: src.slice(i, end) })
      i = end
      continue
    }
    const open = src.indexOf('{', i)
    const semicolon = src.indexOf(';', i)
    if (semicolon !== -1 && (open === -1 || semicolon < open)) {
      items.push({ kind: 'statement', text: src.slice(start, semicolon + 1) })
      i = semicolon + 1
      continue
    }
    let depth = 0
    let j = open
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++
      else if (src[j] === '}' && --depth === 0) break
    }
    items.push({ kind: 'rule', text: src.slice(start, j + 1), prelude: src.slice(i, open).trim(), body: src.slice(open + 1, j) })
    i = j + 1
  }
  return items
}

const dropped = []
function filter(src) {
  let out = ''
  for (const item of parse(src)) {
    if (item.kind === 'comment' && rules.comment(item.body)) { dropped.push(item.body.slice(0, 60)); continue }
    if (item.kind !== 'rule') { out += item.text; continue }
    if (item.prelude.startsWith('@media')) {
      const inner = filter(item.body)
      if (parse(inner).some((child) => child.kind === 'rule')) {
        out += item.text.slice(0, item.text.indexOf('{') + 1) + inner + '\n}'
      } else dropped.push(item.prelude)
      continue
    }
    if (rules.rule(item.prelude, item.body)) { dropped.push(item.prelude.replace(/\s+/g, ' ')); continue }
    out += item.text
  }
  return out
}

const result = filter(readFileSync(file, 'utf8'))
writeFileSync(file, result.replace(/\n{3,}/g, '\n\n'))
console.log(`dropped ${dropped.length}:\n` + dropped.join('\n'))
```

Run: `node <scratchpad>/strip-css.mjs src/app/globals.css theme`
Expected: prints the dropped list — about 54 `[data-theme…]` rules, 8 `.theme-toggle…` rules and the theme comments. Check that no listed selector lacks `data-theme`/`theme-toggle` (except comments). Then `git diff --stat src/app/globals.css` shows only deletions.

- [ ] **Step 4: Add the token block and the Glass type scale**

Directly below `@import "tailwindcss";` replace the two header comment lines (`/* Masterplan … */` stays; the `/* IBM Plex Sans … */` line goes) so the file starts with:

```css
@import "tailwindcss";

/* Masterplan and masterpiece by Drferdi. */
/* Inter (variable) — self-hosted via @fontsource-variable/inter in layout.tsx */

/* ─── Tokens — Glass Health style, one white theme (docs/redesign-glass.md §3) ─── */
:root {
  --surface: #ffffff;
  --surface-subtle: #f8fafc;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-secondary: #64748b;
  --primary: #002147;
  --primary-hover: #0b3266;
  --primary-tint: #e8edf5;
  --accent: #e8461e;
  --accent-tint: #fdece7;
  --critical: #b42318;
  --critical-tint: #fef3f2;
  --warning: #b54708;
  --warning-tint: #fffaeb;
  --success: #067647;
  --success-tint: #ecfdf3;
  --shadow-card: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-dialog: 0 8px 24px rgba(15, 23, 42, 0.08);
  --text-on-accent: #ffffff;

  /* Old names kept as aliases while pages move to the names above (spec §3 "Token lama"). */
  --bg-canvas: var(--surface);
  --bg-canvas-v1: var(--surface);
  --bg-canvas-v2: var(--surface-subtle);
  --bg-canvas-v3: var(--surface-subtle);
  --bg-nav: var(--surface-subtle);
  --bg-card: var(--surface);
  --bg-surface-soft: var(--surface-subtle);
  --text-main: var(--text);
  --text-muted: var(--text-secondary);
  --line-base: var(--border);
  --grid-faint: rgba(15, 23, 42, 0.04);
  --c-anamnesa: var(--text-secondary);
  --c-asesmen: var(--primary);
  --c-cdss: var(--primary);
  --c-critical: var(--critical);
  --c-warning: var(--warning);
  --c-ok: var(--success);
}
```

Replace the whole `/* ─── Font + Type Scale ─── */` block (the `:root { --font-base: "IBM Plex Sans Variable" … --c-status-unknown: #666666; }` block, ~lines 761–846 of the original file) with:

```css
/* ─── Font + Type Scale — Glass Health (Inter; 11/13/15/17/20/24/30) ─── */
:root {
  --font-base: "Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-sans: var(--font-base);
  /* --font-mono redirected to sans-serif — NO monospace anywhere (Chief directive 2026-03-06) */
  --font-mono: var(--font-base);

  --text-xs: 0.6875rem; /* 11px — caption, secondary meta */
  --text-sm: 0.8125rem; /* 13px — body, table data, controls */
  --text-base: 0.9375rem; /* 15px — card title, comfortable body */
  --text-md: var(--text-base);
  --text-lg: 1.0625rem; /* 17px */
  --text-xl: 1.25rem; /* 20px — page title */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */

  --lh-base: 1.4;
  --lh-tight: 1.25;
  --lh-normal: 1.4;
  --lh-relaxed: 1.5;

  --ls-tight: -0.01em;
  --ls-normal: 0em;
  --ls-wide: 0.02em;
  --ls-wider: 0.04em;
  --ls-widest: 0.06em;
  --ls-2xl: 0.08em;
  --ls-3xl: 0.1em;

  --gap-xs: 4px;
  --gap-sm: 8px;
  --gap-md: 12px;
  --gap-lg: 16px;
  --gap-xl: 24px;
  --gap-2xl: 32px;
  --gap-3xl: 48px;
  --gap-4xl: 80px;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  --c-asesmen-soft: var(--primary-tint);
  --c-asesmen-border: color-mix(in srgb, var(--primary) 22%, transparent);
  --c-asesmen-hover: color-mix(in srgb, var(--primary) 8%, transparent);
  --c-asesmen-muted: color-mix(in srgb, var(--primary) 30%, transparent);
  --c-asesmen-strong: var(--primary);
  --c-asesmen-accent: var(--primary-tint);

  --c-critical-soft: var(--critical-tint);
  --c-critical-border: color-mix(in srgb, var(--critical) 24%, transparent);
  --c-critical-border-strong: color-mix(in srgb, var(--critical) 30%, transparent);

  --c-ok-soft: var(--success-tint);
  --c-ok-border: color-mix(in srgb, var(--success) 25%, transparent);

  --content-max-width: 1400px;
  --page-max-width: 1200px;

  --c-sage: #8fa184;
  --c-mint: #7ee2a2;
  --c-peach: #ffd29c;
  --c-taupe: #b7aa9c;
  --c-status-ok: var(--success);
  --c-status-warning: var(--warning);
  --c-status-error: var(--critical);
  --c-status-unknown: var(--text-secondary);
}
```

In the `body` rule change `font-size: 14px;` to `font-size: var(--text-sm);`.

- [ ] **Step 5: Swap the font package and drop the theme from React**

Run: `pnpm add @fontsource-variable/inter@^5.3.0 && pnpm remove @fontsource-variable/ibm-plex-sans`
Expected: `package.json` lists `@fontsource-variable/inter` and no longer `ibm-plex-sans`; lockfile updated.

`src/app/layout.tsx`: replace `import '@fontsource-variable/ibm-plex-sans'` with `import '@fontsource-variable/inter'`, delete the `ThemeProvider` import, change `<html lang="id" data-theme="dark">` to `<html lang="id">`, and remove the `<ThemeProvider>` / `</ThemeProvider>` wrapper lines (keep their children).

Delete `src/components/ThemeProvider.tsx`.

`src/components/AppNav.tsx` (rewritten in Task 4; only keep it compiling here): delete `MoonIcon`, `SunIcon` from the lucide import, the `import { useTheme } from './ThemeProvider'` line, the `const { theme, toggle } = useTheme()` line, and the whole theme `<button className="nav-ctrl-btn" onClick={toggle} …>…</button>` element.

`src/app/page.tsx`, `src/app/icdx/page.tsx`, `src/app/telemedicine/page.tsx`: delete the `useTheme` import, the `const { theme } = useTheme()` line and the `const isDark = theme === 'dark'` line, then replace every `isDark ? A : B` with `B` (the light branch; some span two or three lines, e.g. `bgHero` in `page.tsx`).
Check: `grep -n "isDark\|useTheme" src/app/page.tsx src/app/icdx/page.tsx src/app/telemedicine/page.tsx` prints nothing.

- [ ] **Step 6: Run the test to verify it passes**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/app/design-tokens.test.ts`
Expected: PASS — 4 tests.
Run: `pnpm run lint`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/design-tokens.test.ts scripts/test-suite.ts src/app/globals.css src/app/layout.tsx src/components/AppNav.tsx src/app/page.tsx src/app/icdx/page.tsx src/app/telemedicine/page.tsx package.json pnpm-lock.yaml
git rm src/components/ThemeProvider.tsx
git commit -m "feat(medboard): one white theme with Glass Health tokens and Inter (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Replace the old gold and dark literals

**Files:**
- Modify: `src/app/design-tokens.test.ts` (one new test)
- Modify: every file under `src/app/**` and `src/components/**` that the new test lists (about 25 files, including `src/app/admin/_components/*.module.css`, `src/app/emr/ClinicalPrognosisChart.tsx`, `src/app/admin/_components/AdminCommandCenter.tsx`)

**Interfaces:**
- Consumes: Task 1 tokens. Produces: nothing new; later tasks rely on no gold left.

- [ ] **Step 1: Write the failing test**

Append to `src/app/design-tokens.test.ts`:

```ts
const OLD_LITERALS: Array<[string, RegExp]> = [
  ['gold #E67E22', /#e67e22/i],
  ['gold rgba(230,126,34)', /rgba\(\s*230\s*,\s*126\s*,\s*34\s*,/],
  ['dark canvas #121214', /#121214/i],
  ['cream text #F0E8DC', /#f0e8dc/i],
  ['IBM Plex', /IBM Plex/i],
]

test('no old gold, cream or dark-canvas colour is left in pages and components', () => {
  const offenders: string[] = []
  for (const file of [...sourceFiles('src/app'), ...sourceFiles('src/components')]) {
    const text = read(file)
    for (const [name, pattern] of OLD_LITERALS) if (pattern.test(text)) offenders.push(`${file}: ${name}`)
  }
  assert.deepEqual(offenders, [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/app/design-tokens.test.ts`
Expected: FAIL — the offender list (about 25 files).

- [ ] **Step 3: Replace the context-free literals with a script**

Save to the scratchpad as `replace-gold.mjs` and run it once from the capsule root:

```js
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const replacements = [
  [/#e67e22/gi, '#002147'],
  [/rgba\(\s*230\s*,\s*126\s*,\s*34\s*,\s*([0-9.]+)\s*\)/g, 'rgba(0, 33, 71, $1)'],
  [/#121214/gi, '#ffffff'],
]
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return walk(p)
    return /\.(ts|tsx|css)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : []
  })
}
let changed = 0
for (const file of [...walk('src/app'), ...walk('src/components')]) {
  const before = readFileSync(file, 'utf8')
  const after = replacements.reduce((text, [pattern, value]) => text.replace(pattern, value), before)
  if (after !== before) { writeFileSync(file, after); changed++; console.log(file) }
}
console.log(`${changed} files changed`)
```

Hex is used on purpose (not `var(--primary)`): Chart.js draws on a canvas and cannot read CSS variables.

- [ ] **Step 4: Replace the cream text literals by hand, by context**

`#F0E8DC` was light text for a dark surface. Decide per occurrence (`grep -rniF "#f0e8dc" src/app src/components`):
- On a surface that stays dark — Chart.js `tooltip.titleColor` / `tooltip.bodyColor` over `backgroundColor: 'rgba(33, 33, 33, 0.96)'` in `src/app/emr/ClinicalPrognosisChart.tsx` — use `'#FFFFFF'`.
- Text on an accent fill — the submit button in `src/components/CrewAccessGate.tsx` (~line 1015, `background: 'var(--c-asesmen)'`) — use `'var(--text-on-accent)'` (Task 5 restyles this button anyway).
- Everything else (chart `ticks.color`, axis `title.color`, legend labels) now sits on white — use `'#0F172A'`.

In the same two chart files, the grid and axis lines are white with low alpha and vanish on white. Replace `rgba(255,255,255,0.04)` / `rgba(255, 255, 255, 0.05)` / `rgba(255, 255, 255, 0.08)` used as `grid.color` or `border.color` with `'rgba(15, 23, 42, 0.08)'` in `AdminCommandCenter.tsx` (lines ~563, ~567, ~625, ~641) and in the `scales` options of `ClinicalPrognosisChart.tsx`. Leave other white-alpha values in the EMR chart for Plan 2 (EMR).

- [ ] **Step 5: Run the test to verify it passes**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/app/design-tokens.test.ts`
Expected: PASS — 5 tests.
Run: `pnpm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit**

Stage the test file and exactly the files the script and Step 4 changed (`git status --short src/app src/components` lists them; do not stage anything else):

```bash
git add src/app/design-tokens.test.ts <each changed file>
git commit -m "feat(medboard): old gold and dark literals follow the Oxford palette (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Component kit

**Files:**
- Create: `src/app/ui.css`, `src/components/ui/cx.ts`, `button.tsx`, `chip.tsx`, `card.tsx`, `tabs.tsx`, `input.tsx`, `dialog.tsx`, `status.tsx`, `list.tsx`, `empty-state.tsx`, `page-header.tsx` (all in `src/components/ui/`)
- Create: `src/components/ui/ui.test.tsx`
- Modify: `src/app/layout.tsx` (import `./ui.css`), `scripts/test-suite.ts` (add the test file to `design`)

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces:
  - `cx(...parts: Array<string | false | null | undefined>): string`
  - `Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'accent' | 'ghost'; size?: 'sm' | 'md' | 'lg' })` — default `variant='secondary'`, `size='md'`, `type='button'`
  - `Chip(props: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; icon?: ReactNode })`
  - `Card({ title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string })`
  - `Tabs({ items: TabItem[]; value: string; onChange: (id: string) => void; 'aria-label': string })`, `TabItem = { id: string; label: ReactNode }`
  - `Input(props: InputHTMLAttributes<HTMLInputElement>)`, `SearchInput(props: InputHTMLAttributes<HTMLInputElement>)`, `Field({ label: ReactNode; hint?: ReactNode; children: ReactNode })`
  - `Dialog({ open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number })`
  - `StatusTone = 'critical' | 'warning' | 'success'`, `STATUS_WORD: Record<StatusTone, string>`, `StatusBadge({ tone: StatusTone; label?: string })`, `StatusAlert({ tone: StatusTone; title: string; children?: ReactNode })`, `Badge({ tone?: 'neutral' | 'primary' | 'accent'; children: ReactNode })`
  - `List({ children })`, `ListItem({ children: ReactNode; onClick?: () => void })`
  - `EmptyState({ title: string; description?: ReactNode; action?: ReactNode })`
  - `PageHeader({ title: ReactNode; description?: ReactNode; actions?: ReactNode })`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/ui.test.tsx`:

```tsx
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { Button } from './button'
import { Dialog } from './dialog'
import { StatusAlert, StatusBadge } from './status'
import { Tabs } from './tabs'

test('a critical status always says KRITIS in words, not only in colour', () => {
  assert.match(renderToStaticMarkup(<StatusBadge tone="critical" />), />KRITIS</)
  const alert = renderToStaticMarkup(
    <StatusAlert tone="critical" title="SpO2 88%">
      Periksa ulang saturasi
    </StatusAlert>
  )
  assert.match(alert, /role="alert"/)
  assert.match(alert, /KRITIS/)
  assert.match(alert, /SpO2 88%/)
})

test('warning and safe statuses carry their words too', () => {
  assert.match(renderToStaticMarkup(<StatusBadge tone="warning" label="TD 150/95" />), /WASPADA · TD 150\/95/)
  assert.match(renderToStaticMarkup(<StatusAlert tone="success" title="Data lengkap" />), /AMAN/)
})

test('a button inside a form does not submit it unless asked to', () => {
  assert.match(renderToStaticMarkup(<Button>Batal</Button>), /type="button"/)
  assert.match(renderToStaticMarkup(<Button type="submit" variant="primary">Masuk</Button>), /type="submit"/)
})

test('only the chosen tab reads as selected', () => {
  const html = renderToStaticMarkup(
    <Tabs
      aria-label="Panel klinis"
      items={[
        { id: 'ddx', label: 'MIRA DDx' },
        { id: 'summary', label: 'Ringkasan' },
      ]}
      value="summary"
      onChange={() => {}}
    />
  )
  assert.equal(html.match(/aria-selected="true"/g)?.length, 1)
  assert.match(html, /aria-selected="true"[^>]*>Ringkasan</)
})

test('a closed dialog renders nothing; an open one is a labelled modal', () => {
  assert.equal(renderToStaticMarkup(<Dialog open={false} title="Upload" onClose={() => {}}>isi</Dialog>), '')
  const html = renderToStaticMarkup(
    <Dialog open title="Upload Konteks Pasien" onClose={() => {}}>
      isi
    </Dialog>
  )
  assert.match(html, /role="dialog"/)
  assert.match(html, /aria-modal="true"/)
  assert.match(html, /Upload Konteks Pasien/)
})
```

Add `'src/components/ui/ui.test.tsx'` to the `design` suite `args` in `scripts/test-suite.ts` (after `src/app/design-tokens.test.ts`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/components/ui/ui.test.tsx`
Expected: FAIL with `Cannot find module './button'`.

- [ ] **Step 3: Write the components**

`src/components/ui/cx.ts`:

```ts
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
```

`src/components/ui/button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'secondary', size = 'md', type = 'button', className, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('ui-btn', `ui-btn--${variant}`, size !== 'md' && `ui-btn--${size}`, className)}
      {...rest}
    />
  )
}
```

`src/components/ui/chip.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  icon?: ReactNode
}

export function Chip({ selected, icon, type = 'button', className, children, ...rest }: ChipProps) {
  return (
    <button type={type} className={cx('ui-chip', className)} aria-pressed={selected} {...rest}>
      {icon}
      {children}
    </button>
  )
}
```

`src/components/ui/card.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cx } from './cx'

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('ui-card', className)}>
      {title || actions ? (
        <header className="ui-card__header">
          {title ? <h2 className="ui-card__title">{title}</h2> : <span />}
          {actions}
        </header>
      ) : null}
      <div className="ui-card__body">{children}</div>
    </section>
  )
}
```

`src/components/ui/tabs.tsx`:

```tsx
import type { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: ReactNode
}

export function Tabs({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  'aria-label': string
}) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          className="ui-tab"
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
```

`src/components/ui/input.tsx`:

```tsx
import { Search } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('ui-input', className)} {...rest} />
}

export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="ui-search">
      <Search size={16} strokeWidth={1.75} aria-hidden className="ui-search__icon" />
      <input type="search" className={cx('ui-input', 'ui-search__input', className)} {...rest} />
    </span>
  )
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="ui-field">
      <span className="ui-field__label">{label}</span>
      {children}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  )
}
```

`src/components/ui/dialog.tsx`:

```tsx
'use client'

import { X } from 'lucide-react'
import { useEffect, useId, type ReactNode } from 'react'

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  width = 560,
}: {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="ui-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="ui-dialog" style={{ maxWidth: width }}>
        <header className="ui-dialog__header">
          <h2 id={titleId} className="ui-dialog__title">
            {title}
          </h2>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onClose} aria-label="Tutup">
            <X size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </header>
        <div className="ui-dialog__body">{children}</div>
        {footer ? <footer className="ui-dialog__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}
```

`src/components/ui/status.tsx`:

```tsx
import type { ReactNode } from 'react'

export type StatusTone = 'critical' | 'warning' | 'success'

export const STATUS_WORD: Record<StatusTone, string> = {
  critical: 'KRITIS',
  warning: 'WASPADA',
  success: 'AMAN',
}

export function StatusBadge({ tone, label }: { tone: StatusTone; label?: string }) {
  return (
    <span className={`ui-badge ui-badge--${tone}`}>
      {label ? `${STATUS_WORD[tone]} · ${label}` : STATUS_WORD[tone]}
    </span>
  )
}

export function StatusAlert({ tone, title, children }: { tone: StatusTone; title: string; children?: ReactNode }) {
  return (
    <div role="alert" className={`ui-alert ui-alert--${tone}`}>
      <div className="ui-alert__head">
        <span className="ui-alert__word">{STATUS_WORD[tone]}</span>
        <span className="ui-alert__title">{title}</span>
      </div>
      {children ? <div className="ui-alert__body">{children}</div> : null}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'primary' | 'accent'; children: ReactNode }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>
}
```

`src/components/ui/list.tsx`:

```tsx
import type { ReactNode } from 'react'

export function List({ children }: { children: ReactNode }) {
  return <ul className="ui-list">{children}</ul>
}

export function ListItem({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  if (!onClick) return <li className="ui-list__item">{children}</li>
  return (
    <li className="ui-list__item ui-list__item--interactive">
      <button type="button" className="ui-list__button" onClick={onClick}>
        {children}
      </button>
    </li>
  )
}
```

`src/components/ui/empty-state.tsx`:

```tsx
import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__title">{title}</div>
      {description ? <div>{description}</div> : null}
      {action}
    </div>
  )
}
```

`src/components/ui/page-header.tsx`:

```tsx
import type { ReactNode } from 'react'

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ui-page-header">
      <div>
        <h1 className="ui-page-header__title">{title}</h1>
        {description ? <p className="ui-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </div>
  )
}
```

`src/app/ui.css`:

```css
/* ─── UI kit — Glass Health style (docs/redesign-glass.md §5) ─── */
.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-sm);
  height: 36px;
  padding: 0 var(--gap-lg);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.ui-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ui-btn--sm { height: 32px; padding: 0 var(--gap-md); }
.ui-btn--lg { height: 44px; padding: 0 var(--gap-xl); font-size: var(--text-base); }
.ui-btn--primary { background: var(--primary); color: var(--text-on-accent); }
.ui-btn--primary:hover:not(:disabled) { background: var(--primary-hover); }
.ui-btn--secondary { background: var(--surface); border-color: var(--border); color: var(--text); }
.ui-btn--secondary:hover:not(:disabled) { background: var(--surface-subtle); }
.ui-btn--accent { background: var(--accent); color: var(--text-on-accent); }
.ui-btn--accent:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 88%, #000000); }
.ui-btn--ghost { background: transparent; color: var(--text-secondary); }
.ui-btn--ghost:hover:not(:disabled) { background: var(--surface-subtle); color: var(--text); }

.ui-btn:focus-visible,
.ui-chip:focus-visible,
.ui-tab:focus-visible,
.ui-list__button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.ui-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 var(--gap-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: var(--text-sm);
  white-space: nowrap;
  cursor: pointer;
}
.ui-chip:hover { background: var(--surface-subtle); }
.ui-chip[aria-pressed="true"] { background: var(--primary-tint); border-color: var(--primary); color: var(--primary); }

.ui-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}
.ui-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-md);
  padding: var(--gap-md) var(--gap-lg);
  border-bottom: 1px solid var(--border);
}
.ui-card__title { margin: 0; font-size: var(--text-base); font-weight: 600; color: var(--text); }
.ui-card__body { padding: var(--gap-lg); }

.ui-tabs { display: flex; gap: var(--gap-xs); border-bottom: 1px solid var(--border); }
.ui-tab {
  position: relative;
  height: 36px;
  padding: 0 var(--gap-md);
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}
.ui-tab:hover { color: var(--text); }
.ui-tab[aria-selected="true"] { color: var(--primary); }
.ui-tab[aria-selected="true"]::after {
  content: "";
  position: absolute;
  left: var(--gap-md);
  right: var(--gap-md);
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--primary);
}

.ui-input {
  width: 100%;
  height: 36px;
  padding: 0 var(--gap-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: var(--text-sm);
}
.ui-input::placeholder { color: var(--text-secondary); }
.ui-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-tint); }
.ui-search { position: relative; display: block; }
.ui-search__icon { position: absolute; left: var(--gap-md); top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
.ui-search__input { padding-left: 36px; }
.ui-field { display: grid; gap: 6px; }
.ui-field__label { font-size: var(--text-sm); font-weight: 500; color: var(--text); }
.ui-field__hint { font-size: var(--text-xs); color: var(--text-secondary); }

.ui-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: var(--gap-lg);
  background: rgba(15, 23, 42, 0.32);
}
.ui-dialog {
  width: 100%;
  max-height: calc(100vh - 32px);
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-dialog);
}
.ui-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-md);
  padding: var(--gap-lg) var(--gap-xl);
}
.ui-dialog__title { margin: 0; font-size: var(--text-lg); font-weight: 600; color: var(--text); }
.ui-dialog__body { padding: 0 var(--gap-xl) var(--gap-xl); }
.ui-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--gap-sm);
  padding: var(--gap-md) var(--gap-xl);
  border-top: 1px solid var(--border);
}

.ui-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 var(--gap-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.ui-badge--neutral { background: var(--surface-subtle); color: var(--text-secondary); }
.ui-badge--primary { background: var(--primary-tint); color: var(--primary); }
.ui-badge--accent { background: var(--accent-tint); color: var(--accent); }
.ui-badge--critical { background: var(--critical-tint); color: var(--critical); }
.ui-badge--warning { background: var(--warning-tint); color: var(--warning); }
.ui-badge--success { background: var(--success-tint); color: var(--success); }

.ui-alert {
  display: grid;
  gap: var(--gap-xs);
  padding: var(--gap-md) var(--gap-lg);
  border-left: 2px solid currentColor;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: var(--text-sm);
}
.ui-alert--critical { color: var(--critical); background: var(--critical-tint); }
.ui-alert--warning { color: var(--warning); background: var(--warning-tint); }
.ui-alert--success { color: var(--success); background: var(--success-tint); }
.ui-alert__head { display: flex; align-items: baseline; gap: var(--gap-sm); }
.ui-alert__word { font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.04em; }
.ui-alert__title { font-weight: 600; color: var(--text); }
.ui-alert__body { color: var(--text); }

.ui-list { margin: 0; padding: 0; list-style: none; }
.ui-list__item {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  min-height: 44px;
  padding: var(--gap-sm) var(--gap-md);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
}
.ui-list__item:last-child { border-bottom: 0; }
.ui-list__item--interactive { padding: 0; }
.ui-list__button {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  width: 100%;
  min-height: 44px;
  padding: var(--gap-sm) var(--gap-md);
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.ui-list__button:hover { background: var(--surface-subtle); }

.ui-empty {
  display: grid;
  justify-items: center;
  gap: var(--gap-sm);
  padding: var(--gap-2xl) var(--gap-lg);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.ui-empty__title { font-size: var(--text-base); font-weight: 600; color: var(--text); }

.ui-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gap-lg);
  margin-bottom: var(--gap-xl);
}
.ui-page-header__title { margin: 0; font-size: var(--text-xl); font-weight: 600; color: var(--text); }
.ui-page-header__description { margin: var(--gap-xs) 0 0; font-size: var(--text-sm); color: var(--text-secondary); }
.ui-page-header__actions { display: flex; flex-wrap: wrap; gap: var(--gap-sm); }
```

In `src/app/layout.tsx` add `import './ui.css'` directly after `import './globals.css'`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/components/ui/ui.test.tsx`
Expected: PASS — 5 tests.
Run: `pnpm run lint`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/ui.css src/app/layout.tsx scripts/test-suite.ts src/components/ui/cx.ts src/components/ui/button.tsx src/components/ui/chip.tsx src/components/ui/card.tsx src/components/ui/tabs.tsx src/components/ui/input.tsx src/components/ui/dialog.tsx src/components/ui/status.tsx src/components/ui/list.tsx src/components/ui/empty-state.tsx src/components/ui/page-header.tsx src/components/ui/ui.test.tsx
git commit -m "feat(medboard): Glass style component kit with worded clinical status (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Shell — icon rail, header, footer

**Files:**
- Create: `src/components/shell/nav-items.ts`, `src/components/shell/initials.ts`, `src/components/shell/shell.test.ts`, `src/components/AppHeader.tsx`, `src/app/shell.css`
- Rewrite: `src/components/AppNav.tsx`, `src/components/AppFooter.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css` (old shell rules removed), `scripts/test-suite.ts`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces:
  - `NAV_GROUPS: NavGroup[]`, `NavGroup = { label: string; items: NavItem[] }`, `NavItem = { href: string; label: string; icon: LucideIcon }`
  - `isNavActive(pathname: string, href: string): boolean`
  - `NAV_COLLAPSED_KEY = 'puskesmas:nav-collapsed'`, `readNavCollapsed(stored: string | null): boolean`
  - `initials(name: string): string`
  - Layout class names: `.app-shell`, `.app-rail`, `.app-main`, `.app-header`, `.app-content`, `.app-page-stack`, `.app-footer`

- [ ] **Step 1: Write the failing test**

Create `src/components/shell/shell.test.ts`:

```ts
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { initials } from './initials'
import { isNavActive, NAV_GROUPS, readNavCollapsed } from './nav-items'

const hrefs = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href))

test('every rail item opens a page that exists', () => {
  const missing = hrefs.filter(
    (href) => !existsSync(path.join(process.cwd(), 'src/app', href, 'page.tsx'))
  )
  assert.deepEqual(missing, [])
})

test('pages that were only in the old footer stay reachable from the rail', () => {
  const formerFooterAndNav = [
    '/emr', '/hub', '/voice', '/acars', '/icdx', '/calculator', '/critical-mind', '/report',
    '/chat', '/telemedicine', '/dashboard/intelligence', '/audit/logbook', '/admin',
  ]
  assert.deepEqual(formerFooterAndNav.filter((href) => !hrefs.includes(href)), [])
})

test('a nested page lights up its parent menu item, a look-alike path does not', () => {
  assert.equal(isNavActive('/hub', '/hub'), true)
  assert.equal(isNavActive('/hub/dr-ani', '/hub'), true)
  assert.equal(isNavActive('/report/clinical', '/report'), true)
  assert.equal(isNavActive('/hubx', '/hub'), false)
  assert.equal(isNavActive('/', '/hub'), false)
})

test('a new user starts with the narrow rail; a returning user keeps their choice', () => {
  assert.equal(readNavCollapsed(null), true)
  assert.equal(readNavCollapsed('true'), true)
  assert.equal(readNavCollapsed('false'), false)
})

test('the avatar shows name initials without titles or degrees', () => {
  assert.equal(initials('dr. Budi Santoso, Sp.PD'), 'BS')
  assert.equal(initials('Ani'), 'A')
  assert.equal(initials('  '), '?')
})
```

Add `'src/components/shell/shell.test.ts'` to the `design` suite `args` in `scripts/test-suite.ts`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/components/shell/shell.test.ts`
Expected: FAIL with `Cannot find module './initials'`.

- [ ] **Step 3: Write the shell modules**

`src/components/shell/nav-items.ts`:

```ts
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Brain,
  Calculator,
  FileSearch,
  FileText,
  MessageSquare,
  Mic,
  RadioTower,
  ScrollText,
  Shield,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Klinis',
    items: [
      { href: '/emr', label: 'EMR Console', icon: Stethoscope },
      { href: '/telemedicine', label: 'Telemedicine', icon: Video },
      { href: '/voice', label: 'Consult Audrey', icon: Mic },
      { href: '/icdx', label: 'Smart ICD-10', icon: FileSearch },
      { href: '/calculator', label: 'SenCall', icon: Calculator },
      { href: '/critical-mind', label: 'Critical Mind', icon: Brain },
    ],
  },
  {
    label: 'Tim',
    items: [
      { href: '/hub', label: 'Sentra HUB', icon: Users },
      { href: '/acars', label: 'Sentra Network', icon: RadioTower },
      { href: '/chat', label: 'Team Chat', icon: MessageSquare },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { href: '/report', label: 'Report', icon: FileText },
      { href: '/dashboard/intelligence', label: 'Intelligence Monitor', icon: Activity },
      { href: '/audit/logbook', label: 'Audit Log', icon: ScrollText },
      { href: '/admin', label: 'Admin', icon: Shield },
    ],
  },
]

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export const NAV_COLLAPSED_KEY = 'puskesmas:nav-collapsed'

export function readNavCollapsed(stored: string | null): boolean {
  return stored !== 'false'
}
```

`src/components/shell/initials.ts`:

```ts
// "dr. Budi Santoso, Sp.PD" -> "BS": degrees after the comma and dotted titles are skipped.
export function initials(name: string): string {
  const words = name
    .replace(/,.*$/, '')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !word.endsWith('.'))
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/components/shell/shell.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Rewrite the rail, header and footer**

`src/components/AppNav.tsx` (whole file):

```tsx
'use client'

import { PanelLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isNavActive, NAV_COLLAPSED_KEY, NAV_GROUPS, readNavCollapsed } from './shell/nav-items'

export default function AppNav() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    setCollapsed(readNavCollapsed(localStorage.getItem(NAV_COLLAPSED_KEY)))
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleCollapsed() {
    setCollapsed((previous) => {
      localStorage.setItem(NAV_COLLAPSED_KEY, String(!previous))
      return !previous
    })
  }

  return (
    <nav className={collapsed ? 'app-rail' : 'app-rail app-rail--open'} aria-label="Navigasi utama">
      <button
        type="button"
        className="app-rail__toggle"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        title={collapsed ? 'Lebarkan menu (Ctrl+B)' : 'Ciutkan menu (Ctrl+B)'}
      >
        <PanelLeft size={18} strokeWidth={1.75} aria-hidden />
      </button>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="app-rail__group">
          {collapsed ? null : <div className="app-rail__group-label">{group.label}</div>}
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'app-rail__item is-active' : 'app-rail__item'}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
              >
                <span className="app-rail__icon">
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                {collapsed ? null : <span className="app-rail__label">{label}</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
```

`src/components/AppHeader.tsx`:

```tsx
'use client'

import { LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { initials } from './shell/initials'

interface ProfileResponse {
  user?: { displayName?: string; profession?: string }
  profile?: { fullName?: string }
}

function formatHeaderDate(value: Date): string {
  return value.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function AppHeader() {
  const [name, setName] = useState('')
  const [profession, setProfession] = useState('')
  const [today, setToday] = useState(() => new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/auth/profile', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ProfileResponse | null) => {
        if (!alive) return
        setName(data?.profile?.fullName || data?.user?.displayName || '')
        setProfession(data?.user?.profession || '')
      })
      .catch(() => {
        if (alive) setName('')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => setToday(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function handleLogout() {
    setLogoutError(null)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (!response.ok) {
        setLogoutError('Gagal logout. Silakan coba lagi.')
        return
      }
    } catch {
      setLogoutError('Koneksi bermasalah saat logout. Silakan coba lagi.')
      return
    }
    window.location.reload()
  }

  return (
    <header className="app-header">
      <span aria-hidden />
      <a className="app-header__brand" href="https://sentrahai.com/" target="_blank" rel="noopener noreferrer">
        <img src="/sentradash.png" alt="" width={22} height={22} />
        <span>MedBoard</span>
      </a>
      <div className="app-header__end">
        <span className="app-header__date">{formatHeaderDate(today)}</span>
        <div className="app-header__account" ref={accountRef}>
          <button
            type="button"
            className="app-header__avatar"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={name || 'Akun'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {initials(name)}
          </button>
          {menuOpen ? (
            <div className="app-header__menu" role="menu">
              <div className="app-header__menu-who">
                <div className="app-header__menu-name">{name || 'Crew'}</div>
                {profession ? <div className="app-header__menu-meta">{profession}</div> : null}
              </div>
              <Link href="/" role="menuitem" className="app-header__menu-item" onClick={() => setMenuOpen(false)}>
                <User size={16} strokeWidth={1.75} aria-hidden />
                Profil User
              </Link>
              <button type="button" role="menuitem" className="app-header__menu-item" onClick={handleLogout}>
                <LogOut size={16} strokeWidth={1.75} aria-hidden />
                Keluar
              </button>
              {logoutError ? (
                <p role="alert" className="app-header__menu-error">
                  {logoutError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
```

`src/components/AppFooter.tsx` (whole file):

```tsx
import Link from 'next/link'

export default function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer" aria-label="Footer aplikasi">
      <Link href="/legal" className="app-footer__link">
        Legal
      </Link>
      <span aria-hidden>·</span>
      <Link href="/legal#disclaimer" className="app-footer__link">
        Disclaimer AI
      </Link>
      <span aria-hidden>·</span>
      <span>© {year} Sentra Healthcare Solutions</span>
    </footer>
  )
}
```

`src/app/shell.css`:

```css
/* ─── App shell — icon rail, header, content, footer (docs/redesign-glass.md §4) ─── */
.app-shell { display: flex; min-height: 100vh; background: var(--surface); }

.app-rail {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--gap-sm);
  width: 56px;
  height: 100vh;
  padding: var(--gap-md) var(--gap-sm);
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--surface-subtle);
  border-right: 1px solid var(--border);
  transition: width 0.2s ease;
}
.app-rail--open { width: 240px; }
.app-rail__toggle {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.app-rail__toggle:hover { background: var(--surface); color: var(--text); }
.app-rail__group {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding-top: var(--gap-sm);
  border-top: 1px solid var(--border);
}
.app-rail__group-label { padding: 0 var(--gap-sm) var(--gap-xs); font-size: var(--text-xs); font-weight: 500; color: var(--text-secondary); }
.app-rail__item {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  height: 40px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
}
.app-rail__item:hover { background: var(--surface); color: var(--text); }
.app-rail__item:focus-visible, .app-rail__toggle:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.app-rail__icon { display: grid; place-items: center; flex-shrink: 0; width: 40px; height: 40px; border-radius: var(--radius-sm); }
.app-rail__item.is-active { color: var(--primary); }
.app-rail__item.is-active .app-rail__icon { background: var(--primary); color: var(--text-on-accent); }
.app-rail__label { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.app-main { display: flex; flex: 1; flex-direction: column; min-width: 0; }

.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 56px;
  padding: 0 var(--gap-xl);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.app-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-sm);
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
}
.app-header__end { display: flex; align-items: center; justify-content: flex-end; gap: var(--gap-lg); }
.app-header__date { font-size: var(--text-sm); color: var(--text-secondary); }
.app-header__account { position: relative; }
.app-header__avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: var(--text-on-accent);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}
.app-header__avatar:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.app-header__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  padding: var(--gap-xs);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-dialog);
}
.app-header__menu-who { margin-bottom: var(--gap-xs); padding: var(--gap-sm) var(--gap-md); border-bottom: 1px solid var(--border); }
.app-header__menu-name { font-size: var(--text-sm); font-weight: 600; color: var(--text); }
.app-header__menu-meta { font-size: var(--text-xs); color: var(--text-secondary); }
.app-header__menu-item {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  width: 100%;
  height: 36px;
  padding: 0 var(--gap-md);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: var(--text-sm);
  text-decoration: none;
  cursor: pointer;
}
.app-header__menu-item:hover { background: var(--surface-subtle); }
.app-header__menu-error { margin: var(--gap-xs) var(--gap-md); font-size: var(--text-xs); color: var(--critical); }

.app-content { flex: 1; padding: var(--gap-xl); }
.app-page-stack { width: 100%; max-width: var(--content-max-width); margin: 0 auto; }

.app-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--gap-sm);
  padding: var(--gap-md) var(--gap-xl);
  border-top: 1px solid var(--border);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.app-footer__link { color: var(--text-secondary); text-decoration: none; }
.app-footer__link:hover { color: var(--text); }

@media (max-width: 767px) {
  .app-header { padding: 0 var(--gap-lg); }
  .app-header__date { display: none; }
  .app-content { padding: var(--gap-lg); }
}
```

- [ ] **Step 6: Wire the layout and drop the old shell CSS**

`src/app/layout.tsx` — imports become:

```tsx
import type { Metadata } from 'next'
import '@fontsource-variable/inter'
import './globals.css'
import './ui.css'
import './shell.css'
import AppFooter from '@/components/AppFooter'
import AppHeader from '@/components/AppHeader'
import AppNav from '@/components/AppNav'
import CrewAccessGate from '@/components/CrewAccessGate'
```

and the returned tree becomes:

```tsx
    <html lang="id">
      <body>
        <CrewAccessGate>
          <div className="app-shell">
            <AppNav />
            <div className="app-main">
              <AppHeader />
              <main className="app-content">
                <div className="app-page-stack">{children}</div>
              </main>
              <AppFooter />
            </div>
          </div>
        </CrewAccessGate>
      </body>
    </html>
```

Run: `node <scratchpad>/strip-css.mjs src/app/globals.css shell`
Expected: dropped list contains only `.app-shell`, `.app-nav…`, `.nav-…`, `.app-content`, `.app-page-stack`, `.app-footer…`, the `:root` block with `--nav-bg`, the two `@media` blocks that held only footer/content rules, and the shell section comments. `grep -nE "^\.(app-nav|nav-|app-footer)" src/app/globals.css` prints nothing.

- [ ] **Step 7: Verify**

Run: `node ./node_modules/tsx/dist/cli.mjs --test src/components/shell/shell.test.ts src/components/ui/ui.test.tsx src/app/design-tokens.test.ts`
Expected: PASS — 15 tests.
Run: `pnpm run lint`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/shell/nav-items.ts src/components/shell/initials.ts src/components/shell/shell.test.ts src/components/AppHeader.tsx src/components/AppNav.tsx src/components/AppFooter.tsx src/app/shell.css src/app/layout.tsx src/app/globals.css scripts/test-suite.ts
git commit -m "feat(medboard): Glass style shell with icon rail, header and one-line footer (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sign-in and request-access card

Presentational only: handlers, state, validation, fetch calls and copy stay byte-identical. No new unit test (nothing testable changes behaviour); verified in Task 6 in the Browser pane.

**Files:**
- Modify: `src/components/CrewAccessGate.tsx` (render section ~lines 341–1045 and the `inputStyle` constant)

**Interfaces:**
- Consumes: `.ui-tabs`, `.ui-tab`, `.ui-field`, `.ui-field__label`, `.ui-input`, `.ui-btn`, `.ui-btn--primary`, `.ui-btn--lg` from Task 3; tokens from Task 1.

- [ ] **Step 1: Restyle the waiting screen and the card**

- Waiting screen (`isCheckingSession`): `background: 'var(--surface-subtle)'`, `color: 'var(--text-secondary)'`, `fontSize: 13`, remove `letterSpacing`; text `VERIFYING CREW ACCESS...` → `Memeriksa akses crew…`.
- Sign-in wrapper `<div>`: `background: 'var(--surface-subtle)'`.
- `<form>` style: `background: 'var(--surface)'`, `border: '1px solid var(--border)'`, `boxShadow: 'var(--shadow-dialog)'`, `borderRadius: 16`, `padding: 32` (keep `width`, `maxWidth`, `display`, `gap`).
- Replace the `CREW PORTAL` `<p>` with a brand row:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <img src="/sentradash.png" alt="" width={22} height={22} />
  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
    MedBoard
  </span>
</div>
```

- [ ] **Step 2: Mode switch as tabs, heading and copy**

Replace the `display: 'grid', gridTemplateColumns: '1fr 1fr'` wrapper `<div>` with `<div className="ui-tabs" role="tablist" aria-label="Mode akses" style={{ marginTop: 16 }}>`. On each of the two buttons keep `type="button"` and the `onClick` body exactly, delete the `style` prop, and add `role="tab"`, `className="ui-tab"`, `aria-selected={authMode === 'signin'}` (first) / `aria-selected={authMode === 'register'}` (second).
`<h1>` style: `margin: '20px 0 4px'`, `fontWeight: 600`, `fontSize: 24`, `color: 'var(--text)'`.
Description `<p>` style: `fontSize: 13`, `color: 'var(--text-secondary)'`.

- [ ] **Step 3: Fields and the submit button**

- The two sign-in `<label style={{ display: 'grid', gap: 6 }}>` → `<label className="ui-field">`; their `<span style=…>` → `<span className="ui-field__label">`; both `<input … style={{ height: 44, … }}>` → delete `style`, add `className="ui-input"`.
- Every `style={inputStyle}` (14 inputs/selects in the request-access steps) → `className="ui-input"`; delete the `inputStyle` constant, and drop `CSSProperties` from the `react` import if nothing else in the file uses it.
- Sign-in error `<p>`: `color: 'var(--critical)'`, `fontSize: 13`.
- Submit `<button type="submit" …>`: delete `style`, add `className="ui-btn ui-btn--primary ui-btn--lg"` and `style={{ marginTop: 4, width: '100%' }}`; keep `disabled={isSubmitting}` and the label expression.
- Bottom note `<p>`: `fontSize: 13`.
- Any remaining `'rgba(212,122,87,0.16)'` in the file → `'var(--primary-tint)'`.

Check: `git diff --stat src/components/CrewAccessGate.tsx` and `git diff src/components/CrewAccessGate.tsx | grep -E "^[-+].*(fetch\(|set[A-Z][A-Za-z]*\(|onSubmit|handle[A-Z])"` prints only lines whose old and new versions are identical apart from attributes (no handler or state change).

- [ ] **Step 4: Verify and commit**

Run: `pnpm run lint`
Expected: exit 0.

```bash
git add src/components/CrewAccessGate.tsx
git commit -m "feat(medboard): sign-in card in the Glass style, no logic change (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Typography pass on every page (runs before Task 6)

Added 2026-10-06 on Chief's message "Text masih cenderung ke arah original, besar kecil text etc". Spec §3 Huruf and the success line ("semua 23 halaman … huruf Inter dan skala Glass") are the authority. This task changes **text only** — size, case, weight, tracking, family. Layout per page (split workspace, card stacks, where headings sit) stays in Plans 2–5. Handlers, state, copy strings, fetch calls and Chart.js options (`font: { size }`) do not change.

**Scope:** every `.tsx`, `.ts`, `.css` and `.module.css` under `src/app/**` and `src/components/**`, except:
`src/app/report/clinical/**` (print sizes fixed, decision `e836d56e`), `src/components/ui/**`, `src/components/shell/**`, `src/app/ui.css`, `src/app/shell.css`, and test files. `src/lib/**` (reports, email in `src/lib/server/email.ts`) is out of scope by construction.

**Rules** (literal values only; a value built from a variable, `var()`, ternary or expression stays and is counted in the report):
- `textTransform: 'uppercase'` (with or without `as const`) and CSS `text-transform: uppercase` → removed. Strings authored in capitals stay as written.
- `letterSpacing` / `letter-spacing` with a literal ≥ 0.05em, or ≥ 1px (string `'1px'` or number `1`) → removed. Negative or smaller values stay.
- `fontWeight` / `font-weight` 700, 800, 900 or `bold` → `600`.
- `fontFamily` / `font-family` that names `monospace`, `… Mono` or `Courier` → removed (text inherits Inter; numbers that need alignment keep or gain `fontVariantNumeric: 'tabular-nums'` only where the same element already had a monospace family).
- `fontSize` number literal, `fontSize: 'Npx' | 'Nrem'`, CSS `font-size: Npx | Nrem` (rem × 16) → snapped onto 11/13/15/17/20/24/30: ≤ 12 → 11; 13–14 → 13; 15–16 → 15; 17–18 → 17; 19–22 → 20; 23–26 → 24; 27–35 → 30; ≥ 36 unchanged. TSX keeps a number (`fontSize: 13`); CSS writes `px`.
- Removing a property removes the whole `prop: value` token and its comma, in both `{ prop: v, a }` and `{ a, prop: v }` positions; a `style={{}}` left empty is deleted; a CSS rule left empty is deleted.

**Files:**
- Modify: `src/app/design-tokens.test.ts` (two tests appended)
- Modify: pages, components and CSS in scope (codemod; keep the script in the SDD workspace, do not commit it)

**Interfaces:**
- Consumes: `read`, `sourceFiles` in `src/app/design-tokens.test.ts` (Task 1); scale tokens `--text-xs … --text-3xl` (Task 1).
- Produces: nothing new; later plans restyle layout on top of this text.

- [ ] **Step 1: Write the two failing tests** — append to `src/app/design-tokens.test.ts`:

```ts
const TYPE_PASS_EXCLUDED = [
  'src/app/report/clinical/',
  'src/components/ui/',
  'src/components/shell/',
  'src/app/ui.css',
  'src/app/shell.css',
]

function typePassFiles(): string[] {
  return [...sourceFiles('src/app'), ...sourceFiles('src/components')]
    .map((file) => file.split(path.sep).join('/'))
    .filter((file) => !TYPE_PASS_EXCLUDED.some((prefix) => file.startsWith(prefix)))
}

test('page text is sentence case, without wide tracking, heavy weights or monospace', () => {
  const legacy = [
    /textTransform:\s*['"]uppercase['"]/,
    /text-transform:\s*uppercase/,
    /letterSpacing:\s*['"](0?\.(0[5-9]|[1-9])\d*|[1-9][\d.]*)em['"]/,
    /letter-spacing:\s*(0?\.(0[5-9]|[1-9])\d*|[1-9][\d.]*)em/,
    /letterSpacing:\s*(['"][1-9][\d.]*px['"]|[1-9][\d.]*\b)/,
    /letter-spacing:\s*[1-9][\d.]*px/,
    /fontWeight:\s*['"]?(bold|[7-9]00)\b/,
    /font-weight:\s*(bold|[7-9]00)\b/,
    /(font-family:[^;]*|fontFamily:[^,}\n]*)(monospace|Mono\b|Courier)/,
  ]
  const offenders = typePassFiles().filter((file) => legacy.some((pattern) => pattern.test(read(file))))
  assert.deepEqual(offenders, [])
})

test('every literal text size on a page sits on the Glass scale 11/13/15/17/20/24/30', () => {
  const scale = new Set([11, 13, 15, 17, 20, 24, 30])
  const offScale: string[] = []
  for (const file of typePassFiles()) {
    const source = read(file)
    const sizes = [
      ...[...source.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)(?=\s*[,}\n])/g)].map((m) => Number(m[1])),
      ...[...source.matchAll(/(?:fontSize:\s*['"]|font-size:\s*)(\d*\.?\d+)(px|rem)\b/g)].map((m) =>
        m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
      ),
    ]
    for (const size of sizes) if (size < 36 && !scale.has(size)) offScale.push(`${file}: ${size}`)
  }
  assert.deepEqual(offScale, [])
})
```

- [ ] **Step 2: Run them to see both fail**

Run: `node scripts/pnpm.mjs run test -- --filter design`
Expected: the two new tests FAIL listing many files / sizes; the other tests PASS.

- [ ] **Step 3: Commit A — case, tracking, weight, family.** Apply those four rules with the codemod, run `npx tsc --noEmit` (exit 0) and the design suite (first new test PASS, size test still FAIL). Grep that no Chart.js `font:` object or `options`/`scales` block changed. Commit only the changed source files plus the test file:
`feat(medboard): page text drops caps, wide tracking, heavy weights and monospace (R2)`

- [ ] **Step 4: Commit B — sizes.** Apply the size rule, run `npx tsc --noEmit` (exit 0), the design suite (all PASS), and the full `node scripts/pnpm.mjs run test` once. Commit:
`feat(medboard): page text sizes snap to the Glass scale (R2)`

- [ ] **Step 5: Report** per file group the counts changed by each rule, and the count of non-literal values left untouched per rule.


### Task 6: Gates, Browser pane check, handoff

**Files:**
- Modify: `.agents/DECISIONS.md`, `.agents/HANDOFF.md`

- [ ] **Step 1: Capsule gates**

Run each and record the exit code:
`pnpm run lint` → 0 · `pnpm run test design` → all pass · `pnpm run test:capsule` → 0 · `pnpm run build` → 0 · `pnpm run deploy:dry-run` → 0.
A red that also fails on the commit before Task 1 (`git stash` is not allowed; compare with the result recorded in `HANDOFF.md`) is an inherited failure: log it, do not fix it here.

- [ ] **Step 2: Contrast probe on every page (Review Focus 1)**

Start the demo server (`medboard-demo`, port 4345) with the Browser pane. For each route — `/`, `/emr`, `/acars`, `/hub`, `/telemedicine`, `/voice`, `/icdx`, `/calculator`, `/critical-mind`, `/chat`, `/report`, `/dashboard/intelligence`, `/audit/logbook`, `/admin`, `/legal` — navigate, wait for load, then run in the page:

```js
(() => {
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number)
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0.5)) return c } return [255, 255, 255] }
  const bad = []
  for (const el of document.querySelectorAll('body *')) {
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('')
    if (!text || el.closest('canvas,svg') || el.offsetParent === null) continue
    const fg = parse(getComputedStyle(el).color), bg = bgOf(el)
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
    const ratio = (a + 0.05) / (b + 0.05)
    if (ratio < 3) bad.push(`${ratio.toFixed(2)} ${text.slice(0, 40)}`)
  }
  return bad.slice(0, 20)
})()
```

Expected: `[]` for every route. Each hit is fixed in this task when it comes from the shell, the kit or a literal Task 2 changed; hits inside page bodies are listed in `HANDOFF.md` for the page plans.

- [ ] **Step 3: Show Chief**

In the Browser pane show: the sign-in card, `/acars` with the rail collapsed, the rail opened with Ctrl+B, the avatar menu open. Console has no errors (`read_console_messages` with `onlyErrors`).

- [ ] **Step 4: Decisions and handoff**

Add to the top of `.agents/DECISIONS.md` (newest first):

```markdown
## 2026-10-06 — Glass Health style replaces IBM Plex on the Carbon scale

- Decision (Chief): MedBoard follows Glass Health — one white theme, Inter on the
  11/13/15/17/20/24/30 scale, Oxford Blue `#002147` primary, red-orange `#E8461E` secondary,
  critical `#B42318` always with the word KRITIS; icon rail, header, one-line footer. Supersedes
  "IBM Plex Sans on the Carbon type scale" (2026-10-05); "alerts without colour blocks" stays.
  Spec `docs/redesign-glass.md`, Plan 1 `docs/redesign-glass-plan-1.md`.
- Evidence: design suite red first then green; gates and Browser pane results in HANDOFF.
```

Overwrite `.agents/HANDOFF.md` with: commits of Tasks 1–5, gate exit codes, contrast probe hits per page, what Plans 2–5 cover, and the unchanged items (production deploy is Chief's call; demo cleanup list).

```bash
git add .agents/DECISIONS.md .agents/HANDOFF.md
git commit -m "docs(medboard): decision and handoff for the Glass redesign foundation" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Next plans (written after this one ships)

- **Plan 2 — EMR Console:** split workspace (left work column, right tabs MIRA DDx / Ringkasan klinis / Riwayat), context bar, Emergency Override banner, EMR chart colours. Chief approves in the Browser pane before commit.
- **Plan 3 — ACARS and Sentra HUB:** list and detail patterns.
- **Plan 4 — Telemedicine:** list and room.
- **Plan 5 — Remaining pages and cleanup:** conversation pattern (`/voice`, `/chat`, `/critical-mind`), list/detail/document pages, removal of unused alias tokens.
