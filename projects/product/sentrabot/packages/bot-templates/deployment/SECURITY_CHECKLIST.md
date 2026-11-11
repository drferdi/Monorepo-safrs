# Security Checklist

- [ ] Each connector uses minimum necessary scope.
- [ ] Read-only credential exists for prepare-only workflows where possible.
- [ ] Production write capabilities are enumerated individually.
- [ ] Mandatory approval categories are enforced outside prompt text.
- [ ] Retrieved external content is treated as untrusted.
- [ ] Secrets never enter normal prompt context unnecessarily.
- [ ] Bot separation is not relied on for credential isolation.
- [ ] Audit logs cannot be disabled by the agent.
- [ ] External egress is restricted where the risk model requires it.
- [ ] Rate/volume limits exist for consequential actions.
- [ ] Emergency kill/pause path is tested.
- [ ] Connector revocation procedure is documented.
