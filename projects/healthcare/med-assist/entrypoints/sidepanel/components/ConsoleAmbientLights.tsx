import { useEffect, useState } from 'react';

export type AmbientPattern = 0 | 1 | 2 | 3 | 4;

const PATTERNS = ['000', '100', '010', '001', '101'] as const;

export function chooseAmbientPattern(previous: AmbientPattern, sample: number): AmbientPattern {
  const choices = ([0, 1, 2, 3, 4] as AmbientPattern[]).filter((pattern) => pattern !== previous);
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor(sample * choices.length)));
  return choices[index];
}

export function chooseAmbientDelay(sample: number): number {
  return 4000 + Math.round(Math.min(1, Math.max(0, sample)) * 5000);
}

export function ConsoleAmbientLights({ suspended }: { suspended: boolean }): JSX.Element {
  const [pattern, setPattern] = useState<AmbientPattern>(0);
  const [tabHidden, setTabHidden] = useState(() => document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onVisibilityChange = () => setTabHidden(document.hidden);
    const onMotionChange = () => setReducedMotion(query?.matches ?? false);
    document.addEventListener('visibilitychange', onVisibilityChange);
    query?.addEventListener?.('change', onMotionChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      query?.removeEventListener?.('change', onMotionChange);
    };
  }, []);

  const paused = suspended || tabHidden || reducedMotion;

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      setPattern((previous) => chooseAmbientPattern(previous, Math.random()));
    }, chooseAmbientDelay(Math.random()));
    return () => window.clearTimeout(timer);
  }, [pattern, paused]);

  const visiblePattern = PATTERNS[paused ? 0 : pattern];

  return (
    <div className="console-ambient-lights" aria-hidden="true" data-pattern={paused ? 0 : pattern}>
      {Array.from(visiblePattern, (value, index) => (
        <span key={index} className="console-ambient-light" data-lit={value === '1'} />
      ))}
    </div>
  );
}
