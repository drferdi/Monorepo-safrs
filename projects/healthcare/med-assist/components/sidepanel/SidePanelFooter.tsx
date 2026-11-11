// Designed and constructed by Drferdi.
// A.C.E. Design System — Footer with workspace info (Carbon Neumorphism edition)

import React from 'react';

import { MiraPlanModelPicker } from './MiraPlanModelPicker';

interface SidePanelFooterProps {
  workspace: string;
  section: string;
  loadingPatient?: boolean;
  onShowCredits?: () => void;
}

export const SidePanelFooter: React.FC<SidePanelFooterProps> = ({ onShowCredits }) => {
  return (
    <div className="footer">
      <div
        className="footer-author cursor-pointer hover:text-[#10B981] transition-colors"
        onClick={onShowCredits}
      >
        Doctors retains final authority over all clinical decisions
      </div>
      <MiraPlanModelPicker />
    </div>
  );
};

export { SidePanelFooter as default };
