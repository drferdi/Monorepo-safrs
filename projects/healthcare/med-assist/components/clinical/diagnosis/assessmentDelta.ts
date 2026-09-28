/**
 * What changed in the engine's assessment after the doctor recorded a next best step. The page
 * keeps the assessment it showed when "Simpan" was pressed and compares it, card by card, with
 * the one the engine returns next. The comparison is deterministic: no model is asked what
 * changed, and nothing here says why it changed.
 *
 * Places are the engine's own arrangement (its proposal as primary, MUST NOT MISS, the two
 * banding cards), not the doctor's choice, so a change of place is always the engine's.
 */

import { cleanClinicalSummary, formatClinicalText } from './diagnosisDisplayUtils';
import type { DiagnosisCandidateView } from './diagnosisViewModel';

export type Place = { kind: 'primary' } | { kind: 'mustNotMiss' } | { kind: 'banding'; n: number };

export interface AssessmentSnapshot {
  /** The cards on the page, in page order. */
  cards: Array<{ code: string; label: string; place: Place; supports: string[]; against: string[]; missing: number }>;
  /** The Next best step's item, or null when there is none. */
  nextStep: string | null;
}

export interface CardChange {
  /** up or down between primary and banding places; moved: into or out of MUST NOT MISS. */
  move: 'up' | 'down' | 'new' | 'moved' | 'same';
  before: Place | null;
  /** Supporting or opposing evidence the card did not have before (none for a new card). */
  newSupports: string[];
  newAgainst: string[];
  /** The card's Data kurang count before, or null for a new card. */
  missingBefore: number | null;
}

export interface AssessmentDelta {
  /** Keyed by ICD code, for every card on the page now. */
  cards: Record<string, CardChange>;
  /** Cards that were on the page and are not any more. */
  gone: Array<{ code: string; label: string; before: Place }>;
  /** Set only when the engine's primary changed (codes). */
  primary: { before: string | null; after: string | null } | null;
  /** Set only when the Next best step changed. */
  nextStep: { before: string | null; after: string | null } | null;
}

const TAG = /\s·\s(MIRA(?: · jangan terlewat)?|Kronis|Berulang)$/;

/** A card's title without the engine or history tag its chip already shows. */
export function cardTitle(card: DiagnosisCandidateView): string {
  return formatClinicalText(card.displayLabel).replace(TAG, '');
}

export function placeLabel(place: Place): string {
  if (place.kind === 'primary') return 'Diagnosis utama';
  if (place.kind === 'mustNotMiss') return 'Must not miss';
  return `Diagnosis banding ${place.n}`;
}

export function snapshotAssessment(
  arrangement: {
    primary: DiagnosisCandidateView | null;
    mustNotMiss: DiagnosisCandidateView[];
    differentials: DiagnosisCandidateView[];
  },
  nextStep: string | null
): AssessmentSnapshot {
  const entry = (card: DiagnosisCandidateView, place: Place) => ({
    code: card.code,
    label: cardTitle(card),
    place,
    supports: card.supports,
    against: card.against,
    missing: card.missing.length,
  });
  return {
    cards: [
      ...(arrangement.primary ? [entry(arrangement.primary, { kind: 'primary' })] : []),
      ...arrangement.mustNotMiss.map((card) => entry(card, { kind: 'mustNotMiss' })),
      ...arrangement.differentials.map((card, index) => entry(card, { kind: 'banding', n: index + 1 })),
    ],
    nextStep,
  };
}

const norm = (value: string) => cleanClinicalSummary(value).toLowerCase();
// Primary is 0 and banding n is n; MUST NOT MISS is outside that order.
const order = (place: Place) => (place.kind === 'primary' ? 0 : place.kind === 'banding' ? place.n : null);
const primaryOf = (snapshot: AssessmentSnapshot) =>
  snapshot.cards.find((card) => card.place.kind === 'primary')?.code ?? null;

export function compareAssessments(previous: AssessmentSnapshot, current: AssessmentSnapshot): AssessmentDelta {
  const before = new Map(previous.cards.map((card) => [card.code, card]));
  const now = new Set(current.cards.map((card) => card.code));
  const cards: Record<string, CardChange> = {};
  for (const card of current.cards) {
    const was = before.get(card.code);
    if (!was) {
      cards[card.code] = { move: 'new', before: null, newSupports: [], newAgainst: [], missingBefore: null };
      continue;
    }
    const from = order(was.place);
    const to = order(card.place);
    const samePlace = was.place.kind === card.place.kind && from === to;
    const move = samePlace ? 'same' : from !== null && to !== null ? (to < from ? 'up' : 'down') : 'moved';
    const had = (items: string[]) => new Set(items.map(norm));
    const supports = had(was.supports);
    const against = had(was.against);
    cards[card.code] = {
      move,
      before: was.place,
      newSupports: card.supports.filter((item) => !supports.has(norm(item))),
      newAgainst: card.against.filter((item) => !against.has(norm(item))),
      missingBefore: was.missing,
    };
  }
  const primaryBefore = primaryOf(previous);
  const primaryAfter = primaryOf(current);
  const stepChanged = norm(previous.nextStep ?? '') !== norm(current.nextStep ?? '');
  return {
    cards,
    gone: previous.cards
      .filter((card) => !now.has(card.code))
      .map((card) => ({ code: card.code, label: card.label, before: card.place })),
    primary: primaryBefore !== primaryAfter ? { before: primaryBefore, after: primaryAfter } : null,
    nextStep: stepChanged ? { before: previous.nextStep, after: current.nextStep } : null,
  };
}
