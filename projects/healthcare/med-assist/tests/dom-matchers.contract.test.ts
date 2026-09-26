import { describe, expect, it } from 'vitest';

describe('med-assist Vitest DOM matcher setup', () => {
  it('registers jest-dom matchers for DOM assertions', () => {
    document.body.innerHTML = '<button data-testid="probe">Probe</button>';

    const probe = document.querySelector('[data-testid="probe"]');

    expect(probe).toBeInTheDocument();
    expect(probe).toHaveAttribute('data-testid', 'probe');
  });
});
