# Product / UI System

## Design thesis
The product must answer three questions before it asks the user to trust a bot:
1. **What outcome does this role own?**
2. **Which sources can it see?**
3. **What can it do without me?**

The UI therefore treats role, source-of-truth, authority, and approval boundary as first-class product objects. A friendly bot name is secondary identity, not the control plane.

## Primary onboarding
1. Choose an outcome-owned role.
2. Review mission and explicit exclusions.
3. Connect only required sources.
4. Confirm default authority (`Prepare`).
5. Choose output contract.
6. Run a safe first task.
7. Promote a proven workflow to a skill.
8. Only then configure a routine.

See `prototype/index.html` for a zero-build static reference.
