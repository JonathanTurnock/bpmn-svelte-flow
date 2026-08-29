// Tests for the studio's browser BPMN engine (studio/engine.mjs), run in
// node over a bpmn-moddle parse — the same moddle object shapes bpmn-js
// hands the engine in the browser.
import { readFileSync } from 'node:fs';
import { BpmnModdle } from 'bpmn-moddle';
import lunaticSchema from '../studio/src/lib/engine/lunatic-moddle.js';
import {
  LunaticEngine,
  collectScenarios,
  collectTests,
  runTests,
  validate,
  processesOf
} from '../studio/src/lib/engine/engine.mjs';

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

const moddle = new BpmnModdle({ lunatic: lunaticSchema });
const xml = readFileSync(
  new URL('../studio/public/samples/messaging-flow.bpmn', import.meta.url),
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
  const engine = new LunaticEngine(definitions);
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
  assert(result.payload.kinesis, 'lunatic:sample merged at the catch event');
});

check('denied path takes the default flow to the error end', () => {
  const engine = new LunaticEngine(definitions);
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

check('the file’s own lunatic:test suite is green', () => {
  const results = runTests(definitions);
  for (const r of results) assert(r.ok, `${r.name}: ${r.error}`);
  assert.equal(results.length, 3);
});

check('validate() reports no findings on the sample', () => {
  const issues = validate(definitions).filter((i) => i.severity !== 'info');
  assert.equal(issues.length, 0, issues.map((i) => `${i.elementId}: ${i.message}`).join('; '));
});

check('step() is incremental and step-bounded', () => {
  const engine = new LunaticEngine(definitions, undefined, { maxSteps: 3 });
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
    xmlns:lunatic="https://lunatic.dev/schema/1.0"
    id="Defs_Synth" targetNamespace="http://lunatic.dev/tests">
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
        <lunatic:mock>if (payload.declined) { throw new Error('CARD_DECLINED'); } payload.charged = true;</lunatic:mock>
      </bpmn:extensionElements>
      <bpmn:incoming>f2</bpmn:incoming><bpmn:outgoing>f3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:boundaryEvent id="Bnd" attachedToRef="Charge">
      <bpmn:outgoing>fe</bpmn:outgoing>
      <bpmn:errorEventDefinition errorRef="Err_Card"/>
    </bpmn:boundaryEvent>
    <bpmn:serviceTask id="Notify">
      <bpmn:extensionElements>
        <lunatic:mock>payload.notified = payload.items.map((i) => i.id);</lunatic:mock>
      </bpmn:extensionElements>
      <bpmn:multiInstanceLoopCharacteristics isSequential="false">
        <bpmn:extensionElements>
          <lunatic:collection expression="items" elementVariable="item"/>
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
  const engine = new LunaticEngine(synthDefs);
  const state = engine.runToEnd({ items: [{ id: 1 }, { id: 2 }] });
  assert.equal(state.errors.length, 0, state.errors.join('; '));
  const payload = state.results[0].payload;
  assert(payload.a && payload.b, 'both branch writes survived the join');
  assert(payload.charged, 'charge ran after the join');
});

check('thrown mock error routes to the error boundary', () => {
  const engine = new LunaticEngine(synthDefs);
  const state = engine.runToEnd({ declined: true, items: [] });
  assert.equal(state.errors.length, 0, state.errors.join('; '));
  assert(state.visited.has('EndFail'), 'boundary path taken');
  assert(!state.visited.has('Notify'), 'happy path aborted');
});

check('multi-instance task iterates the lunatic:collection', () => {
  const engine = new LunaticEngine(synthDefs);
  const state = engine.runToEnd({ items: [{ id: 'x' }, { id: 'y' }, { id: 'z' }] });
  assert.equal(state.errors.length, 0, state.errors.join('; '));
  const payload = state.results[0].payload;
  assert.equal(JSON.stringify(payload.notified), '["x","y","z"]');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
