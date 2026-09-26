CRITICAL DESIGN LOCK — SENTRA ASSIST

Important owner instruction:

The current source factory produces an awful, rejected UI design.

Do NOT use the current source UI as the design reference.

The GOLDEN_BUILD_ARTIFACT is the ONLY approved design.

Approved design source:
(legacy) code-prototype\prototpe-assist.output\golden-build

Rejected design source:
Current old repo UI implementation, unless it exactly matches the golden build.

Design hierarchy:

1. GOLDEN_BUILD_ARTIFACT visual/UI behavior = source of truth.
2. Current source UI = implementation candidate only, not design authority.
3. If source UI conflicts with golden UI, golden UI wins.
4. Do not invent a new design.
5. Do not beautify from taste.
6. Do not redesign.
7. Do not use the old factory’s awful UI as acceptable output.

UI recovery mission:
Make the source factory reproduce the golden build UI, not merely compile the old UI.

Extract from golden build:

- layout
- spacing
- panel structure
- color behavior
- typography behavior
- component hierarchy
- screen order
- navigation flow
- button labels
- button placement
- card structure
- alert visual hierarchy
- clinical trajectory presentation
- differential reasoning presentation
- emergency screen presentation
- VS/TTV inference presentation
- standby mode presentation
- settings screen presentation
- login/dashboard presentation
- sidepanel width/behavior
- popup/sidepanel runtime behavior
- CSS assets
- generated class names where useful
- any hotfix CSS/JS such as trajectory-card-hotfix.css or emergency-step-hotfix.js

Implementation rule:
Use old source components only as logic holders.
If old components render a rejected UI, refactor their presentation to match the golden build.

Do not mark a feature as recovered if:

- the logic works but UI is from rejected old factory design
- the screen exists but visual hierarchy differs from golden
- the flow works but layout does not match golden
- emergency/trajectory/differential UI is not golden-equivalent

Add to recovery docs:

1. _recovery/extracted/GOLDEN_UI_DESIGN_SPEC.md
2. _recovery/gap/GOLDEN_UI_PARITY_GAP_MATRIX.md
3. _recovery/tests/GOLDEN_UI_ACCEPTANCE_TEST.md

UI acceptance criteria:

- Login matches golden.
- Dashboard matches golden.
- Sidepanel console matches golden.
- VS/TTV inference screen matches golden.
- Emergency screen matches golden.
- Settings screen matches golden.
- Clinical Trajectory screen matches golden.
- Differential reasoning screen matches golden.
- Alert visual hierarchy matches golden.
- Standby mode matches golden.
- Old rejected UI is not visible in final build.

Final report must include:

- UI parity status
- Screens matched to golden
- Screens still using rejected old UI
- CSS/TSX files changed for golden parity
- Remaining UI blockers

Factory recovery target is now:
Buildable source factory + golden behavior parity + golden UI parity.

Do not produce the awful old UI.
Golden build is the only approved design.
