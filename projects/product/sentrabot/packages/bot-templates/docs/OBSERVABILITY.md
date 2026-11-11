# Observability & Audit Model

## Minimum event record
For consequential work, capture:
- execution / conversation id
- bot template id + version
- policy-pack ids + versions
- model/runtime version when available
- task intent
- source identifiers and retrieval timestamps
- source freshness classification
- tool calls and normalized arguments
- policy decision: ALLOW / REQUIRE_APPROVAL / DENY
- approval actor and timestamp when applicable
- action result / error
- final output hash or immutable reference
- escalation reason

## Recommended operational signals
- approval-bypass attempts
- denied tool calls
- stale-source frequency
- missing-source routine failures
- repeated retries / non-idempotent risk
- prompt-injection detections
- model/tool version change
- evaluation regression after configuration change
- unusually high action volume per routine

## Design rule
Observability is a control surface, not optional debugging metadata. The agent must not be able to disable or rewrite the supervisory record that is used to evaluate its behavior.
