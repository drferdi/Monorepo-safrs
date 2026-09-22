# Active Plans

Active plans are the current operational/implementation state. When a plan's
acceptance criteria are met, move it to `docs/plans/completed/` following the
SAFRS document lifecycle (ACTIVE → COMPLETED → ARCHIVED).

Plan files themselves are internal working documents and are kept out of the
repository (`.gitignore`); only this README and the ones in `completed/` and
`archived/` are tracked, so the directory contract that `check_topology.py`
and `AGENTS.md` rely on exists in every checkout. Phase-level progress is
tracked in `.agents/PROGRESS.md`.
