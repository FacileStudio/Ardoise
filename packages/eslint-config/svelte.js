const baseConfig = require('./index.js');
const sveltePlugin = require('eslint-plugin-svelte');
const svelteParser = require('svelte-eslint-parser');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  ...baseConfig,
  ...sveltePlugin.configs['flat/recommended'],
  {
    files: ['**/*.svelte.ts'],
    languageOptions: {
      parser: tsParser,
      globals: {
        $state: 'readonly',
        $derived: 'readonly',
        $effect: 'readonly',
        $props: 'readonly',
        $bindable: 'readonly',
        $inspect: 'readonly',
        $host: 'readonly',
      },
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        navigator: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        history: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
  },
];
