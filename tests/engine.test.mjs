// Import through the published svelte-free entry point so internal module
// layout can change without touching this test.
import { parseBpmn, bpmnToFlow, BpmnSimulation, runWorkflowTests } from '../dist/headless.js';

const els = ['S', 'T1', 'G', 'TA', 'TB', 'PF', 'PX', 'PY', 'PJ', 'TE', 'BE', 'TR', 'E1', 'E2'];
const flows = ['F1', 'F2', 'Fa', 'Fb', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
const shapes = els
  .map(
    (e, i) =>
      `<bpmndi:BPMNShape id='${e}_di' bpmnElement='${e}'><dc:Bounds x='${i * 120}' y='100' width='80' height='60'/></bpmndi:BPMNShape>`
  )
  .join('');
const diEdges = flows
  .map(
    (f) =>
      `<bpmndi:BPMNEdge id='${f}_di' bpmnElement='${f}'><di:waypoint x='0' y='0'/><di:waypoint x='10' y='10'/></bpmndi:BPMNEdge>`
  )
  .join('');

const xml = `<?xml version='1.0'?>
<bpmn:definitions xmlns:bpmn='http://www.omg.org/spec/BPMN/20100524/MODEL' xmlns:bpmndi='http://www.omg.org/spec/BPMN/20100524/DI' xmlns:dc='http://www.omg.org/spec/DD/20100524/DC' xmlns:di='http://www.omg.org/spec/DD/20100524/DI' targetNamespace='x'>
<bpmn:process id='P1'>
  <bpmn:startEvent id='S'/><bpmn:task id='T1' name='Score'/>
  <bpmn:exclusiveGateway id='G' default='Fb'/>
  <bpmn:task id='TA' name='A'/><bpmn:task id='TB' name='B'/>
  <bpmn:parallelGateway id='PF'/><bpmn:task id='PX'/><bpmn:task id='PY'/><bpmn:parallelGateway id='PJ'/>
  <bpmn:serviceTask id='TE' name='Explodes'/>
  <bpmn:boundaryEvent id='BE' attachedToRef='TE'><bpmn:errorEventDefinition id='ED1'/></bpmn:boundaryEvent>
  <bpmn:task id='TR' name='Recover'/>
  <bpmn:endEvent id='E1'/><bpmn:endEvent id='E2'/>
  <bpmn:sequenceFlow id='F1' sourceRef='S' targetRef='T1'/>
  <bpmn:sequenceFlow id='F2' sourceRef='T1' targetRef='G'/>
  <bpmn:sequenceFlow id='Fa' sourceRef='G' targetRef='TA'/>
  <bpmn:sequenceFlow id='Fb' sourceRef='G' targetRef='TB'/>
  <bpmn:sequenceFlow id='F3' sourceRef='TA' targetRef='PF'/>
  <bpmn:sequenceFlow id='F4' sourceRef='PF' targetRef='PX'/>
  <bpmn:sequenceFlow id='F5' sourceRef='PF' targetRef='PY'/>
  <bpmn:sequenceFlow id='F6' sourceRef='PX' targetRef='PJ'/>
  <bpmn:sequenceFlow id='F7' sourceRef='PY' targetRef='PJ'/>
  <bpmn:sequenceFlow id='F8' sourceRef='PJ' targetRef='TE'/>
  <bpmn:sequenceFlow id='F9' sourceRef='TE' targetRef='E1'/>
  <bpmn:sequenceFlow id='F10' sourceRef='BE' targetRef='TR'/>
  <bpmn:sequenceFlow id='F11' sourceRef='TR' targetRef='E2'/>
  <bpmn:sequenceFlow id='F12' sourceRef='TB' targetRef='E1'/>
</bpmn:process>
<bpmndi:BPMNDiagram id='D'><bpmndi:BPMNPlane id='PL' bpmnElement='P1'>${shapes}${diEdges}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;

const { definitions } = await parseBpmn(xml);
const graph = bpmnToFlow(definitions);
let pass = true;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) pass = false;
};

check('graph parsed (14 nodes, 14 edges)', graph.nodes.length === 14 && graph.edges.length === 14);

// Case 1: high amount → Fa branch → parallel fork/join → TE throws → boundary → TR → E2
const sim = new BpmnSimulation(graph, {
  payload: { amount: 5000 },
  scripts: {
    T1: 'payload.risk = payload.amount > 1000 ? "high" : "low";',
    G: 'return payload.risk === "high" ? "Fa" : "Fb";',
    PX: 'payload.x = 1;',
    PY: 'payload.y = 2;',
    TE: 'throw new Error("boom");'
  }
});
sim.run(50);
check('case1 finished', sim.state.finished);
check('case1 took scripted branch TA, not default TB', sim.state.visited.has('TA') && !sim.state.visited.has('TB'));
check('case1 parallel branches both ran', sim.state.visited.has('PX') && sim.state.visited.has('PY'));
check(
  'case1 join merged payload (x and y present downstream)',
  sim.state.log.some((l) => l.payload && l.payload.x === 1 && l.payload.y === 2)
);
check('case1 throw routed via boundary to E2', sim.state.visited.has('BE') && sim.state.visited.has('E2'));
check('case1 happy end E1 NOT reached', !sim.state.visited.has('E1'));

// Case 2: low amount → default flow Fb → TB → E1
const sim2 = new BpmnSimulation(graph, {
  payload: { amount: 10 },
  scripts: {
    T1: 'payload.risk = payload.amount > 1000 ? "high" : "low";',
    G: 'return payload.risk === "high" ? "Fa" : "Fb";'
  }
});
sim2.run(50);
check('case2 default branch TB taken, TA not', sim2.state.visited.has('TB') && !sim2.state.visited.has('TA'));
check('case2 finished at E1', sim2.state.finished && sim2.state.visited.has('E1'));

// Case 3: no scripts at all — exclusive falls back to default flow, still terminates
const sim3 = new BpmnSimulation(graph, {});
sim3.run(50);
check('case3 scriptless run finishes via default flow', sim3.state.finished && sim3.state.visited.has('TB'));



// ---------------------------------------------------------------------------
// Embedded scripts + workflow tests (bsf:script / bsf:test extension elements)
// ---------------------------------------------------------------------------

const execXml = `<?xml version='1.0'?>
<bpmn:definitions xmlns:bpmn='http://www.omg.org/spec/BPMN/20100524/MODEL' xmlns:bpmndi='http://www.omg.org/spec/BPMN/20100524/DI' xmlns:dc='http://www.omg.org/spec/DD/20100524/DC' xmlns:di='http://www.omg.org/spec/DD/20100524/DI' xmlns:bsf='http://bpmn-svelte-flow/schema/1.0' targetNamespace='x'>
<bpmn:process id='P1'>
  <bpmn:extensionElements>
    <bsf:test name='high goes to A' payload='{"amount": 5000}'>
      assert(state.visited.has('TA'), 'TA should be visited');
      assert(!state.visited.has('TB'));
      assert.equal(payload.risk, 'high');
    </bsf:test>
    <bsf:test name='low goes to B' payload='{"amount": 5}'>
      assert(state.visited.has('TB'));
      assert.equal(payload.risk, 'low');
    </bsf:test>
    <bsf:test name='deliberately failing' payload='{"amount": 5}'>
      assert.equal(payload.risk, 'high', 'should fail: low amount is low risk');
    </bsf:test>
  </bpmn:extensionElements>
  <bpmn:startEvent id='S'/>
  <bpmn:task id='T1' name='Score'>
    <bpmn:extensionElements>
      <bsf:script>payload.risk = payload.amount > 1000 ? 'high' : 'low';</bsf:script>
    </bpmn:extensionElements>
  </bpmn:task>
  <bpmn:exclusiveGateway id='G' default='Fb'>
    <bpmn:extensionElements>
      <bsf:script>return payload.risk === 'high' ? 'Fa' : 'Fb';</bsf:script>
    </bpmn:extensionElements>
  </bpmn:exclusiveGateway>
  <bpmn:task id='TA'/><bpmn:task id='TB'/>
  <bpmn:endEvent id='E1'/>
  <bpmn:sequenceFlow id='F1' sourceRef='S' targetRef='T1'/>
  <bpmn:sequenceFlow id='F2' sourceRef='T1' targetRef='G'/>
  <bpmn:sequenceFlow id='Fa' sourceRef='G' targetRef='TA'/>
  <bpmn:sequenceFlow id='Fb' sourceRef='G' targetRef='TB'/>
  <bpmn:sequenceFlow id='F3' sourceRef='TA' targetRef='E1'/>
  <bpmn:sequenceFlow id='F4' sourceRef='TB' targetRef='E1'/>
</bpmn:process>
<bpmndi:BPMNDiagram id='D'><bpmndi:BPMNPlane id='PL' bpmnElement='P1'>
${['S', 'T1', 'G', 'TA', 'TB', 'E1']
  .map(
    (e, i) =>
      `<bpmndi:BPMNShape id='${e}_di' bpmnElement='${e}'><dc:Bounds x='${i * 120}' y='100' width='80' height='60'/></bpmndi:BPMNShape>`
  )
  .join('')}
${['F1', 'F2', 'Fa', 'Fb', 'F3', 'F4']
  .map(
    (f) =>
      `<bpmndi:BPMNEdge id='${f}_di' bpmnElement='${f}'><di:waypoint x='0' y='0'/><di:waypoint x='10' y='10'/></bpmndi:BPMNEdge>`
  )
  .join('')}
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;

const { definitions: execDefs } = await parseBpmn(execXml);
const execGraph = bpmnToFlow(execDefs);
check('embedded tests parsed from file', execGraph.tests.length === 3);
check(
  'embedded node scripts parsed from file',
  execGraph.nodes.find((n) => n.id === 'T1')?.data.script?.includes('payload.risk') === true
);

const simEmbedded = new BpmnSimulation(execGraph, { payload: { amount: 9000 } });
simEmbedded.run(50);
check('embedded scripts drive routing without props', simEmbedded.state.visited.has('TA'));
check(
  'end-event results recorded with final payload',
  simEmbedded.state.results.length === 1 && simEmbedded.state.results[0].payload.risk === 'high'
);

const results = runWorkflowTests(execGraph, execGraph.tests);
check('workflow test 1 passes', results[0].passed === true);
check('workflow test 2 passes', results[1].passed === true);
check(
  'deliberately failing test fails with its message',
  results[2].passed === false && /low risk/.test(results[2].error ?? '')
);

// ---------------------------------------------------------------------------
// Fixture library (src/stories/fixtures/*.bpmn)
//
// Every fixture is a complete, standalone BPMN 2.0 document with full DI, so
// parsing one with zero warnings proves that every BPMNShape resolves, has
// bounds, and that every BPMNEdge has two or more waypoints and endpoints that
// exist on the plane. The executable fixtures additionally ship their own
// bsf:test blocks, which are run headless here.
// ---------------------------------------------------------------------------
const { readFileSync } = await import('node:fs');

const FIXTURE_DIR = new URL('../src/stories/fixtures/', import.meta.url).pathname;

const renderFixtures = [
  'quickstart.bpmn',
  'event-showcase.bpmn',
  'activity-showcase.bpmn',
  'gateway-showcase.bpmn',
  'data-and-artifacts.bpmn',
  'collaboration.bpmn',
  'choreography.bpmn',
  'conversation.bpmn'
];
const executableFixtures = ['executable-claims.bpmn', 'executable-parallel.bpmn'];

/** Parses a fixture from disk and asserts it produced a clean, non-empty graph. */
async function loadFixture(file) {
  const source = readFileSync(FIXTURE_DIR + file, 'utf8');
  const { definitions: defs } = await parseBpmn(source);
  const g = bpmnToFlow(defs);
  const diShapes = (source.match(/<bpmndi:BPMNShape\b/g) ?? []).length;
  const diEdges = (source.match(/<bpmndi:BPMNEdge\b/g) ?? []).length;
  check(
    `${file} rendered every DI element (${diShapes} shapes, ${diEdges} edges)`,
    g.nodes.length === diShapes && g.edges.length === diEdges
  );
  check(`${file} parsed with no warnings`, g.warnings.length === 0);
  if (g.warnings.length) console.log(`        ${g.warnings.join('\n        ')}`);
  return g;
}

for (const file of renderFixtures) {
  await loadFixture(file);
}

for (const file of executableFixtures) {
  const g = await loadFixture(file);
  check(`${file} embedded workflow tests found (>= 3)`, g.tests.length >= 3);
  check(
    `${file} embedded node scripts found`,
    g.nodes.filter((n) => n.data.script).length >= 3
  );
  const fixtureResults = runWorkflowTests(g, g.tests);
  check(`${file} ran every embedded test`, fixtureResults.length === g.tests.length);
  for (const result of fixtureResults) {
    check(
      `${file} test "${result.name}"`,
      result.passed === true
    );
    if (!result.passed) console.log(`        ${result.error}`);
  }
}

process.exit(pass ? 0 : 1);
