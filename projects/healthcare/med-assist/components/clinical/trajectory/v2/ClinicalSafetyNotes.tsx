import type { HybridTrajectoryResult } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';

type SafetyCardProps = {
  title: string;
  summary: string;
  items: string[];
  toneClass?: string;
};

function uniqueItems(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function isDataGapText(text: string): boolean {
  return /data|baseline|riwayat|kunjungan|belum tersedia|belum cukup|kurang|missing|parameter|spO2/i.test(
    text
  );
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRedundantWithVisibleText(text: string, visibleTexts: string[]): boolean {
  const normalized = normalizeForCompare(text);
  if (normalized.length < 12) return false;

  return visibleTexts.some((visibleText) => {
    const normalizedVisible = normalizeForCompare(visibleText);
    if (normalizedVisible.length < 12) return false;

    return normalized.includes(normalizedVisible) || normalizedVisible.includes(normalized);
  });
}

function SafetyCard({
  title,
  summary,
  items,
  toneClass = 'text-muted',
}: SafetyCardProps) {
  const unique = uniqueItems(items);
  if (unique.length === 0) return null;
  const visibleItems = unique.slice(0, 2);
  const hiddenCount = unique.length - visibleItems.length;

  return (
    <div className="ct-v2-safety-card">
      <div className={`ttv-label mb-1 ${toneClass}`}>{title}</div>
      <p className="text-small text-muted leading-relaxed">{summary}</p>
      <div className="mt-2 grid gap-2">
        {visibleItems.map((item) => (
          <div
            key={item}
            className="ct-v2-safety-item text-small text-muted leading-relaxed"
          >
            {item}
          </div>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <div className="mt-2 text-tiny text-muted">
          {hiddenCount} detail tambahan tersedia pada bukti klinis.
        </div>
      ) : null}
    </div>
  );
}

export function ClinicalSafetyNotes({
  hybridResult,
  dataQualityWarnings: _dataQualityWarnings,
  uncertaintyNotes,
  suppressedTexts = [],
}: {
  hybridResult: HybridTrajectoryResult;
  dataQualityWarnings: string[];
  uncertaintyNotes: string[];
  suppressedTexts?: string[];
}) {
  const redFlags = hybridResult.redFlags
    .map((flag) => `${flag.title}. ${flag.rationale}`)
    .filter((item) => !isRedundantWithVisibleText(item, suppressedTexts));
  const clinicalVerificationNotes = uncertaintyNotes.filter(
    (note) => !isDataGapText(note) && !isRedundantWithVisibleText(note, suppressedTexts)
  );

  if (redFlags.length === 0 && clinicalVerificationNotes.length === 0) {
    return null;
  }

  return (
    <section
      className="ct-v2-panel ct-v2-panel--safety"
      data-testid="clinical-safety-notes"
    >
      <div className="ct-v2-panel-head">
        <div className="max-w-[62ch]">
          <div className="ttv-section-title mb-1">Catatan Keselamatan</div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 min-[720px]:grid-cols-2">
        <SafetyCard
          title="Perhatian klinis"
          summary="Sinyal yang layak diprioritaskan pada review klinis saat ini."
          items={redFlags}
          toneClass="ct-v2-danger-text"
        />
        {clinicalVerificationNotes.length > 0 ? (
          <div className={redFlags.length > 0 ? '' : 'min-[720px]:col-span-2'}>
            <SafetyCard
              title="Perlu verifikasi klinis"
              summary="Gunakan bersama pemeriksaan dan respons terapi aktif."
              items={clinicalVerificationNotes}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
