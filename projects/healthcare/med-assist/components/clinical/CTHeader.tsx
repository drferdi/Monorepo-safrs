// Designed and constructed by Drferdi.
import React from 'react';
import ThemeToggle from '../ui/ThemeToggle';
import { HeaderFrame } from '../ui/HeaderFrame';

/**
 * CTHeader - Shared Sentra clinical screen header
 */
interface CTHeaderProps {
  title: string;
  subtitle: string;
  sectionLabel: string;
  meta?: string;
  onBack?: () => void;
  children?: React.ReactNode;
}

export const CTHeader: React.FC<CTHeaderProps> = ({
  title,
  subtitle,
  sectionLabel,
  meta,
  onBack,
  children,
}) => {
  const handleBack = (): void => {
    try {
      onBack?.();
    } catch (error) {
      console.error('[CTHeader] Gagal menjalankan navigasi kembali', error);
    }
  };

  return (
    <header role="banner" aria-label={`${sectionLabel} screen header`}>
      <HeaderFrame
        title={title}
        subtitle={subtitle}
        meta={meta}
        className="sidepanel-shell-header sidepanel-shell-header--clinical"
        topLeft={<ThemeToggle />}
        topRight={
          onBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="sidepanel-shell-back-button"
              aria-label="Kembali ke layar sebelumnya"
              data-metric="clinical-screen-back"
              data-slo="clinical-header-nav"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null
        }
      >
        {children}
      </HeaderFrame>
    </header>
  );
};
