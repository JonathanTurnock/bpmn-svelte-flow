import type { Preview } from '@storybook/svelte-vite';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i
      }
    }
  }
};

export default preview;
