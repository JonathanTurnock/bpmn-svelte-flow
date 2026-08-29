// Tests for the BSF BPMN engine, run over a bpmn-moddle parse — the same
// moddle object shapes the studio hands the engine in the browser.
import { readFileSync } from 'node:fs';
import { BpmnModdle } from 'bpmn-moddle';
import bsfSchema from '../src/bsf-moddle.js';
import {
  BsfEngine,
  collectScenarios,
  collectTests,
  runTests,
  validate,
  processesOf
} from '../src/engine.mjs';

let pass = 0;
let fail = 0;
function check(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`PASS  ${name}`);
  } catch (err) {
    fail += 1;
    console.log(`FAIL  ${name}`);
    console.log(`      ${err.message}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
assert.equal = (a, e, msg) => {
  if (a !== e) throw new Error(msg || `expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`);
};

const moddle = new BpmnModdle({ bsf: bsfSchema });
const xml = readFileSync(
  new URL('./fixtures/messaging-flow.bpmn', import.meta.url),
  'utf8'
);
const { rootElement: definitions, warnings } = await moddle.fromXML(xml);

check('sample parses with no moddle warnings', () => {
  assert.equal(warnings.length, 0, warnings.map((w) => w.message).join('; '));
});

check('scenario and test collectors find the embedded blocks', () => {
  const processBo = processesOf(definitions)[0];
  assert.equal(collectScenarios(definitions, processBo).length, 2);
  assert.equal(collectTests(definitions, processBo).length, 3);
});

check('happy path runs end-to-end', () => {
  const engine = new BsfEngine(definitions);
  const state = engine.runToEnd({
    senderId: 'usr_1042',
    chatId: 'chat_8231',
    text: 'Paying with card 4111 1111 1111 1111, CVV: 737 — ok?'
  });
  assert(state.finished, 'engine finished');
  assert.equal(state.errors.length, 0, state.errors.join('; '));
  assert(state.visited.has('Task_Save'), 'save ran');
  assert(state.visited.has('Catch_Kinesis'), 'kinesis catch ran');
  assert(state.visited.has('Sub_Deliver'), 'delivery sub-process ran');
  assert(state.visited.has('End_Done'), 'reached the done end');
  assert(!state.visited.has('End_Rejected'), 'deny path untouched');
  const result = state.results[0];
  assert(result, 'a result payload was recorded');
  assert(result.payload.text.includes('••••'), 'PAN redacted in final payload');
  assert.equal(result.payload.deliveries.length, 2, 'two deliveries');
  assert.equal(result.payload.deliveries[0].channel, 'kafka');
  assert.equal(result.payload.deliveries[1].channel, 'webhook');
  assert(result.payload.kinesis, 'bsf:sample merged at the catch event');
});

check('denied path takes the default flow to the error end', () => {
  const engine = new BsfEngine(definitions);
  const state = engine.runToEnd({
    senderId: 'usr_6660',
    chatId: 'chat_8231',
    text: 'hey',
    muted: true
  });
  assert(state.finished, 'engine finished');
  assert.equal(state.errors.length, 0, state.errors.join('; '));
  assert(state.visited.has('End_Rejected'), 'rejected end reached');
  assert(!state.visited.has('Task_Save'), 'save never ran');
  assert(!state.visited.has('Sub_Deliver'), 'delivery never ran');
});

check('the file’s own bsf:test suite is green', () => {
  const results = runTests(definitions);
  for (const r of results) assert(r.ok, `${r.name}: ${r.error}`);
  assert.equal(results.length, 3);
});

check('validate() reports no findings on the sample', () => {
  const issues = validate(definitions).filter((i) => i.severity !== 'info');
  assert.equal(issues.length, 0, issues.map((i) => `${i.elementId}: ${i.message}`).join('; '));
});

check('step() is incremental and step-bounded', () => {
  const engine = new BsfEngine(definitions, undefined, { maxSteps: 3 });
  engine.start({ senderId: 'u', chatId: 'c', text: 't' });
  while (engine.step()) {
    /* run down the budget */
  }
  assert(engine.state.errors.some((e) => e.includes('budget')), 'budget error recorded');
});

// -- synthetic models: gateways, boundaries, MI tasks -----------------------

const synthetic = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:bsf="http://bpmn-svelte-flow/schema/1.0"
    id="Defs_Synth" targetNamespace="http://bpmn-svelte-flow/tests">
  <bpmn:error id="Err_Card" name="CardDeclined" errorCode="CARD_DECLINED"/>
  <bpmn:process id="P_Synth" isExecutable="true">
    <bpmn:startEvent id="S"><bpmn:outgoing>f1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:parallelGateway id="Fork">
      <bpmn:incoming>f1</bpmn:incoming>
      <bpmn:outgoing>fa</bpmn:outgoing><bpmn:outgoing>fb</bpmn:outgoing>
    </bpmn:parallelGateway>
    <bpmn:scriptTask id="A" scriptFormat="text/javascript">
      <bpmn:incoming>fa</bpmn:incoming><bpmn:outgoing>fa2</bpmn:outgoing>
      <bpmn:script>payload.a = true;</bpmn:script>
    </bpmn:scriptTask>
    <bpmn:scriptTask id="B" scriptFormat="text/javascript">
      <bpmn:incoming>fb</bpmn:incoming><bpmn:outgoing>fb2</bpmn:outgoing>
      <bpmn:script>payload.b = true;</bpmn:script>
    </bpmn:scriptTask>
    <bpmn:parallelGateway id="Join">
      <bpmn:incoming>fa2</bpmn:incoming><bpmn:incoming>fb2</bpmn:incoming>
      <bpmn:outgoing>f2</bpmn:outgoing>
    </bpmn:parallelGateway>
    <bpmn:serviceTask id="Charge">
      <bpmn:extensionElements>
        <bsf:mock>if (payload.declined) { throw new Error('CARD_DECLINED'); } payload.charged = true;</bsf:mock>
      </bpmn:extensionElements>
      <bpmn:incoming>f2</bpmn:incoming><bpmn:outgoing>f3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:boundaryEvent id="Bnd" attachedToRef="Charge">
      <bpmn:outgoing>fe</bpmn:outgoing>
      <bpmn:errorEventDefinition errorRef="Err_Card"/>
    </bpmn:boundaryEvent>
    <bpmn:serviceTask id="Notify">
      <bpmn:extensionElements>
        <bsf:mock>payload.notified = payload.items.map((i) => i.id);</bsf:mock>
      </bpmn:extensionElements>
      <bpmn:multiInstanceLoopCharacteristics isSequential="false">
        <bpmn:extensionElements>
          <bsf:collection expression="items" elementVariable="item"/>
        </bpmn:extensionElements>
      </bpmn:multiInstanceLoopCharacteristics>
      <bpmn:incoming>f3</bpmn:incoming><bpmn:outgoing>f4</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndOk"><bpmn:incoming>f4</bpmn:incoming></bpmn:endEvent>
    <bpmn:endEvent id="EndFail"><bpmn:incoming>fe</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="f1" sourceRef="S" targetRef="Fork"/>
    <bpmn:sequenceFlow id="fa" sourceRef="Fork" targetRef="A"/>
    <bpmn:sequenceFlow id="fb" sourceRef="Fork" targetRef="B"/>
    <bpmn:sequenceFlow id="fa2" sourceRef="A" targetRef="Join"/>
    <bpmn:sequenceFlow id="fb2" sourceRef="B" targetRef="Join"/>
    <bpmn:sequenceFlow id="f2" sourceRef="Join" targetRef="Charge"/>
    <bpmn:sequenceFlow id="f3" sourceRef="Charge" targetRef="Notify"/>
    <bpmn:sequenceFlow id="f4" sourceRef="Notify" targetRef="EndOk"/>
    <bpmn:sequenceFlow id="fe" sourceRef="Bnd" targetRef="EndFail"/>
  </bpmn:process>
</bpmn:definitions>`;

const { rootElement: synthDefs } = await moddle.fromXML(synthetic);

check('parallel fork/join merges branch payloads', () => {
  const engine = new BsfEngine(synthDefs);
  const state = engine.runToEnd({ items: [{ id: 1 }, { id: 2 }] });
  assert.equal(state.errors.length, 0, state.errors.join('; '));
  const payload = state.results[0].payload;
  assert(payload.a && payload.b, 'both branch writes survived the join');
  assert(payload.charged, 'charge ran after the join');
});

check('stepRound advances parallel branches in lockstep to the same result', () => {
  const engine = new BsfEngine(synthDefs);
  engine.start({ items: [{ id: 1 }, { id: 2 }] });
  let lockstepSeen = false;
  let guard = 0;
  while (!engine.state.finished && guard++ < 500) {
    const queued = engine.liveTokens().filter((t) => t.status === 'queued');
    const before = new Set(queued.map((t) => t.at.id));
    engine.stepRound();
    // The round where A and B are both queued must execute both of them.
    if (before.has('A') && before.has('B')) {
      assert(engine.state.visited.has('A') && engine.state.visited.has('B'));
      lockstepSeen = true;
    }
  }
  assert(lockstepSeen, 'a round with both branches queued was observed');
  assert.equal(engine.state.errors.length, 0, engine.state.errors.join('; '));
  const payload = engine.state.results[0].payload;
  assert(payload.a && payload.b && payload.charged, 'same outcome as runToEnd');
});

check('thrown mock error routes to the error boundary', () => {
  const engine = new BsfEngine(synthDefs);
  const state = engine.runToEnd({ declined: true, items: [] });
  assert.equal(state.errors.length, 0, state.errors.join('; '));
  assert(state.visited.has('EndFail'), 'boundary path taken');
  assert(!state.visited.has('Notify'), 'happy path aborted');
});

check('multi-instance task iterates the bsf:collection', () => {
  const engine = new BsfEngine(synthDefs);
  const state = engine.runToEnd({ items: [{ id: 'x' }, { id: 'y' }, { id: 'z' }] });
  assert.equal(state.errors.length, 0, state.errors.join('; '));
  const payload = state.results[0].payload;
  assert.equal(JSON.stringify(payload.notified), '["x","y","z"]');
});


// -- engine-dialect conditions + data-point snapshots ------------------------

const dialect = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    id="Defs_Dialect" targetNamespace="http://bpmn-svelte-flow/tests">
  <bpmn:process id="P_Dialect" isExecutable="true">
    <bpmn:startEvent id="S"><bpmn:outgoing>f1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:scriptTask id="Decide" scriptFormat="text/javascript">
      <bpmn:incoming>f1</bpmn:incoming><bpmn:outgoing>f2</bpmn:outgoing>
      <bpmn:script>payload.approved = payload.amount &lt; 1000;</bpmn:script>
    </bpmn:scriptTask>
    <bpmn:exclusiveGateway id="GW" default="f_no">
      <bpmn:incoming>f2</bpmn:incoming>
      <bpmn:outgoing>f_yes</bpmn:outgoing><bpmn:outgoing>f_no</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:endEvent id="EndYes"><bpmn:incoming>f_yes</bpmn:incoming></bpmn:endEvent>
    <bpmn:endEvent id="EndNo"><bpmn:incoming>f_no</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="f1" sourceRef="S" targetRef="Decide"/>
    <bpmn:sequenceFlow id="f2" sourceRef="Decide" targetRef="GW"/>
    <bpmn:sequenceFlow id="f_yes" sourceRef="GW" targetRef="EndYes">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${approved}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="f_no" sourceRef="GW" targetRef="EndNo"/>
  </bpmn:process>
</bpmn:definitions>`;

const { rootElement: dialectDefs } = await moddle.fromXML(dialect);

check('camunda-style ${...} conditions route on payload fields', () => {
  const yes = new BsfEngine(dialectDefs).runToEnd({ amount: 400 });
  assert(yes.visited.has('EndYes'), 'approved path taken');
  const no = new BsfEngine(dialectDefs).runToEnd({ amount: 4000 });
  assert(no.visited.has('EndNo'), 'default path taken');
});

check('the log snapshots the payload at data-changing steps', () => {
  const engine = new BsfEngine(dialectDefs);
  const state = engine.runToEnd({ amount: 400 });
  const scripted = state.log.find((e) => e.id === 'Decide' && e.action === 'script ran');
  assert(scripted && scripted.payload.approved === true, 'script step carries its data point');
  const ended = state.log.find((e) => e.id === 'EndYes' && e.action === 'ended');
  assert(ended && ended.payload.amount === 400, 'end step carries the final payload');
  const routed = state.log.find((e) => e.action === 'routed');
  assert(routed && routed.payload === undefined, 'non-mutating steps carry no snapshot');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
