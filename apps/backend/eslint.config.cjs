const nodeConfig = require('@repo/eslint-config/node');

module.exports = [
  ...nodeConfig,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
