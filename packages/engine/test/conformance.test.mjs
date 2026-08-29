// Conformance suite: every fixture workflow runs in BOTH engines — the BSF
// browser engine and bpmn-engine (a third-party BPMN 2.0 engine, through the
// generic binding-pass adapter) — from the same file and the same
// bsf:scenario payloads, and the outcomes must agree:
//   * both complete,
//   * the same top-level end events are reached,
//   * the same tasks execute (and multi-instance bodies the same number of
//     times),
//   * the payload keys listed per scenario are deep-equal at the end.
// Keys written INSIDE multi-instance iterations are deliberately not listed:
// real engines isolate iteration scopes (output mapping is an engine-dialect
// concern), so aggregation keys like the messaging flow's `deliveries` are
// the BSF engine's convenience, not a portability claim.
import { readFileSync } from 'node:fs';
// @ts-ignore - bpmn-moddle ships no types
import { BpmnModdle } from 'bpmn-moddle';
import bsfSchema from '../src/bsf-moddle.js';
import { BsfEngine, collectScenarios, processesOf } from '../src/engine.mjs';
import { runInBpmnEngine } from '../src/bpmn-engine-adapter.mjs';

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

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const setEqual = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const show = (v) => JSON.stringify(v instanceof Set ? [...v].sort() : v);

/**
 * Per-fixture parity expectations. `keys` are the payload keys compared
 * deep-equal across engines; `ends` the top-level end events each scenario
 * must (exclusively) reach; `counts` how often a multi-instance body runs.
 */
const CASES = [
  {
    file: 'routing.bpmn',
    scenarios: {
      big: { ends: ['End_Big'], keys: ['amount', 'tier'] },
      medium: { ends: ['End_Medium'], keys: ['amount', 'tier'] },
      small: { ends: ['End_Small'], keys: ['amount', 'tier'] }
    }
  },
  {
    file: 'pipeline.bpmn',
    scenarios: {
      signup: { ends: ['End_Done'], keys: ['email', 'account', 'token'] }
    }
  },
  {
    file: 'parallel.bpmn',
    scenarios: {
      quote: { ends: ['End_Done'], keys: ['base', 'tax', 'shipping', 'total'] }
    }
  },
  {
    file: 'error-boundary.bpmn',
    scenarios: {
      ok: { ends: ['End_Charged'], keys: ['card', 'charge'] },
      declined: { ends: ['End_Failed'], keys: ['card'] }
    }
  },
  {
    file: 'message.bpmn',
    scenarios: {
      order: { ends: ['End_Done'], keys: ['sku', 'orderId', 'confirmation', 'state'] }
    }
  },
  {
    file: 'multi-instance.bpmn',
    scenarios: {
      broadcast: { ends: ['End_Done'], keys: ['items', 'batch'], counts: { Task_Notify: 3 } }
    }
  },
  {
    file: 'messaging-flow.bpmn',
    scenarios: {
      // `deliveries` is written inside the MI scope — see the header note.
      'Happy path': {
        ends: ['End_Done'],
        keys: ['text', 'security', 'policy', 'messagesApi', 'kinesis', 'message', 'participants'],
        counts: { Task_Kafka: 1, Task_Webhook: 1 }
      },
      'Policy denied': { ends: ['End_Rejected'], keys: ['text', 'security', 'policy'] }
    }
  }
];

const moddle = new BpmnModdle({ bsf: bsfSchema });

function collectIds(processBo) {
  const tasks = new Set();
  const topEnds = new Set();
  const walk = (container, top) => {
    for (const el of container.flowElements ?? []) {
      if (/Task$|SubProcess$|CallActivity$|Transaction$/.test(el.$type)) tasks.add(el.id);
      if (top && el.$type === 'bpmn:EndEvent') topEnds.add(el.id);
      if (el.flowElements) walk(el, false);
    }
  };
  walk(processBo, true);
  return { tasks, topEnds };
}

for (const testCase of CASES) {
  const xml = readFileSync(new URL(`./fixtures/${testCase.file}`, import.meta.url), 'utf8');
  const { rootElement: definitions } = await moddle.fromXML(xml);
  const processBo = processesOf(definitions).find((p) => p.isExecutable) ?? processesOf(definitions)[0];
  const { tasks, topEnds } = collectIds(processBo);
  const scenarios = collectScenarios(definitions, processBo);

  const configured = Object.keys(testCase.scenarios).sort();
  check(
    `${testCase.file}: fixture scenarios match the parity table`,
    deepEqual(scenarios.map((s) => s.name).sort(), configured),
    `fixture has ${show(scenarios.map((s) => s.name))}, table has ${show(configured)}`
  );

  for (const scenario of scenarios) {
    const expected = testCase.scenarios[scenario.name];
    if (!expected) continue;
    const label = `${testCase.file} · ${scenario.name}`;

    // Run in the BSF engine.
    const ours = new BsfEngine(definitions, processBo);
    const ourState = ours.runToEnd(structuredClone(scenario.payload));
    // Run the SAME file in bpmn-engine through the adapter.
    const theirs = await runInBpmnEngine(xml, structuredClone(scenario.payload));

    check(
      `${label}: both engines complete`,
      ourState.finished && ourState.errors.length === 0 && theirs.completed,
      `bsf errors=${show(ourState.errors)} bpmn-engine=${theirs.error ?? 'ok'}`
    );

    const ourEnds = new Set(ourState.results.map((r) => r.endId));
    // A task that threw (into an error boundary) emits activity.error, not
    // activity.end — it still executed.
    const theirExecuted = new Set(
      theirs.trail.filter((t) => t.event === 'end' || t.event === 'error').map((t) => t.id)
    );
    const theirEnds = new Set(
      theirs.trail.filter((t) => t.event === 'end' && topEnds.has(t.id)).map((t) => t.id)
    );
    check(
      `${label}: same end events`,
      setEqual(ourEnds, new Set(expected.ends)) && setEqual(theirEnds, new Set(expected.ends)),
      `expected ${show(expected.ends)}, bsf ${show(ourEnds)}, bpmn-engine ${show(theirEnds)}`
    );

    const ourTasks = new Set([...ourState.visited].filter((id) => tasks.has(id)));
    const theirTasks = new Set([...theirExecuted].filter((id) => tasks.has(id)));
    check(
      `${label}: same tasks executed`,
      setEqual(ourTasks, theirTasks),
      `bsf ${show(ourTasks)}, bpmn-engine ${show(theirTasks)}`
    );

    const ourPayload = ourState.results[0]?.payload ?? {};
    for (const key of expected.keys) {
      check(
        `${label}: payload.${key} identical`,
        deepEqual(ourPayload[key], theirs.variables[key]),
        `bsf ${show(ourPayload[key])}, bpmn-engine ${show(theirs.variables[key])}`
      );
    }

    for (const [taskId, count] of Object.entries(expected.counts ?? {})) {
      const ourCount = ourState.log.filter((e) => e.id === taskId && e.action === 'completed').length;
      const theirCount = theirs.trail.filter((t) => t.event === 'end' && t.id === taskId).length;
      check(
        `${label}: ${taskId} ran ${count}×`,
        ourCount === count && theirCount === count,
        `bsf ${ourCount}, bpmn-engine ${theirCount}`
      );
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
