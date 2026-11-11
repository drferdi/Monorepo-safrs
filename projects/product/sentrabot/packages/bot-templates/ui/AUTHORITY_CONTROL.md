# Authority Control UX

## Ladder
`Observe → Prepare → Propose → Execute`

### Observe
Read/search/retrieve/monitor only.

### Prepare — default
Analyze, reconcile, draft, and recommend. No consequential external effect.

### Propose
Construct a fully specified action and approval request.

### Execute
Only capabilities explicitly granted by policy. Consequential categories remain approval-gated.

## Capability table
Every connected source should show capabilities independently:

| Capability | State |
|---|---|
| Read records | Allowed |
| Draft update | Allowed |
| Update internal work tracker | Approval or Allowed by policy |
| Send externally | Approval required |
| Delete / overwrite | Approval required |
| Change permissions | Approval required |
| Transfer funds | Approval required / often separately protected |

## Approval drawer
An approval request must display:
- exact action
- target
- values / content
- expected effect
- reversibility
- source evidence
- policy reason
- buttons: `Approve once` / `Deny`

Avoid generic “Allow bot to continue?” prompts for high-impact actions.
