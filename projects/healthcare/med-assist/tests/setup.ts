import * as domMatchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Keep matcher registration on the active Vitest expect instance for this package.
expect.extend(domMatchers);

afterEach(() => {
  cleanup();
});
