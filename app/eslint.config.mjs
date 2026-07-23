import js from '@eslint/js';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'reports/**',
      'coverage/**',
      'gitea-data/**',
      'postgres-data/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.js', '**/*.mjs'],
  },
  {
    ...security.configs.recommended,
    files: ['**/*.js', '**/*.mjs'],
  },
  {
    files: ['server.js', 'src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: globals.browser,
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
  },
  {
    files: ['tests/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
  },
];
