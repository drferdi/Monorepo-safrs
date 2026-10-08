# Setup Guide — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Prerequisites

| Tool    | Required Version            | Check            |
| ------- | --------------------------- | ---------------- |
| Node.js | **22.x LTS minimum**        | `node --version` |
| npm     | 10.x (bundled with Node 22) | `npm --version`  |
| Git     | 2.40+                       | `git --version`  |

> **Node.js version is enforced.** The bootstrap script (`scripts/setup.sh`)
> exits with an error if the major version is below 22. This matches the Railway
> production environment.

If you need to manage multiple Node versions, use
[nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
```

---

## Installation

### Option A — Bootstrap script (recommended)

```bash
git clone <repository-url>
cd sentra-main
bash scripts/setup.sh
```

The script checks your Node version, runs `npm ci` (clean install from
lockfile), and prints next steps.

### Option B — Manual

```bash
git clone <repository-url>
cd sentra-main
npm ci
```

---

## Environment Variables

**No environment variables are required to run the development server.**

This is a fully static site — no database, no external API calls, no
authentication. The `.env.example` file is provided as a placeholder for future
integrations.

---

## Running the Development Server

```bash
# Webpack mode — stable, recommended for daily development
npm run dev
```

```bash
# Turbopack mode — faster HMR, experimental
npm run dev:turbo
```

The app will be available at **[http://localhost:3000](http://localhost:3000)**.

### What to expect on first load

- The home page is the neural journey: a pinned stage scrubbed by the scroll
  through fifteen chapters, ending on the founder's film
- The film's frames load once the story reaches the network chapter, not with
  the page

---

## Building for Production

```bash
# 1. Type-check + build
npm run build

# 2. Run production server locally
npm run start
```

The production build runs a full TypeScript check before generating the Next.js
bundle. Zero type errors are required — the build will fail otherwise.

### Verify security headers locally

After `npm run start`, use curl to confirm headers are present:

```bash
curl -I http://localhost:3000 | grep -E "x-frame|x-content|strict-transport|content-security"
```

---

## Available Scripts

| Script      | Command                 | Description                                   |
| ----------- | ----------------------- | --------------------------------------------- |
| Development | `npm run dev`           | Dev server on :3000 (webpack, stable)         |
| Dev (fast)  | `npm run dev:turbo`     | Dev server on :3000 (Turbopack, experimental) |
| Build       | `npm run build`         | TypeScript check + production bundle          |
| Start       | `npm run start`         | Run production build locally                  |
| Lint        | `npm run lint`          | ESLint across all source files                |
| Bootstrap   | `bash scripts/setup.sh` | First-time setup with Node version check      |

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
