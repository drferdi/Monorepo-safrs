# AGENTS.md — Capsule Guidance for Retriever

## 1. Capsule Identity & Scope
- **ID**: `tools/retriever` (monorepo facility: website scraper for our datasets; planned to move to its own repository)
- **Owner**: Gaffer (dr. Ferdi Iskandar)
- **Purpose**: Autonomous web harvester and technology archiver combining WinHTTrack CLI engine with Node.js markdown extraction pipeline.

## 2. Invariants
- Adheres to SAFRS I-01, I-02, and I-03.
- Standalone dependencies managed exclusively through capsule `package.json` and `pnpm-lock.yaml`.
- Never couples to monorepo root config or foreign scripts.
- Never mutates scripts outside its workspace boundary.
