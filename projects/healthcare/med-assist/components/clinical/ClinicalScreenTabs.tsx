type ClinicalScreenKey = 'trajectory' | 'differential';

interface ClinicalScreenTabsProps {
  active: ClinicalScreenKey;
  onOpenTrajectory?: () => void | Promise<void>;
  onOpenDifferential?: () => void | Promise<void>;
  isDifferentialDisabled?: boolean;
}

async function runSafely(action?: () => void | Promise<void>, label?: string): Promise<void> {
  if (!action) return;

  try {
    await action();
  } catch (error) {
    console.error(`[ClinicalScreenTabs] Gagal menjalankan aksi ${label || 'unknown'}`, error);
  }
}

export function ClinicalScreenTabs({
  active,
  onOpenTrajectory,
  onOpenDifferential,
  isDifferentialDisabled = false,
}: ClinicalScreenTabsProps): JSX.Element {
  const trajectoryActive = active === 'trajectory';
  const differentialActive = active === 'differential';

  return (
    <div
      className="engine-row engine-row--clinical engine-tablist"
      role="tablist"
      aria-label="Workflow klinis"
    >
      <button
        type="button"
        role="tab"
        aria-selected={trajectoryActive}
        tabIndex={trajectoryActive ? 0 : -1}
        onClick={() => {
          void runSafely(onOpenTrajectory, 'trajectory');
        }}
        disabled={trajectoryActive}
        className={`engine-btn engine-tab ${trajectoryActive ? 'active' : ''}`}
      >
        Clinical Trajectory
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={differentialActive}
        tabIndex={differentialActive ? 0 : -1}
        onClick={() => {
          void runSafely(onOpenDifferential, 'differential');
        }}
        disabled={differentialActive || isDifferentialDisabled}
        className={`engine-btn engine-tab ${differentialActive ? 'active' : ''}`}
      >
        Diagnosis + Resep
      </button>
    </div>
  );
}
