// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * DAS Phase 2: Local Semantic Mapper
 *
 * Local-only field mapping for ePuskesmas forms.
 * Keeps the mapper provider-neutral after the Google exit.
 *
 * @module lib/scraper/adaptive/local-semantic-mapper
 */

import type {
  FieldMapping,
  FieldSignature,
  MappingAction,
  MappingContext,
  MappingResult,
} from './types';

function normalizeText(value: string | null | undefined): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[_[\]\s-]+/g, '')
    .trim();
}

function confidenceToAction(confidence: number): MappingAction {
  if (confidence >= 0.95) return 'AUTO_FILL';
  if (confidence >= 0.8) return 'CAUTIOUS_FILL';
  return 'HUMAN_REQUIRED';
}

function scoreField(payloadKey: string, payloadValue: unknown, field: FieldSignature): number {
  const normalizedKey = normalizeText(payloadKey);
  const name = normalizeText(field.attributes.name);
  const id = normalizeText(field.attributes.id);
  const label = normalizeText(field.label);
  const placeholder = normalizeText(field.attributes.placeholder);
  const ariaLabel = normalizeText(field.attributes.ariaLabel);
  const contextBits = normalizeText(field.context.sectionHeader) + normalizeText(field.context.formId);
  const valueHint = normalizeText(
    typeof payloadValue === 'string' ? payloadValue : payloadValue == null ? '' : String(payloadValue)
  );

  let score = 0;

  if (name && name === normalizedKey) score = Math.max(score, 0.97);
  else if (name && (name.includes(normalizedKey) || normalizedKey.includes(name))) score = Math.max(score, 0.84);

  if (id && id === normalizedKey) score = Math.max(score, 0.96);
  else if (id && (id.includes(normalizedKey) || normalizedKey.includes(id))) score = Math.max(score, 0.8);

  if (label && label === normalizedKey) score = Math.max(score, 0.93);
  else if (label && label.includes(normalizedKey)) score = Math.max(score, 0.76);

  if (placeholder && placeholder.includes(normalizedKey)) score = Math.max(score, 0.64);
  if (ariaLabel && ariaLabel.includes(normalizedKey)) score = Math.max(score, 0.66);
  if (contextBits && contextBits.includes(normalizedKey)) score = Math.max(score, 0.58);

  if (valueHint && (name.includes(valueHint) || label.includes(valueHint))) {
    score = Math.max(score, 0.55);
  }

  if (field.fieldType === 'hidden') {
    score = Math.min(score, 0.2);
  }

  return score;
}

function buildMapping(payloadKey: string, field: FieldSignature, score: number): FieldMapping {
  return {
    payloadKey,
    targetField: field,
    confidence: score,
    reasoning: 'Pencocokan lokal berdasarkan name, label, placeholder, dan konteks field.',
    action: confidenceToAction(score),
  };
}

function mapFieldsLocal(
  payload: Record<string, unknown>,
  fields: FieldSignature[]
): MappingResult {
  const startTime = Date.now();
  const mappings: FieldMapping[] = [];
  const unmapped: string[] = [];

  for (const [payloadKey, payloadValue] of Object.entries(payload)) {
    let bestField: FieldSignature | null = null;
    let bestScore = 0;

    for (const field of fields) {
      const score = scoreField(payloadKey, payloadValue, field);
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }

    if (bestField && bestScore >= 0.5) {
      mappings.push(buildMapping(payloadKey, bestField, bestScore));
    } else {
      unmapped.push(payloadKey);
    }
  }

  return {
    mappings,
    unmapped,
    warnings: ['Local heuristic mapper aktif; tidak ada panggilan model eksternal.'],
    fromCache: false,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Map payload to fields using the local semantic mapper.
 *
 * Main semantic mapping entrypoint for local-only mode.
 */
export async function mapFieldsLocally(
  payload: Record<string, unknown>,
  fields: FieldSignature[],
  context: MappingContext
): Promise<MappingResult> {
  void context;
  return mapFieldsLocal(payload, fields);
}

/**
 * Fallback heuristic mapping.
 *
 * Uses the same local implementation as the primary mapper.
 */
export function mapFieldsHeuristic(
  payload: Record<string, unknown>,
  fields: FieldSignature[]
): MappingResult {
  return mapFieldsLocal(payload, fields);
}
