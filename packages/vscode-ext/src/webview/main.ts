/**
 * Webview entry: mounts the app and wires the two-message protocol with the
 * extension host (see src/extension.ts).
 */
import { mount } from 'svelte';
import '@xyflow/svelte/dist/style.css';
import '$bsf/styles.css';
import './app.css';
import App from './App.svelte';
import { runner } from './playback.svelte.js';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

// Absent in the test harness, where the app is driven by window.postMessage.
const vscode: VsCodeApi | undefined = (
  globalThis as unknown as { acquireVsCodeApi?: () => VsCodeApi }
).acquireVsCodeApi?.();

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as { type?: string; text?: string; uri?: string } | null;
  if (msg?.type !== 'document' || typeof msg.text !== 'string') return;
  const name = msg.uri ? decodeURIComponent(msg.uri.split('/').pop() || '') : undefined;
  void runner.load(msg.text, name);
});

mount(App, {
  target: document.getElementById('app')!,
  props: { onOpenAsXml: () => vscode?.postMessage({ type: 'openAsXml' }) }
});

vscode?.postMessage({ type: 'ready' });
