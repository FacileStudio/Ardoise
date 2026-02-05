const svelteConfig = require('@repo/eslint-config/svelte');

module.exports = [
  ...svelteConfig,
  {
    files: ['src/**/*.{ts,js,svelte}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
