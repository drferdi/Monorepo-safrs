# Decisions

## 2026-10-14 — Separate public website capsule

Gaffer approved the active `Sentrapediasite` checkout as source of truth and a separate `projects/healthcare/sentrapedia-website` capsule. Preserve the existing Swiss editorial direction and keep the clinical application independent. The capsule carries only the verified website runtime and source closure; optional Remotion authoring and Retriever crawl data stay outside its lifecycle.

## 2026-10-14 - SPDS authority and healthcare boundary

Gaffer directed the website repository to carry documentation aligned with international engineering standards. `PROJECT_GENOME.yaml` and `docs/spds/` are the authoritative project record. The healthcare overlay classifies this capsule as a public marketing website with no intended medical use, no IEC 62304 safety class, no AI runtime, and no autonomous-agent function. Production hosting, contact delivery, privacy retention, monitoring, and public redistribution rights remain separate approval and evidence gates.
