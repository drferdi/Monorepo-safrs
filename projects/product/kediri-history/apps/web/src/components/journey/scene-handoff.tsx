import type { ReactElement } from "react";

/**
 * Jembatan visual antarbabak. Semua node di sini dekoratif: tidak ada kata,
 * angka, atau bentuk yang menjadi bukti sejarah. Makna historis tetap berada
 * di naskah scene; handoff hanya mempertahankan material/arah pandang ketika
 * satu shot berubah menjadi shot berikutnya.
 */
export const SCENE_HANDOFFS = {
  "water-copper": {
    from: "water-reflection",
    to: "copper-inscription",
  },
  "inscription-mark": {
    from: "inscription-groove",
    to: "written-mark-kadhiri",
  },
  "name-world": {
    from: "name-kadhiri",
    to: "date-world",
  },
  "record-territory": {
    from: "written-record",
    to: "geographic-field-brantas",
  },
  "territory-centre": {
    from: "divided-territory",
    to: "centre-gravity",
  },
} as const;

export type SceneHandoffKind = keyof typeof SCENE_HANDOFFS;

export type SceneHandoffPhase = "incoming" | "outgoing";

export function SceneHandoff({
  kind,
  phase,
}: {
  readonly kind: SceneHandoffKind;
  readonly phase: SceneHandoffPhase;
}): ReactElement {
  const relation = SCENE_HANDOFFS[kind];
  return (
    <div
      className="scene-handoff"
      data-handoff={kind}
      data-handoff-phase={phase}
      data-handoff-from={relation.from}
      data-handoff-to={relation.to}
      data-motion="handoff"
      aria-hidden="true"
    >
      <span
        className="scene-handoff__outgoing"
        data-handoff-element="outgoing"
      />
      <span
        className="scene-handoff__transform"
        data-handoff-element="transform"
      />
      <span
        className="scene-handoff__incoming"
        data-handoff-element="incoming"
      />
    </div>
  );
}
