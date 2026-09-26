import type { RankedDiagnosis } from '@/lib/iskandar-diagnosis-engine/diagnosis-algorithm';
import React from 'react';

type ConfidenceTone = 'high' | 'moderate' | 'low' | 'insufficient';

interface ClinicalAuditDetail {
  rationale: string;
  matchedSymptoms: string[];
  vitalDrivers: string[];
  suggestedTests: string[];
  supportingExamSummary: string;
  supportingExamNeedLevel: 'required' | 'recommended' | 'optional';
  scoreBreakdown: RankedDiagnosis['scoreBreakdown'];
  diagnosisScore: number;
  adjustedConfidence: number;
  redFlags: string[];
  recommendedActions: string[];
}

export interface ClinicalImpressionViewItem {
  id: string;
  rank: number;
  icd_x: string;
  nama: string;
  displayLabel: string;
  confidenceLabel: 'High' | 'Moderate' | 'Low' | 'Insufficient data';
  confidenceTone: ConfidenceTone;
  supports: string[];
  against: string[];
  missing: string[];
  reviewItems: string[];
  doNotMissReason: string | null;
  isSelected: boolean;
  isSelectionBlocked: boolean;
  audit: ClinicalAuditDetail;
  raw: RankedDiagnosis;
}

interface ClinicalImpressionPanelProps {
  title?: string;
  primary: ClinicalImpressionViewItem | null;
  safetyConsiderations: ClinicalImpressionViewItem[];
  differentials: ClinicalImpressionViewItem[];
  missingData: string[];
  suggestedReview: string[];
  selectedLabels: string[];
  maxSelection: number;
  onToggleSelect: (item: ClinicalImpressionViewItem) => void;
}

function toneClasses(tone: ConfidenceTone): string {
  if (tone === 'high') {
    return 'border-emerald-600/35 bg-emerald-600/10 text-emerald-300';
  }
  if (tone === 'moderate') {
    return 'border-amber-600/35 bg-amber-600/10 text-amber-300';
  }
  if (tone === 'low') {
    return 'border-orange-600/35 bg-orange-600/10 text-orange-300';
  }
  return 'border-slate-500/35 bg-slate-500/10 text-slate-300';
}

function chipList(items: string[], fallback: string): React.ReactNode {
  if (items.length === 0) {
    return (
      <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1 text-[10px] text-muted">
        {fallback}
      </span>
    );
  }

  return items.map((item) => (
    <span
      key={item}
      className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1 text-[10px] leading-snug text-platinum"
    >
      {item}
    </span>
  ));
}

function scoreItem(label: string, value: number): React.ReactNode {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-1 font-mono text-[11px] font-semibold text-platinum">{value}</div>
    </div>
  );
}

export function PrimaryConsiderationCard({
  item,
  onToggleSelect,
}: {
  item: ClinicalImpressionViewItem;
  onToggleSelect: (item: ClinicalImpressionViewItem) => void;
}): JSX.Element {
  return (
    <section className="ttv-section p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            Most consistent with
          </div>
          <div className="mt-1 text-base font-semibold leading-tight text-platinum">
            {item.displayLabel}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${toneClasses(item.confidenceTone)}`}
          >
            {item.confidenceLabel}
          </span>
          <button
            type="button"
            onClick={() => onToggleSelect(item)}
            disabled={item.isSelectionBlocked}
            className={`rounded-md border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
              item.isSelected
                ? 'border-emerald-600/35 bg-emerald-600/10 text-emerald-300'
                : item.isSelectionBlocked
                  ? 'cursor-not-allowed border-[var(--border-subtle)] text-muted/50'
                  : 'border-[var(--border-subtle)] text-platinum hover:border-emerald-600/30 hover:text-emerald-200'
            }`}
          >
            {item.isSelected ? 'Selected for review' : 'Select for review'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="ct-neu-cell rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Supports
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chipList(item.supports, 'Support signal limited')}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Against
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chipList(item.against, 'No strong counter-signal')}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Missing
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chipList(item.missing, 'No immediate gap highlighted')}
              </div>
            </div>
          </div>
        </div>

        <div className="ct-neu-cell rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            Review clinically
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chipList(item.reviewItems, 'Correlate with examination')}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SafetyCriticalCard({
  items,
}: {
  items: ClinicalImpressionViewItem[];
}): JSX.Element {
  return (
    <section className="ttv-section border-amber-600/25 bg-amber-600/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-300">
          Do not miss
        </div>
        <span className="rounded-md border border-amber-600/30 bg-amber-600/10 px-2 py-1 text-[10px] text-amber-200">
          Prioritize clinical correlation
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[10px] border border-amber-600/20 bg-[var(--surface-primary)] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-platinum">{item.displayLabel}</div>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${toneClasses(item.confidenceTone)}`}
                >
                  {item.confidenceLabel}
                </span>
              </div>
              <div className="mt-1 text-[10px] leading-snug text-amber-200">
                {item.doNotMissReason || 'Review clinically before excluding this consideration.'}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2.5 text-[10px] text-muted">
            No dominant do-not-miss signal from current data.
          </div>
        )}
      </div>
    </section>
  );
}

