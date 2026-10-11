# Tools context

- Owner: Gaffer. Scope: `tools/**` and the root integrations needed to discover and verify these tools.
- The Monorepo is a governance/work framework. Application tools `prompt` and `retriever` own their manifests, lockfiles, source, configuration, builds, and tests; they must not acquire root runtime dependencies.
- Framework integrations are explicit in `tools/README.md` and each tool README. Governance commands operate on a supplied or enclosing repository; this is a control-plane dependency, never a dependency to inject into application tools.
- Preserve user data, local environment files, vendored Jev code, unrelated changes, task ownership, and existing verification controls. No publishing, provider inference, or database migrations during alignment.

