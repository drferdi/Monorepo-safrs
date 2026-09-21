# Routing

## Optimization target
Minimize expected cost per verified accepted task, not token price per call.

## Top-level route
Use `SOLO` for small/local work, high ambiguity, or when delegation overhead is unlikely to pay back.

Use `DECOMPOSE` when work is separable, multi-unit, cross-boundary, or contains substantial bounded mechanical implementation.

## Worker classes
- `ROOT`: user intent, architecture, ambiguity resolution, final semantic acceptance.
- `ECONOMY`: bounded, testable, architecture-settled, low-risk implementation.
- `STRONG`: capability escalation and judgment-heavy/high-risk implementation.

## Economy eligibility
All should be true:
- objective explicit;
- scope bounded;
- interfaces known;
- architecture settled;
- verification available;
- SAFRS risk permits Economy;
- no unresolved product ambiguity.

## Escalation
- `CAPABILITY_MISMATCH` from Economy -> Strong immediately.
- `SPEC_ERROR` -> at most one corrected Economy attempt.
- scope violation -> reject/block.
- budget exhaustion -> block.
- never perform unbounded retries.
