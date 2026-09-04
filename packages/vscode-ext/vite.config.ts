import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The webview app: a single-file Svelte 5 bundle with FIXED asset names so
// the extension host can point at dist/webview/index.js + index.css.
// `$bsf` resolves to the repo's own renderer source, exactly as the studio
// does (the root package is not a bun workspace member, so it cannot be
// referenced as a dependency).
export default defineConfig({
  plugins: [svelte()],
  base: './',
  resolve: {
    alias: {
      $bsf: fileURLToPath(new URL('../../src/lib', import.meta.url))
    }
  },
  build: {
    outDir: 'dist/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/webview/main.ts', import.meta.url)),
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: 'index-[name].js',
        assetFileNames: 'index.[ext]'
      }
    }
  }
});
