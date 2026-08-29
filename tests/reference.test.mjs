// Reference-workflow rendering parity: third-party BPMN files (see
// tests/reference/SOURCES.md) must render completely in this library.
// The structural oracle is the diagram interchange itself — bpmn-js draws
// exactly the BPMNShape/BPMNEdge elements of the plane, so every DI element
// must come out of bpmnToFlow as a node or edge with no import warnings.
import { readFileSync, readdirSync } from 'node:fs';
import { parseBpmn, bpmnToFlow } from '../dist/headless.js';
import { BsfEngine } from '@bsf/engine';

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

const dir = new URL('./reference/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.bpmn'));

for (const file of files.sort()) {
  const xml = readFileSync(new URL(file, dir), 'utf8');
  const { definitions, warnings: rawWarnings } = await parseBpmn(xml);
  // The MIWG references declare ISO-8859-1; they are pure ASCII, so moddle's
  // UTF-8 fallback is lossless — that notice is a fact of the source files.
  const parseWarnings = rawWarnings.filter((w) => !/unsupported document encoding/.test(w));
  check(`${file}: parses with no moddle warnings`, parseWarnings.length === 0, parseWarnings.join('; '));

  // Every element the first BPMNDiagram's plane places...
  const plane = definitions.diagrams?.[0]?.plane;
  const diShapes = new Set();
  const diEdges = new Set();
  for (const pe of plane?.planeElement ?? []) {
    const id = pe.bpmnElement?.id;
    if (!id) continue;
    if (pe.$type === 'bpmndi:BPMNShape') diShapes.add(id);
    if (pe.$type === 'bpmndi:BPMNEdge') diEdges.add(id);
  }

  // ...must come out of the transform.
  const graph = bpmnToFlow(definitions);
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const edgeIds = new Set(graph.edges.map((e) => e.id));

  const missingShapes = [...diShapes].filter((id) => !nodeIds.has(id));
  const missingEdges = [...diEdges].filter((id) => !edgeIds.has(id));
  check(
    `${file}: all ${diShapes.size} DI shapes render`,
    missingShapes.length === 0,
    `missing: ${missingShapes.join(', ')}`
  );
  check(
    `${file}: all ${diEdges.size} DI edges render`,
    missingEdges.length === 0,
    `missing: ${missingEdges.join(', ')}`
  );
  check(`${file}: no import warnings`, graph.warnings.length === 0, graph.warnings.join('; '));
}


// The unmodified Camunda invoice also EXECUTES in the BSF engine: its
// Camunda-dialect ${...} conditions route on payload fields, user/service
// tasks pass through unmocked. (approved:false + clarified:true loops
// review->approve by design - that path needs a human to flip `approved`.)
{
  const xml = readFileSync(new URL('./reference/invoice.bpmn', import.meta.url), 'utf8');
  const { definitions } = await parseBpmn(xml);
  const happy = new BsfEngine(definitions).runToEnd({ approved: true });
  check(
    'invoice.bpmn: approved path executes to invoiceProcessed',
    happy.finished && happy.errors.length === 0 && happy.results[0]?.endId === 'invoiceProcessed',
    JSON.stringify({ errors: happy.errors, ends: happy.results.map((r) => r.endId) })
  );
  const rejected = new BsfEngine(definitions).runToEnd({ approved: false, clarified: false });
  check(
    'invoice.bpmn: rejection path executes through review to invoiceNotProcessed',
    rejected.finished &&
      rejected.errors.length === 0 &&
      rejected.visited.has('reviewInvoice') &&
      rejected.results[0]?.endId === 'invoiceNotProcessed',
    JSON.stringify({ errors: rejected.errors, ends: rejected.results.map((r) => r.endId) })
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
