import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/'] },
  js.configs.recommended,
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },
  {
    files: ['content.js', 'popup.js', 'options.js'],
    languageOptions: { sourceType: 'script' },
  },
  {
    files: ['test/**', 'scripts/**', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
];
