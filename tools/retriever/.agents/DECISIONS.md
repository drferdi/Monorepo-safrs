# DECISIONS

## D-001 — 2026-10-10 — Keep Retriever local for now

- **Decision (Gaffer)**: complete the `.agents/` files so SAFRS checks pass locally, but do not
  commit the capsule yet.
- **Why**: the capsule has no `.gitignore`; committing now would add build output and
  dependencies to the repository.
- **Revisit**: when Gaffer decides to publish or share Retriever.
