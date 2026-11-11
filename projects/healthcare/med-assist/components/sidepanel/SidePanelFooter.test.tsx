import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidePanelFooter } from './SidePanelFooter';

describe('SidePanelFooter', () => {
  it('renders the clinical authority disclaimer', () => {
    render(<SidePanelFooter workspace="Puskesmas Balowerti" section="START" />);

    expect(
      screen.getByText('Doctors retains final authority over all clinical decisions')
    ).toBeInTheDocument();
  });

  it('uses sharper typography for the clinical authority disclaimer', () => {
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');
    const footerAuthorRule = css.match(/\.footer-author\s*\{(?<body>[^}]+)\}/)?.groups?.body;

    expect(footerAuthorRule).toContain('font-weight: 800;');
    expect(footerAuthorRule).toContain('text-rendering: geometricPrecision;');
  });
});
