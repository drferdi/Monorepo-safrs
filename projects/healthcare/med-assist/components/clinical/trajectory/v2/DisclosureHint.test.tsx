import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { DisclosureHint } from './DisclosureHint';

describe('DisclosureHint', () => {
  it('renders both words, hidden from assistive technology', () => {
    const { container } = render(<DisclosureHint />);
    const hint = container.querySelector('.ct-disclosure-hint');
    expect(hint?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('Open')).toHaveClass('ct-disclosure-hint__open');
    expect(screen.getByText('Close')).toHaveClass('ct-disclosure-hint__close');
  });

  it('is styled green through the safe token and switches words on details[open]', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../../../entrypoints/sidepanel/style.css'), 'utf8');
    expect(css).toMatch(/\.ct-disclosure-hint\s*\{[^}]*color:\s*var\(--sentra-safe\)/);
    expect(css).toMatch(/details\[open\]\s*>\s*summary\s+\.ct-disclosure-hint__open\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/details\[open\]\s*>\s*summary\s+\.ct-disclosure-hint__close\s*\{[^}]*display:\s*inline/);
  });
});
