# CONTEXT

- Purpose: Retriever, a web harvester and technology archiver. It combines the WinHTTrack CLI
  engine (offline mirrors) with a Node.js pipeline that extracts clean Markdown corpora for LLM
  and RAG use (`AGENTS.md`, `docs/architecture.md`).
- Human owner: Gaffer. Default risk: R1 (`project.contract.json`).
- Stack: Node.js 24.18.0, pnpm 11.21.0, TypeScript, Electron desktop shell with a macOS-style
  console UI (`project.contract.json`, `README.md`).
- External tool: WinHTTrack v3.50 installed on the host (`C:\Program Files\WinHTTrack\httrack.exe`).
  It is a host prerequisite, not a capsule dependency.
- Contract and commands: `project.contract.json`. Commands run from this capsule root.
- Data: scraped output goes to `data/` (offline mirrors and Markdown corpora). See
  `docs/data.md`; testing in `docs/testing.md`.
- Protected areas: no parent-path imports, `workspace:*` dependencies, or links to other
  capsules; never write outside this capsule.

Treat this folder as public once committed: no secrets, tokens, cookies, or scraped private
content.
