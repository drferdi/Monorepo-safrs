# Testing

`tests/smoke.test.mjs` starts the application in development mode on a loopback port and verifies that the home page responds successfully and identifies itself as UNICOM. `scripts/smoke-production.mjs` performs the equivalent production-runtime probe after a build.

`scripts/verify-structure.mjs` rejects parent-path references and root-workspace dependencies. `scripts/verify-extraction.mjs` executes the lifecycle proof from a fresh temporary extraction of this capsule.
