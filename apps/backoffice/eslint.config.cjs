const svelteConfig = require('@repo/eslint-config/svelte');

module.exports = [
  ...svelteConfig,
  {
    files: ['src/**/*.{ts,js,svelte}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        history: 'readonly',
      },
    },
  },
];
