// Copies static stylesheets into dist after svelte-package runs.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

if (!existsSync('dist')) mkdirSync('dist');
copyFileSync('src/lib/styles.css', 'dist/styles.css');
