# Overlays

Activate from **evidence**, not from the parent folder name alone. Chief may force overlays with `--overlay`.

## AI (`material_ai`)

Write 70–84 as applicable. If the capsule only *calls* a vendor model and does not train weights, `model_card.md` records the **vendor/service** and says the capsule does not own a trained model. `dataset_datasheet.md` is Not applicable unless a training/eval set is in scope.

Tie to ISO/IEC 42001, 42005, 23894, NIST AI RMF in spirit — do not claim certification.

## Agent (`agentic`)

AI system card is not enough. Write 90–100. `autonomy_envelope.md` must split:

1. Human-only authority
2. Delegated agent authority
3. Execution freedom inside a delegated task

If there is a single agent, `multi_agent_protocol.md` is Not applicable with that reason.

## Healthcare (`healthcare_overlay`)

Write H01–H10 **even when the product is not a device**, if Chief asked for the full set or the capsule sits in a health domain. In the non-device case, H01 states **intended medical use: none**, and H05 states **IEC 62304 not applicable**. Do not self-assign Class A/B/C as a workaround.

If the product **is** health software / SaMD / medical device, fill H01–H10 as a real overlay (ISO 13485, ISO 14971, IEC 62304, applicable health-software cybersecurity). Do not pretend a QMS exists if it does not.

## Operations, privacy, legal

Write when the flags in SKILL.md match. Internal executive tools still need data classification if they process personal data. Unofficial messengers (e.g. Baileys) are a named risk, not a hidden footnote.
