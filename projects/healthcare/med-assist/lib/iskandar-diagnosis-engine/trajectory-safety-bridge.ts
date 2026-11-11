import type { HybridTrajectoryResult } from './hybrid-trajectory';

import type { CDSSAlert } from '@/types/api';

export interface TrajectorySafetyAlert {
  id: string;
  type: CDSSAlert['type'];
  severity: CDSSAlert['severity'];
  title: string;
  message: string;
  action?: string;
}

export function extractSafetyAlertsFromTrajectory(
  trajectory: HybridTrajectoryResult | null
): TrajectorySafetyAlert[] {
  if (!trajectory) return [];

  const alerts: TrajectorySafetyAlert[] = [];
  const severity = trajectory.integratedAssessment.calibratedSeverity;

  // Only bridge if severity is high or critical
  if (severity !== 'high' && severity !== 'critical') return [];

  // Map red flags to alerts
  for (const flag of trajectory.redFlags) {
    if (flag.severity !== 'high' && flag.severity !== 'critical') continue;

    const alertSeverity = flag.severity === 'critical' ? 'emergency' : 'high';
    const alertType = flag.severity === 'critical' ? 'red_flag' : 'vital_sign';

    alerts.push({
      id: `trajectory-${flag.id}`,
      type: alertType,
      severity: alertSeverity,
      title: `SYMPHONY: ${flag.title}`,
      message: flag.rationale,
      action: trajectory.integratedAssessment.recommendedAction,
    });
  }

  // Add summary alert if multiple critical flags
  if (alerts.length > 1) {
    alerts.unshift({
      id: 'trajectory-summary-critical',
      type: 'red_flag',
      severity: 'emergency',
      title: 'SYMPHONY: Deteksi Kondisi Kritis',
      message: `Trajectory analysis mendeteksi ${alerts.length} sinyal bahaya. Review segera diperlukan.`,
      action: 'Buka tab Trajectory untuk detail lengkap.',
    });
  }

  return alerts;
}
