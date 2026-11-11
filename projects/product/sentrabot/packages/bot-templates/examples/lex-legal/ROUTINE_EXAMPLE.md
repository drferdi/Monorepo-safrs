# Lex — Routine Promotion Example

## Phase A — one-time task
Run the proposed workflow manually in **Prepare** mode against current approved sources.

## Phase B — save as skill
Document required inputs, source classes, steps, validation, output format, failure behavior, and approval boundaries.

## Phase C — safe test run
Use non-destructive inputs. Confirm that stale/missing sources are reported and consequential actions stop for approval.

## Phase D — routine
Only after the above passes, schedule or event-trigger the workflow. Keep external communication and other consequential actions behind explicit approval unless an organization-specific policy deliberately grants a narrowly scoped capability.
