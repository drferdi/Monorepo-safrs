# SAFRS Integration

Gaffer is an orchestration layer, not a second control plane.

Reuse existing SAFRS capabilities for:
- task/run contracts;
- scopes and ownership;
- risk and sensitive-path classification;
- budgets;
- approvals;
- evidence;
- verification gates;
- project capsules;
- assurance/reviewer roles.

The provider-neutral runtime uses injected ports rather than importing guessed SAFRS exports. During repository implementation, map each port to verified existing SAFRS APIs.

Required runtime ports:
- `discoverProject`
- `authorize`
- `rootPlan`
- `rootImplement`
- `executeWorker`
- `verify`
- `rootAccept`
- `listAvailableWorkers`
- optional `audit`

Before wiring, inspect the actual exports of SAFRS modules. Do not rename or replace SAFRS primitives merely to fit Gaffer.
