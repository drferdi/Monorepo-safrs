import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useId, useState, type CSSProperties } from 'react';

import { formatChartDate, formatValue } from '../charts/chart-shared';

import { NORMAL_RANGES } from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';
import type {
  TrajectoryVisualizationViewModel,
  TrajectoryVitalTrendPoint,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

export type VitalKey = keyof Pick<
  TrajectoryVitalTrendPoint,
  'spo2' | 'pulse' | 'respiratoryRate' | 'temperature' | 'systolic' | 'diastolic'
>;

export type VitalRange = { min: number; max: number };

/** The vitals by the labels the view model names its drivers with. */
export const VITAL_SERIES_META: Array<{ key: VitalKey; label: string }> = [
  { key: 'spo2', label: 'SpO2' },
  { key: 'pulse', label: 'Nadi' },
  { key: 'respiratoryRate', label: 'Laju napas' },
  { key: 'temperature', label: 'Suhu' },
  { key: 'systolic', label: 'Tekanan darah sistolik' },
  { key: 'diastolic', label: 'Tekanan darah diastolik' },
];

/** Normal limits from the trajectory engine; SpO2 has none there. */
const VITALS: Record<VitalKey, { range: VitalRange | null; unit: string }> = {
  systolic: { range: NORMAL_RANGES.sbp, unit: ` ${NORMAL_RANGES.sbp.unit}` },
  diastolic: { range: NORMAL_RANGES.dbp, unit: ` ${NORMAL_RANGES.dbp.unit}` },
  pulse: { range: NORMAL_RANGES.hr, unit: ` ${NORMAL_RANGES.hr.unit}` },
  respiratoryRate: { range: NORMAL_RANGES.rr, unit: ` ${NORMAL_RANGES.rr.unit}` },
  temperature: { range: NORMAL_RANGES.temp, unit: ` ${NORMAL_RANGES.temp.unit}` },
  spo2: { range: null, unit: '%' },
};

type PillId = 'tensi' | 'pulse' | 'spo2' | 'respiratoryRate' | 'temperature';

const PILLS: Array<{ id: PillId; label: string; keys: VitalKey[] }> = [
  { id: 'tensi', label: 'Tensi', keys: ['systolic', 'diastolic'] },
  { id: 'pulse', label: 'Nadi', keys: ['pulse'] },
  { id: 'spo2', label: 'SpO2', keys: ['spo2'] },
  { id: 'respiratoryRate', label: 'Napas', keys: ['respiratoryRate'] },
  { id: 'temperature', label: 'Suhu', keys: ['temperature'] },
];

/** What each pill reads, in the slot of the lab's preset description. */
const PILL_NOTES: Record<PillId, string> = {
  tensi: 'Tekanan darah tiap kunjungan; sistolik dan diastolik dibaca terpisah.',
  pulse: 'Denyut nadi tiap kunjungan.',
  spo2: 'Saturasi oksigen tiap kunjungan; engine trajectory tidak memberi batas.',
  respiratoryRate: 'Laju napas tiap kunjungan.',
  temperature: 'Suhu tubuh tiap kunjungan.',
};

/** A 0–100 share as the left edge of a 40px ball or ring inside the track. */
function onTrack(share: number): string {
  return `calc((100% - 40px) * ${share / 100})`;
}

/** The lab's "Snappy UI" spring: critically damped, so it settles without overshoot. */
const SNAPPY = { stiffness: 500, damping: 45, mass: 1 };
const PLAY_STEP_MS = 700;

// Chart geometry of the lab card (viewBox 454 × 136): gridlines 12–110, plot 20–102, labels at 130.
const LEFT = 12;
const RIGHT = 442;
const TOP = 20;
const BOTTOM = 102;

export type VitalBehaviour =
  | 'Dalam batas'
  | 'Di atas batas'
  | 'Di bawah batas'
  | 'Tanpa batas'
  | 'Tidak tercatat';

export function vitalStats(points: TrajectoryVitalTrendPoint[], key: VitalKey, index: number) {
  const value = points[index]?.[key];
  const before = index > 0 ? points[index - 1]?.[key] : undefined;
  const range = VITALS[key].range;
  const behaviour: VitalBehaviour =
    value === undefined
      ? 'Tidak tercatat'
      : !range
        ? 'Tanpa batas'
        : value > range.max
          ? 'Di atas batas'
          : value < range.min
            ? 'Di bawah batas'
            : 'Dalam batas';
  return {
    value,
    change: value !== undefined && before !== undefined ? value - before : undefined,
    range,
    behaviour,
  };
}

/** One x per visit and one value scale that holds every value and both limits. */
export function chartGeometry(
  points: TrajectoryVitalTrendPoint[],
  key: VitalKey,
  range: VitalRange | null
) {
  const values = points
    .map((point) => point[key])
    .filter((value): value is number => value !== undefined);
  const bounds = range ? [...values, range.min, range.max] : values;
  const low = bounds.length > 0 ? Math.min(...bounds) : 0;
  const high = bounds.length > 0 ? Math.max(...bounds) : 0;
  const pad = (high - low) * 0.1 || 1;
  const share = (value: number) => (value - (low - pad)) / (high - low + 2 * pad);
  return {
    xs: points.map((_, index) =>
      points.length === 1
        ? (LEFT + RIGHT) / 2
        : LEFT + (index * (RIGHT - LEFT)) / (points.length - 1)
    ),
    y: (value: number) => BOTTOM - share(value) * (BOTTOM - TOP),
    /** Where a value sits on the track, 0–100. */
    share: (value: number) => share(value) * 100,
  };
}

function pillOf(key: VitalKey): PillId {
  return PILLS.find((pill) => pill.keys.includes(key))?.id ?? 'pulse';
}

/**
 * Tren Tanda Vital drawn as the lab spring playground: the ball on the track springs to the picked
 * visit's value, the two rings mark the normal limits, the chart and the figures follow the visit.
 * Only the ball moves; the chart, limits and marker change in place.
 */
export function VitalPlayground({ viewModel }: { viewModel: TrajectoryVisualizationViewModel }) {
  const points = viewModel.vitalTrends;
  const pills = PILLS.filter((pill) =>
    pill.keys.some((key) => points.some((point) => point[key] !== undefined))
  );
  const driver = viewModel.vitalTrendMeta.primaryVitalDrivers
    .map((label) => VITAL_SERIES_META.find((meta) => meta.label === label)?.key)
    .find((key) => key !== undefined && pills.some((pill) => pill.keys.includes(key)));

  const [pillId, setPillId] = useState<PillId | undefined>(() =>
    driver ? pillOf(driver) : pills[0]?.id
  );
  const [diastolic, setDiastolic] = useState(driver === 'diastolic');
  const [index, setIndex] = useState(points.length - 1);
  const [playing, setPlaying] = useState(false);
  const sliderId = useId();
  const reduceMotion = useReducedMotion();

  const pill = pills.find((item) => item.id === pillId);
  const key: VitalKey = pill?.id === 'tensi' ? (diastolic ? 'diastolic' : 'systolic') : (pill?.keys[0] ?? 'pulse');
  const { unit } = VITALS[key];
  const stats = vitalStats(points, key, index);
  const geometry = chartGeometry(points, key, stats.range);
  const target = stats.value === undefined ? null : geometry.share(stats.value);

  const ball = useSpring(target ?? 0, SNAPPY);
  const ballLeft = useTransform(ball, (value) => onTrack(value));

  useEffect(() => {
    if (target === null) return;
    if (reduceMotion) ball.jump(target);
    else ball.set(target);
  }, [target, reduceMotion, ball]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = index + 1;
      setIndex(next);
      if (next >= points.length - 1) setPlaying(false);
    }, PLAY_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index, points.length]);

  if (!pill) return null;

  const handlePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    setIndex(0);
    setPlaying(true);
  };

  const path = points
    .map((point, at) => {
      const value = point[key];
      if (value === undefined) return '';
      const joined = at > 0 && points[at - 1]?.[key] !== undefined;
      return `${joined ? 'L' : 'M'}${geometry.xs[at]},${geometry.y(value)}`;
    })
    .join('');
  const markerX = geometry.xs[index] ?? LEFT;
  const fillStyle: CSSProperties & Record<'--fill', string> = {
    '--fill': `${points.length > 1 ? (index / (points.length - 1)) * 100 : 100}%`,
  };

  return (
    <div className="ct-v2-vital-lab">
      <div className="ct-v2-vital-lab__stage">
        <div className="ct-v2-vital-lab__head">
          <p className="ct-v2-vital-lab__hint">Geser kunjungan, atau tekan Play.</p>
          <button
            type="button"
            className="ct-v2-vital-lab__play"
            onClick={handlePlay}
            disabled={points.length < 2}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              {playing ? (
                <path d="M4.5 3h2.25v10H4.5zM9.25 3h2.25v10H9.25z" />
              ) : (
                <path d="M5 3.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1l-7-4.4a.6.6 0 0 0-.9.5Z" />
              )}
            </svg>
            {playing ? 'Jeda' : 'Play'}
          </button>
        </div>

        <div className="ct-v2-vital-lab__track" aria-hidden="true">
          <div className="ct-v2-vital-lab__rail">
            {stats.range
              ? [stats.range.min, stats.range.max].map((bound) => (
                  <span
                    key={bound}
                    className="ct-v2-vital-lab__ring"
                    style={{ left: onTrack(geometry.share(bound)) }}
                  />
                ))
              : null}
            {target !== null ? (
              <motion.span className="ct-v2-vital-lab__ball" style={{ left: ballLeft }} />
            ) : null}
          </div>
        </div>

        <figure className="ct-v2-vital-lab__figure-chart">
          <svg
            viewBox="0 0 454 136"
            className="ct-v2-vital-lab__chart"
            role="img"
            aria-label={`Grafik ${pill.label} per kunjungan`}
          >
            {geometry.xs.map((x, at) => (
              <g key={x}>
                <line x1={x} x2={x} y1={12} y2={110} className="ct-v2-vital-lab__grid" />
                <text
                  x={x}
                  y={130}
                  textAnchor={at === 0 ? 'start' : at === points.length - 1 ? 'end' : 'middle'}
                  className="ct-v2-vital-lab__tick"
                >
                  K{at + 1}
                </text>
              </g>
            ))}
            <line x1={LEFT} x2={RIGHT} y1={110} y2={110} className="ct-v2-vital-lab__grid" />
            {stats.range
              ? [stats.range.min, stats.range.max].map((bound) => (
                  <g key={bound}>
                    <line
                      x1={LEFT}
                      x2={RIGHT}
                      y1={geometry.y(bound)}
                      y2={geometry.y(bound)}
                      strokeDasharray="3 4"
                      className="ct-v2-vital-lab__limit"
                    />
                    <text
                      x={RIGHT}
                      y={geometry.y(bound) - 6}
                      textAnchor="end"
                      paintOrder="stroke"
                      strokeWidth={4}
                      strokeLinejoin="round"
                      className="ct-v2-vital-lab__tick ct-v2-vital-lab__tick--halo"
                    >
                      {formatValue(bound)}
                    </text>
                  </g>
                ))
              : null}
            <line
              x1={markerX}
              x2={markerX}
              y1={12}
              y2={110}
              strokeDasharray="2 3"
              className="ct-v2-vital-lab__marker"
            />
            <path d={path} fill="none" className="ct-v2-vital-lab__line" />
          </svg>
        </figure>

        <dl className="ct-v2-vital-lab__stats">
          <div>
            <dt>Nilai</dt>
            <dd>{formatValue(stats.value, unit)}</dd>
          </div>
          <div>
            <dt>Selisih</dt>
            <dd>
              {stats.change === undefined
                ? '–'
                : `${stats.change > 0 ? '+' : ''}${formatValue(stats.change, unit)}`}
            </dd>
          </div>
          <div>
            <dt>Batas</dt>
            <dd>
              {stats.range
                ? `${formatValue(stats.range.min)}–${formatValue(stats.range.max)}${unit}`
                : 'tidak tersedia'}
            </dd>
          </div>
          <div>
            <dt>Perilaku</dt>
            <dd>{stats.behaviour}</dd>
          </div>
        </dl>
      </div>

      <div className="ct-v2-vital-lab__controls">
        <div className="ct-v2-vital-lab__control-row">
          <div className="ct-v2-vital-lab__pills" role="radiogroup" aria-label="Tanda vital">
            {pills.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={item.id === pill.id}
                className="ct-v2-vital-lab__pill"
                data-testid={`vital-series-${item.keys[0]}`}
                onClick={() => setPillId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {pill.id === 'tensi' ? (
            <div className="ct-v2-vital-lab__toggle" role="radiogroup" aria-label="Tekanan darah">
              <motion.span
                aria-hidden="true"
                className="ct-v2-vital-lab__toggle-thumb"
                initial={false}
                animate={{ x: diastolic ? '100%' : '0%' }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', ...SNAPPY }}
              />
              {(
                [
                  ['Sistolik', false],
                  ['Diastolik', true],
                ] as const
              ).map(([label, side]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={diastolic === side}
                  className="ct-v2-vital-lab__toggle-option"
                  onClick={() => setDiastolic(side)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className="ct-v2-vital-lab__hint ct-v2-vital-lab__note">{PILL_NOTES[pill.id]}</p>

        <div className="ct-v2-vital-lab__slider">
          <div className="ct-v2-vital-lab__slider-head">
            <label htmlFor={sliderId}>Kunjungan</label>
            <output htmlFor={sliderId}>K{index + 1}</output>
          </div>
          <input
            id={sliderId}
            type="range"
            min={1}
            max={points.length}
            step={1}
            value={index + 1}
            style={fillStyle}
            onChange={(event) => {
              setPlaying(false);
              setIndex(Number(event.target.value) - 1);
            }}
          />
          <p className="ct-v2-vital-lab__slider-hint">{formatChartDate(points[index]?.date)}</p>
        </div>
      </div>
    </div>
  );
}
