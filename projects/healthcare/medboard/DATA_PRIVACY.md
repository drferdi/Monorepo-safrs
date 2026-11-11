# Data privacy

This document describes high-level privacy commitments for **Puskesmas
Dashboard**. It complements the implementation-focused notes in
[`docs/governance/privacy.md`](./docs/governance/privacy.md). **This is not legal advice**; replace
`PRIVACY_CONTACT_EMAIL` with a monitored inbox before external publication.

## Roles and scope

- **Deployment-specific roles:** Each facility or cloud tenant must identify
  whether it acts as a controller, processor, or both for staff accounts, audit
  logs, and optional clinical artifacts.
- **Data categories:** Prefer minimizing protected health information (PHI).
  Store only what the deployment lawfully requires, with retention aligned to
  policy.

## Indonesia — Personal Data Protection Act (PDPA / UU PDP)

Summarize how the operating organization honors Indonesian personal data
protection requirements, including:

- Legal bases or lawful grounds for processing (as applicable)
- Rights of data subjects (access, correction, deletion where applicable) and
  how requests are submitted
- Retention and deletion practices
- Subprocessors and cross-border transfers (if any), with safeguards

## European Union — GDPR readiness (if applicable)

If services are offered to individuals in the EEA/UK or their behavior is
monitored, document:

- Lawful basis under GDPR Articles 6–9 where relevant
- Data subject rights and response timelines
- Processor agreements (Article 28) and transfer mechanisms (SCCs or
  equivalents)
- Records of processing activities (Article 30) maintained operationally

## Security measures

Describe organizational and technical measures (encryption in transit, access
control, audit logging, vulnerability management) at a level appropriate for
public disclosure. Implementation references: [`SECURITY.md`](./SECURITY.md),
[`docs/governance/privacy.md`](./docs/governance/privacy.md).

## Contact

- Privacy inquiries: **PRIVACY_CONTACT_EMAIL**
- Security reports: see [`SECURITY.md`](./SECURITY.md)

---

_Architected and built by the one and only Drferdi._
