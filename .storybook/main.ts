import type { StorybookConfig } from '@storybook/svelte-vite';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(ts|js)'],
  addons: [],
  framework: {
    name: '@storybook/svelte-vite',
    options: {}
  }
};

export default config;
