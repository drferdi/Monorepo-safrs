// Designed and constructed by Drferdi.
/**
 * Weight-Based Dosage Calculator
 *
 * For pediatric and geriatric patients requiring weight-adjusted dosing.
 * All calculations are for reference only - verify with current guidelines.
 */

import React, { useState, useMemo } from 'react';
import {
  DOSAGE_DATABASE,
  calculateDosage,
  getAgeGroup,
  type AgeGroup,
} from '@/lib/clinical/dosage-database';

/**
 * DosageCalculatorProps interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface DosageCalculatorProps {
  patientAge: number; // in years
  patientWeight?: number; // in kg (optional, can be entered)
  onClose?: () => void;
}

export const DosageCalculator: React.FC<DosageCalculatorProps> = ({
  patientAge,
  patientWeight: initialWeight,
  onClose,
}) => {
  const [weight, setWeight] = useState<string>(initialWeight?.toString() || '');
  const [selectedDrugId, setSelectedDrugId] = useState<string>('');
  const [showWarnings, setShowWarnings] = useState(true);

  const ageGroup = useMemo(() => getAgeGroup(patientAge), [patientAge]);
  const weightKg = parseFloat(weight) || 0;

  // Filter drugs that have rules for this age group
  const availableDrugs = useMemo(() => {
    return DOSAGE_DATABASE.filter((drug) => drug.rules.some((rule) => rule.ageGroup === ageGroup));
  }, [ageGroup]);

  const selectedDrug = availableDrugs.find((d) => d.id === selectedDrugId);

  const dosageResult = useMemo(() => {
    if (!selectedDrugId || weightKg <= 0) return null;
    return calculateDosage(selectedDrugId, weightKg, ageGroup);
  }, [selectedDrugId, weightKg, ageGroup]);

  const ageGroupLabel: Record<AgeGroup, string> = {
    neonate: 'Neonatus (<1 bulan)',
    infant: 'Bayi (1 bulan - 2 tahun)',
    child: 'Anak (2-12 tahun)',
    adolescent: 'Remaja (12-18 tahun)',
    adult: 'Dewasa (18-65 tahun)',
    elderly: 'Lansia (≥65 tahun)',
  };

  return (
    <div className="ttv-section p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-small text-muted">
            Kategori: <span className="text-platinum font-semibold">{ageGroupLabel[ageGroup]}</span>{' '}
            | Umur: <span className="text-platinum font-semibold">{patientAge} tahun</span>
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="neu-tab py-1.5 px-3 rounded-lg text-small text-muted cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Weight Input */}
      <div className="mb-4">
        <label className="ttv-label mb-2 block">BERAT BADAN (KG)</label>
        <div className="ttv-input-with-unit">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0.0"
            className="ttv-input flex-1"
            step="0.1"
            min="0"
            max="200"
          />
          <span className="ttv-unit">kg</span>
        </div>
        {weightKg > 0 && weightKg < 2 && (
          <p className="text-tiny text-caution mt-1">
            ⚠️ Berat badan sangat rendah - verifikasi ulang
          </p>
        )}
        {weightKg > 150 && (
          <p className="text-tiny text-caution mt-1">
            ⚠️ Berat badan sangat tinggi - verifikasi ulang
          </p>
        )}
      </div>

      {/* Drug Selection */}
      <div className="mb-4">
        <label className="ttv-label mb-2 block">PILIH OBAT</label>
        <select
          value={selectedDrugId}
          onChange={(e) => setSelectedDrugId(e.target.value)}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(145deg,#1a1b1c_0%,#16161a_100%)] px-3 py-2.5 text-small text-platinum font-medium"
          style={{
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)',
          }}
        >
          <option value="">-- Pilih Obat --</option>
          {availableDrugs.map((drug) => (
            <option key={drug.id} value={drug.id}>
              {drug.name} - {drug.indication}
            </option>
          ))}
        </select>
      </div>

      {/* Drug Info */}
      {selectedDrug && (
        <div className="neu-card-inset p-3 mb-4">
          <div className="ttv-label text-tertiary mb-1">INDIKASI</div>
          <div className="text-small text-platinum">{selectedDrug.indication}</div>
          {selectedDrug.notes && (
            <div className="text-tiny text-muted mt-2 italic">{selectedDrug.notes}</div>
          )}
        </div>
      )}

      {/* Calculation Result */}
      {dosageResult && weightKg > 0 && (
        <div className="space-y-3">
          {/* Dose Display */}
          <div
            className="neu-card-inset p-4 border-l-4"
            style={{
              borderLeftColor: dosageResult.warnings.some((w) => w.includes('BAHAYA'))
                ? '#EF4444'
                : dosageResult.isOverMax
                  ? '#F59E0B'
                  : '#6B9B8A',
            }}
          >
            <div className="flex items-baseline gap-3">
              <div className="flex-1">
                <div className="ttv-label text-tertiary mb-1">DOSIS PER PEMBERIAN</div>
                <div className="text-2xl font-mono font-bold" style={{ color: '#00FFFF' }}>
                  {dosageResult.dose} {dosageResult.unit}
                </div>
              </div>
              <div className="text-right">
                <div className="ttv-label text-tertiary mb-1">FREKUENSI</div>
                <div className="text-small font-mono text-platinum">{dosageResult.frequency}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <span className="ttv-label text-tertiary">RUTE:</span>
                <span className="text-small text-platinum ml-2 uppercase">
                  {dosageResult.route}
                </span>
              </div>
              <div>
                <span className="ttv-label text-tertiary">TOTAL HARIAN:</span>
                <span className="text-small font-mono font-bold text-platinum ml-2">
                  {dosageResult.dailyTotal} {dosageResult.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {dosageResult.warnings.length > 0 && showWarnings && (
            <div className="neu-card-inset p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="ttv-label" style={{ color: '#F59E0B' }}>
                  ⚠️ PERINGATAN & CATATAN KLINIS
                </div>
                <button
                  onClick={() => setShowWarnings(false)}
                  className="text-tiny text-muted hover:text-platinum"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2">
                {dosageResult.warnings.map((warning, i) => (
                  <div
                    key={i}
                    className={`text-small leading-relaxed ${
                      warning.includes('BAHAYA')
                        ? 'text-critical font-bold'
                        : warning.includes('KONTRAINDIKASI')
                          ? 'text-critical'
                          : warning.includes('⚠️')
                            ? 'text-caution'
                            : 'text-muted'
                    }`}
                  >
                    • {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showWarnings && (
            <button
              onClick={() => setShowWarnings(true)}
              className="text-small text-caution hover:text-platinum underline"
            >
              Show warnings ({dosageResult.warnings.length})
            </button>
          )}

          {/* Disclaimer */}
          <div className="neu-card-inset p-3 border-t-2" style={{ borderTopColor: '#F59E0B' }}>
            <div className="text-tiny text-muted leading-relaxed">
              <span className="font-bold text-caution">DISCLAIMER:</span> Kalkulasi ini hanya untuk
              referensi klinis. Selalu verifikasi dosis dengan pedoman terkini (IDAI, PAPDI, PIONAS,
              BNF) dan pertimbangkan kondisi komorbid, fungsi ginjal/hepar, dan interaksi obat.
              Dokter bertanggung jawab penuh atas keputusan terapi.
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!dosageResult && selectedDrugId && weightKg <= 0 && (
        <div className="text-center py-8">
          <p className="text-small text-muted">Masukkan berat badan untuk menghitung dosis</p>
        </div>
      )}

      {!selectedDrugId && weightKg > 0 && (
        <div className="text-center py-8">
          <p className="text-small text-muted">Pilih obat untuk menghitung dosis</p>
        </div>
      )}
    </div>
  );
};
