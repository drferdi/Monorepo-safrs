# Environment Model

Recommended separation:
- development: synthetic/non-sensitive data, no consequential writes
- evaluation: controlled representative data, isolated credentials, action simulation where possible
- staging: production-like policies, approval service enabled, restricted targets
- production: least-privilege service accounts, full audit, explicit approval rules, monitored routines

Do not reuse broad personal browser sessions as the sole production authorization mechanism for enterprise workflows.
