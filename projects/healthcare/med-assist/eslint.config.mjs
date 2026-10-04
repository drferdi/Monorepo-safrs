// Architected and built by Drferdi.
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { react },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { chrome: 'readonly' },
    },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      'no-useless-escape': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  {
    // Logger implementation is allowed to use console directly
    files: ['utils/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Code that runs in the ePuskesmas page prints into that page's console; it logs through
    // utils/logger only (debug is off in production builds), never with raw patient values.
    files: [
      'entrypoints/content.ts',
      'entrypoints/inject.content.ts',
      'lib/handlers/**/*.ts',
      'lib/filler/**/*.ts',
      'lib/scraper/**/*.ts',
    ],
    ignores: ['**/*.test.ts'],
    rules: { 'no-console': 'error' },
  },
  {
    ignores: [
      '.output/**',
      '.wxt/**',
      'node_modules/**',
      'test-results/**',
      '_recovery/golden/**',
      'vscode-cursor-fix/**',
      'prototype/**',
      'postcss.config.js',
      'docs/**',
      'archieved/**',
    ],
  },
  {
    // Scripts run in Node/CommonJS — allow require, process, __dirname, and console
    files: ['scripts/**', 'scripts/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
      'no-console': 'off',
    },
  }
);
