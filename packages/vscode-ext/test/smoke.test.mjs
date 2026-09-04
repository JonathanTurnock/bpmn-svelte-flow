/**
 * Webview smoke test: the built bundle, loaded in a real browser with a
 * stubbed VS Code API, must render the diagram of a document pushed to it and
 * play the run — the two things the extension exists to do.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const bundle = readFileSync(here('../dist/webview/index.js'), 'utf8');
const styles = readFileSync(here('../dist/webview/index.css'), 'utf8');
const fixture = readFileSync(
  here('../../engine/test/fixtures/agent-triage.bpmn'),
  'utf8'
);

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) {
    pass += 1;
    console.log(`PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${name}${extra ? `\n      ${extra}` : ''}`);
  }
}

const harness = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<link rel="stylesheet" href="./index.css" />
<script>
  window.acquireVsCodeApi = () => ({ postMessage() {}, getState() {}, setState() {} });
  window.__doc = ${JSON.stringify(fixture)};
</script>
</head>
<body><div id="app"></div>
<script type="module" src="./index.js"></script>
<script type="module">
  // The host normally posts this in response to {type:'ready'}.
  window.postMessage({ type: 'document', text: window.__doc, uri: 'file:///agent-triage.bpmn' }, '*');
</script>
</body></html>`;

const server = createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/index.js') {
    res.writeHead(200, { 'content-type': 'text/javascript' }).end(bundle);
  } else if (url === '/index.css') {
    res.writeHead(200, { 'content-type': 'text/css' }).end(styles);
  } else {
    res.writeHead(200, { 'content-type': 'text/html' }).end(harness);
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

// Browser resolution: BSF_CHROMIUM env > the sandbox's pinned build > the
// playwright-managed default (CI installs it with `playwright install`).
const pinned = '/opt/pw-browsers/chromium';
const executablePath = process.env.BSF_CHROMIUM ?? (existsSync(pinned) ? pinned : undefined);
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  await page.goto(base, { waitUntil: 'load' });

  await page.waitForSelector('.svelte-flow__node', { timeout: 10_000 });
  const nodeCount = await page.locator('.svelte-flow__node').count();
  check(`renders the diagram (${nodeCount} nodes, expected >= 7)`, nodeCount >= 7);

  check('the bundle raises no page errors', errors.length === 0, errors.join('; '));

  // Play: a token dot must travel an edge.
  await page.getByTestId('run-button').click();
  let tokenSeen = true;
  try {
    await page.waitForSelector('.bpmn-token', { timeout: 5000 });
  } catch {
    tokenSeen = false;
  }
  check('playing the run animates a token along an edge', tokenSeen);

  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="trace-step"]').length > 0,
    undefined,
    { timeout: 10_000 }
  );
  const stepRows = await page.getByTestId('trace-step').count();
  check(`the steps list gains rows (${stepRows})`, stepRows > 0);

  // Scrub to the end: the run's outcome is revealed.
  const slider = page.getByTestId('run-slider');
  const max = await slider.getAttribute('max');
  await slider.fill(String(max));
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="run-status"]');
      return !!el && /completed|failed/.test(el.textContent || '');
    },
    undefined,
    { timeout: 10_000 }
  );
  const status = (await page.getByTestId('run-status').textContent())?.trim();
  check(`scrubbing to the end shows a completed indicator (${status})`, status === 'completed');
} catch (err) {
  fail += 1;
  console.log(`FAIL  smoke run threw\n      ${err.message}`);
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
