// Designed and constructed by Drferdi.
/**
 * Action Protocol Resolver — links alerts to an existing action-protocols.ts
 * entry (ABCDE stabilization steps) only where the mapping is unambiguous.
 *
 * Confirmed row-by-row with Chief. Does not author any new protocol content.
 * See docs/specs/2026-07-06-triage-zone-verdict-design.md for the full
 * mapping rationale, including why several alert types are deliberately
 * left unmapped.
 *
 * @module lib/emergency-detector/action-protocol-resolver
 */

export interface ProtocolResolvableAlert {
  id: string;
  type: string;
  gate: string;
  actionProtocolId?: string;
  clinicalData?: { sbp?: number };
}

/** Legacy inline-gate alert types with an unambiguous existing protocol. */
const TYPE_TO_PROTOCOL: Record<string, string> = {
  hypotension: 'PROTO_SHOCK',
  occult_shock: 'PROTO_SHOCK',
  hypoglycemia: 'PROTO_HYPOGLYCEMIA',
  hyperglycemia: 'PROTO_DKA_HHS',
  hypoxia: 'PROTO_RESP_FAILURE',
};

/**
 * CODE RED cue fields with an unambiguous protocol regardless of direction.
 * 'sbp' and 'hr' are handled separately below since they need extra
 * disambiguation (sbp: direction; hr: no safe mapping in either direction).
 */
const CODE_RED_FIELD_TO_PROTOCOL: Record<string, string> = {
  spo2: 'PROTO_RESP_FAILURE',
  rr: 'PROTO_RESP_FAILURE',
  glucose: 'PROTO_HYPOGLYCEMIA', // only the <50 direction ever triggers this cue
};

const CODE_RED_ID_PREFIX = 'guardrail-code-red-';
const SHOCK_LEVEL_SBP_CEILING = 80;

/**
 * Resolves an action-protocols.ts id for an alert, or undefined when the
 * mapping would be ambiguous (e.g. generic AVPU/BP/HR findings, or a CODE
 * RED cue whose direction/cause can't be determined safely).
 */
export function resolveActionProtocolId(alert: ProtocolResolvableAlert): string | undefined {
  if (alert.actionProtocolId) return alert.actionProtocolId;

  const byType = TYPE_TO_PROTOCOL[alert.type];
  if (byType) return byType;

  if (alert.id.startsWith(CODE_RED_ID_PREFIX)) {
    const field = alert.id.slice(CODE_RED_ID_PREFIX.length);

    if (field === 'sbp') {
      const sbp = alert.clinicalData?.sbp;
      return typeof sbp === 'number' && sbp < SHOCK_LEVEL_SBP_CEILING ? 'PROTO_SHOCK' : undefined;
    }

    return CODE_RED_FIELD_TO_PROTOCOL[field];
  }

  return undefined;
}
