import type { StorybookConfig } from '@storybook/svelte-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/svelte-vite',
    options: {},
  },
  docs: {},
  viteFinal: async (config) => {
    return mergeConfig(config, {
      optimizeDeps: {
        include: ['@storybook/svelte'],
      },
      assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf'],
    });
  },
};

export default config;
