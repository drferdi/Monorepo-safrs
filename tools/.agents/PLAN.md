# Tools alignment - 2026-10-11

Authorized by Gaffer: align all contents of `tools` with the documented governance and standalone boundaries.

1. Record scoped task ownership; leave conflicting checker/lint configuration paths untouched until Gaffer authorizes takeover.
2. Extend standalone discovery and capability selection to `tools/<name>` with containment and symlink checks; retain existing project selectors. Add regression tests before changing behavior.
3. Align Prompt/Retriever contracts, lifecycle commands, and launchers. Replace Retriever placeholder checks with real local checks without installing dependencies.
4. Document every tool's purpose, entry point, tests, side effects, and explicit framework dependencies. Correct stale command and agent links.
5. Run targeted tests and checks, record inherited blockers without bypassing gates, and add handoff entries. Do not commit or publish.

