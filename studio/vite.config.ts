import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

// The studio is a static Svelte site (Pages-deployable) built on the
// repo's own Svelte Flow BPMN renderer. Run with `npm run studio`,
// build with `npm run build-studio`.
export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  base: './',
  resolve: {
    alias: {
      $bsf: fileURLToPath(new URL('../src/lib', import.meta.url)),
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  build: { outDir: 'dist', emptyOutDir: true }
});
