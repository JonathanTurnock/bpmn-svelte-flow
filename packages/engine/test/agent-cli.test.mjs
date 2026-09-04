// The bsf-agent JSON-RPC CLI: an LLM agent drives a workflow's
// bsf:instructions tasks while the engine executes everything else, with
// durable event-sourced state on disk. Every request here spawns a fresh
// process, so the suite also proves runs survive process exits.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let pass = 0;
let fail = 0;
function check(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`PASS  ${name}`);
  } catch (err) {
    fail += 1;
    console.log(`FAIL  ${name}\n      ${err.message}`);
  }
}

const BIN = new URL('../bin/bsf-agent.mjs', import.meta.url).pathname;
const FIXTURE = new URL('./fixtures/agent-triage.bpmn', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'bsf-agent-'));

function rpc(method, params) {
  const out = execFileSync(process.execPath, [BIN, method, JSON.stringify(params ?? {})], {
    cwd: dir,
    encoding: 'utf8'
  });
  return JSON.parse(out);
}
function rpcErr(method, params) {
  try {
    execFileSync(process.execPath, [BIN, method, JSON.stringify(params ?? {})], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    throw new Error('expected a JSON-RPC error');
  } catch (err) {
    if (!err.stdout) throw err;
    return JSON.parse(err.stdout);
  }
}

const start = rpc('start', { file: FIXTURE, scenario: 'Checkout outage', runId: 'r1' });
check('start parks the run on the first agent task', () => {
  const r = start.result;
  assert.equal(r.finished, false);
  assert.equal(r.pending.length, 1);
  assert.equal(r.pending[0].taskId, 'Task_Classify#1');
  assert.match(r.pending[0].instructions, /category/);
  assert.equal(r.pending[0].payload.customer, 'Dana');
});

check('state is durable on disk', () => {
  const state = JSON.parse(readFileSync(join(dir, '.bsf-runs', 'r1.json'), 'utf8'));
  assert.equal(state.runId, 'r1');
  assert.equal(state.scenario, 'Checkout outage');
  assert.deepEqual(state.completions, []);
  assert.ok(state.xmlHash);
});

check('next returns the pending task (fresh process, replayed state)', () => {
  const r = rpc('next', { runId: 'r1' }).result;
  assert.equal(r.task.taskId, 'Task_Classify#1');
});

check('completing a task advances the run through the gateway', () => {
  const r = rpc('complete', {
    runId: 'r1',
    taskId: 'Task_Classify#1',
    result: { category: 'technical', severity: 'high', summary: 'checkout down for everyone' }
  }).result;
  assert.equal(r.finished, false);
  assert.deepEqual(
    r.pending.map((t) => t.taskId),
    ['Task_Escalate#1'],
    'high severity routed to escalation'
  );
  assert.equal(r.pending[0].payload.severity, 'high', 'agent result visible downstream');
});

check('completing the last task finishes the run with merged results', () => {
  const r = rpc('complete', {
    runId: 'r1',
    taskId: 'Task_Escalate#1',
    result: { brief: 'checkout fully down; all users; technical' }
  }).result;
  assert.equal(r.finished, true);
  assert.equal(r.results[0].endId, 'End_Escalated');
  assert.equal(r.results[0].payload.brief, 'checkout fully down; all users; technical');
  assert.equal(r.results[0].payload.summary, 'checkout down for everyone');
});

check('trace records the agent steps with payload snapshots', () => {
  const r = rpc('trace', { runId: 'r1' }).result;
  const agentRuns = r.trace.filter((e) => e.action === 'agent ran');
  assert.deepEqual(
    agentRuns.map((e) => e.detail),
    ['Task_Classify#1', 'Task_Escalate#1']
  );
  assert.ok(agentRuns[1].payload.brief);
});

check('completing a non-pending task is rejected with the pending list', () => {
  const r = rpcErr('complete', { runId: 'r1', taskId: 'Task_Classify#1', result: {} });
  assert.match(r.error.message, /not pending/);
});

check('low-severity path routes to the reply task instead', () => {
  rpc('start', { file: FIXTURE, scenario: 'Billing question', runId: 'r2' });
  const r = rpc('complete', {
    runId: 'r2',
    taskId: 'Task_Classify#1',
    result: { category: 'billing', severity: 'low', summary: 'double charge' }
  }).result;
  assert.deepEqual(
    r.pending.map((t) => t.taskId),
    ['Task_Reply#1']
  );
});

check('list shows both runs with completion counts', () => {
  const r = rpc('list', {}).result;
  const byId = Object.fromEntries(r.runs.map((x) => [x.runId, x]));
  assert.equal(byId.r1.completedTasks, 2);
  assert.equal(byId.r2.completedTasks, 1);
});

check('unknown run and unknown scenario produce helpful errors', () => {
  assert.match(rpcErr('status', { runId: 'nope' }).error.message, /no run/);
  const r = rpcErr('start', { file: FIXTURE, scenario: 'nope', runId: 'r3' });
  assert.deepEqual(r.error.data.scenarios, ['Checkout outage', 'Billing question']);
});

check('the fixture still simulates fully via mocks (no agent handler)', () => {
  // Embedded tests run in the studio path where instructions are inert.
  const out = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', `
      import { readFileSync } from 'node:fs';
      import { BpmnModdle } from 'bpmn-moddle';
      import bsf from '${new URL('../src/bsf-moddle.js', import.meta.url).pathname}';
      import { runTests } from '${new URL('../src/engine.mjs', import.meta.url).pathname}';
      const moddle = new BpmnModdle({ bsf });
      const { rootElement } = await moddle.fromXML(readFileSync('${FIXTURE}', 'utf8'));
      console.log(JSON.stringify(runTests(rootElement)));
    `],
    { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname }
  );
  const results = JSON.parse(out.trim().split('\n').pop());
  assert.equal(results.length, 2);
  for (const r of results) assert.ok(r.ok, `${r.name}: ${r.error ?? ''}`);
});

rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
