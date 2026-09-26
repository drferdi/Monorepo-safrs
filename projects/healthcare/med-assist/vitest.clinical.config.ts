import path from 'path';
import { defineConfig } from 'vitest/config';

const reactRoot = path.resolve(__dirname, './node_modules/.pnpm/react@18.3.1/node_modules/react');
const reactDomRoot = path.resolve(
  __dirname,
  './node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom'
);
const testingLibraryReactRoot = path.resolve(
  __dirname,
  './node_modules/.pnpm/@testing-library+react@16.3_b0bbe147884ef4cbbf95e64a97c782e8/node_modules/@testing-library/react'
);
const testingLibraryDomRoot = path.resolve(
  __dirname,
  './node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom'
);

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'components/clinical/**/*.test.ts',
      'components/clinical/**/*.test.tsx',
      'entrypoints/sidepanel/**/*.test.tsx',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './') },
      { find: '~', replacement: path.resolve(__dirname, './') },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.join(reactRoot, 'jsx-dev-runtime.js') },
      { find: /^react\/jsx-runtime$/, replacement: path.join(reactRoot, 'jsx-runtime.js') },
      { find: /^react-dom$/, replacement: path.join(reactDomRoot, 'index.js') },
      { find: /^react$/, replacement: path.join(reactRoot, 'index.js') },
      {
        find: /^@testing-library\/react$/,
        replacement: path.join(testingLibraryReactRoot, 'dist/index.js'),
      },
      {
        find: /^@testing-library\/dom$/,
        replacement: path.join(testingLibraryDomRoot, 'dist/index.js'),
      },
    ],
  },
});
