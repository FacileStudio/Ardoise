const reactNativeConfig = require('@repo/eslint-config/react-native');

module.exports = [
  ...reactNativeConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