export function DifferentialList({
  items,
  onToggleSelect,
}: {
  items: ClinicalImpressionViewItem[];
  onToggleSelect: (item: ClinicalImpressionViewItem) => void;
}): JSX.Element {
  return (
    <section className="ttv-section p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          Top differential considerations
        </div>
        <span className="rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] text-muted">
          Showing {items.length}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-[var(--border-subtle)] bg-black/10 px-2 py-0.5 text-[10px] font-mono text-muted">
                    #{item.rank}
                  </span>
                  <span className="text-[11px] font-semibold text-platinum">
                    {item.displayLabel}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${toneClasses(item.confidenceTone)}`}
                >
                  {item.confidenceLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleSelect(item)}
                  disabled={item.isSelectionBlocked}
                  className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                    item.isSelected
                      ? 'border-emerald-600/35 bg-emerald-600/10 text-emerald-300'
                      : item.isSelectionBlocked
                        ? 'cursor-not-allowed border-[var(--border-subtle)] text-muted/50'
                        : 'border-[var(--border-subtle)] text-platinum hover:border-emerald-600/30 hover:text-emerald-200'
                  }`}
                >
                  {item.isSelected ? 'Selected' : 'Consider'}
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Supports
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chipList(item.supports, 'Support signal limited')}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Against
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chipList(item.against, 'No strong counter-signal')}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Missing
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chipList(item.missing, 'No immediate gap highlighted')}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MissingDataCard({ items }: { items: string[] }): JSX.Element {
  return (
    <section className="ttv-section p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
        Missing data / verification needs
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {chipList(items, 'No additional verification need highlighted')}
      </div>
    </section>
  );
}

export function SuggestedReviewCard({ items }: { items: string[] }): JSX.Element {
  return (
    <section className="ttv-section p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
        Suggested clinical review
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {chipList(items, 'Correlate with examination')}
      </div>
    </section>
  );
}

export function EvidenceAuditAccordion({
  items,
}: {
  items: ClinicalImpressionViewItem[];
}): JSX.Element {
  return (
    <details className="ttv-section p-4">
      <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
        Evidence and audit details
      </summary>

      <div className="mt-3 grid grid-cols-1 gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-semibold text-platinum">{item.displayLabel}</div>
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${toneClasses(item.confidenceTone)}`}
              >
                {item.confidenceLabel}
              </span>
              <span className="rounded-md border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-mono text-muted">
                Score {Math.round(item.audit.diagnosisScore)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
              {scoreItem('Base', Math.round(item.audit.scoreBreakdown.baseConfidence))}
              {scoreItem('Symptoms', Math.round(item.audit.scoreBreakdown.symptomFit))}
              {scoreItem('Vitals', Math.round(item.audit.scoreBreakdown.vitalFit))}
              {scoreItem('Safety', Math.round(item.audit.scoreBreakdown.safetyPriority))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Supports
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chipList(item.audit.matchedSymptoms, 'No symptom anchor logged')}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Objective signals
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chipList(item.audit.vitalDrivers, 'No dominant vital signal logged')}
                </div>
              </div>
            </div>

            {item.audit.redFlags.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-300">
                  Do not miss trace
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chipList(item.audit.redFlags, 'No red flag trace logged')}
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Missing data
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chipList(item.audit.suggestedTests, 'No additional test suggestion logged')}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Review clinically
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chipList(item.audit.recommendedActions, 'Correlate with examination')}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-[10px] border border-[var(--border-subtle)] bg-black/10 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Audit note
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-muted">
                {item.audit.rationale || item.audit.supportingExamSummary}
              </div>
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}

export function ClinicalImpressionPanel({
  title = 'Clinical Impression Support',
  primary,
  safetyConsiderations,
  differentials,
  missingData,
  suggestedReview,
  selectedLabels,
  maxSelection,
  onToggleSelect,
}: ClinicalImpressionPanelProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <section className="ttv-section p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Step 1 • Diagnosis support
            </div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-platinum">{title}</h3>
            <div className="mt-1 text-[10px] text-muted">
              Clinical reasoning support only. Physician remains the final decision-maker.
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] text-muted">
              Max {maxSelection} selections
            </span>
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-md border border-emerald-600/30 bg-emerald-600/10 px-2 py-1 text-[10px] text-emerald-300"
                >
                  {label}
                </span>
              ))
            ) : (
              <span className="rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] text-muted">
                No diagnosis selected
              </span>
            )}
          </div>
        </div>
      </section>

      {primary ? <PrimaryConsiderationCard item={primary} onToggleSelect={onToggleSelect} /> : null}
      <SafetyCriticalCard items={safetyConsiderations} />
      <DifferentialList items={differentials} onToggleSelect={onToggleSelect} />
      <MissingDataCard items={missingData} />
      <SuggestedReviewCard items={suggestedReview} />
      <EvidenceAuditAccordion
        items={primary ? [primary, ...differentials].slice(0, 5) : differentials.slice(0, 5)}
      />
    </div>
  );
}
