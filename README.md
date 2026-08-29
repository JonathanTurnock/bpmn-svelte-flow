# bpmn-svelte-flow

A [Svelte Flow](https://svelteflow.dev) based **BPMN 2.0 renderer** for Svelte 5.
Feed it a BPMN XML document and it renders the diagram on an interactive
pan/zoom canvas, using the BPMN DI (diagram interchange) for faithful layout —
shapes at their modeled positions, edges following their modeled waypoints.

- **Full BPMN 2.0 notation coverage** — events (all definitions, throw/catch,
  interrupting/non-interrupting, boundary), every task type, sub-processes
  (embedded, event, ad-hoc, transaction, call activity), all gateways, pools &
  lanes, data objects/inputs/outputs/stores, artifacts (text annotations,
  groups), conversations and choreography, plus every connecting object
  (sequence/default/conditional flows, message flows, associations, data
  associations, conversation links).
- **Parses real BPMN files** via [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle)
  (the parser behind bpmn.io) — the full BPMN 2.0 schema is supported.
- **Svelte Flow native** — nodes and edges are regular Svelte Flow elements, so
  you get panning, zooming, fit-view, selection, minimap and background out of
  the box, and you can compose the exported node/edge components into your own
  `<SvelteFlow>` for custom behavior.
- **Storybook for every notation element** — run `npm run storybook` to browse
  the whole catalog.

The repo also ships **BSF Studio** (`studio/`) — an in-browser BPMN
engine and PoC workbench built on this renderer. See
[BSF Studio](#bsf-studio) below and `PRODUCT_BRIEF.md`.

## Installation

Install straight from GitHub (no npm registry needed):

```sh
npm install github:JonathanTurnock/bpmn-svelte-flow
```

The package builds itself on install via its `prepare` script. Svelte `^5` is a
peer dependency; `@xyflow/svelte` and `bpmn-moddle` are pulled in automatically.

## Usage

```svelte
<script>
  import { BpmnDiagram } from 'bpmn-svelte-flow';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <bpmn:definitions …>…</bpmn:definitions>`;
</script>

<BpmnDiagram {xml} height="600px" />
```

### `<BpmnDiagram>` props

| Prop             | Type                                    | Default  | Description                                            |
| ---------------- | --------------------------------------- | -------- | ------------------------------------------------------ |
| `xml`            | `string`                                | required | BPMN 2.0 XML document to render                        |
| `diagramId`      | `string`                                | first    | Which `BPMNDiagram` of the file to render              |
| `height`/`width` | `string`                                | `100%`   | CSS size of the canvas container                       |
| `background`     | `boolean`                               | `true`   | Dotted canvas background                               |
| `controls`       | `boolean`                               | `true`   | Zoom / fit-view controls                               |
| `minimap`        | `boolean`                               | `false`  | Minimap                                                |
| `interactive`    | `boolean`                               | `true`   | Pan / zoom / selection                                 |
| `fitViewPadding` | `number`                                | `0.1`    | Padding used when fitting the diagram                  |
| `onload`         | `({ nodes, edges, warnings }) => void`  | —        | Called after a document is parsed and rendered         |
| `onerror`        | `(error: Error) => void`                | —        | Called when parsing fails                              |

## Simulation

`<BpmnSimulator>` adds token-flow simulation on top of the renderer. Behaviour
is attached to nodes as small **JavaScript attachment boxes**: click a node on
the canvas and write plain JS against the payload.

```svelte
<script>
  import { BpmnSimulator } from 'bpmn-svelte-flow';
</script>

<BpmnSimulator
  {xml}
  height="600px"
  payload={{ amount: 5200 }}
  scripts={{
    Task_Score: 'payload.risk = payload.amount > 1000 ? "high" : "low";',
    Gw_Amount: 'return payload.risk === "high" ? "Flow_manual" : "Flow_auto";'
  }}
/>
```

- **Activities / events**: the script reads and mutates `payload` (or returns a
  replacement). `throw`ing inside an activity routes the token to an attached
  error boundary event.
- **Exclusive / event-based gateways**: return the id or label of the outgoing
  flow to take; the default flow (then the first flow) is the fallback.
- **Inclusive gateways**: return an array of flow ids; **parallel gateways**
  fork every path and join when all incoming flows have delivered a token,
  merging payloads.

The component provides Step / Play / Reset controls, an initial-payload JSON
editor, per-node script editors (click any node), a payload log, live
highlighting of the control flow, and token dots animated along the real edge
waypoints. The engine is also exported headless as `BpmnSimulation` for
driving your own UI, and `npm test` exercises it in Node.

### Executable workflow files

Code blocks and tests can live **in the BPMN file itself** via extension
elements (namespace `xmlns:bsf="http://bpmn-svelte-flow/schema/1.0"`), so a
workflow ships as a single self-contained, executable, tested document:

```xml
<bpmn:process id="Process_1" isExecutable="true">
  <bpmn:extensionElements>
    <bsf:test name="large claims go to manual review" payload='{"amount": 5200}'>
      assert(state.visited.has('Task_Manual'), 'manual review reached');
      assert.equal(payload.approvedBy, 'supervisor');
    </bsf:test>
  </bpmn:extensionElements>

  <bpmn:userTask id="Task_Manual" name="Manual review">
    <bpmn:extensionElements>
      <bsf:script>payload.approvedBy = "supervisor";</bsf:script>
    </bpmn:extensionElements>
  </bpmn:userTask>
  …
```

- `<bsf:script>` on any flow node is its code block (same contract as above);
  scripts passed via the `scripts` prop override file scripts per element id.
- `<bsf:test>` on the process (or definitions) defines a workflow test: each
  test runs a fresh headless simulation with its `payload` attribute (JSON),
  then executes its body with `state` (visited/traversedEdges Sets, log,
  finished), `payloads` (final payload of every token consumed at an end
  event), `payload` (= `payloads[0]`) and `assert`/`assert.equal`.
- Parsed tests are returned as `bpmnToFlow(...).tests`; run them headless with
  `runWorkflowTests(graph, graph.tests)`, or from the simulator's
  **Workflow tests** panel, which shows per-test pass/fail results.

### Lower-level API

```ts
import {
  parseBpmn,      // xml -> bpmn-moddle definitions tree
  bpmnToFlow,     // definitions -> { nodes, edges, warnings }
  bpmnNodeTypes,  // node type registry for <SvelteFlow>
  bpmnEdgeTypes   // edge type registry for <SvelteFlow>
} from 'bpmn-svelte-flow';

const { definitions } = await parseBpmn(xml);
const { nodes, edges, warnings } = bpmnToFlow(definitions);
```

Pass `nodes`/`edges` with `bpmnNodeTypes`/`bpmnEdgeTypes` to your own
`<SvelteFlow>` when you need full control over the canvas.

## Theming

All colors and fonts are driven by CSS custom properties (each has a built-in
fallback, so no stylesheet import is required). Import the defaults and
override what you like:

```css
@import 'bpmn-svelte-flow/styles.css';

:root {
  --bpmn-stroke: #22242a;       /* shape and edge strokes */
  --bpmn-fill: #ffffff;         /* shape fill */
  --bpmn-label-color: #22242a;  /* label text */
  --bpmn-canvas-bg: #ffffff;    /* canvas background */
  --bpmn-selected: #1a70ef;     /* selection highlight */
  --bpmn-font-family: Arial, sans-serif;
}
```

## BSF Studio

`studio/` is a static Svelte site — deployable to any static host — that
turns the renderer into a full **local, in-browser BPMN workbench**:

- **The canvas is this library**: the studio renders and edits diagrams with
  the repo's own Svelte Flow nodes and edges (drag shapes, click to inspect;
  DI is maintained on every mutation).
- **An in-browser BPMN engine, JavaScript execution** (`studio/src/lib/engine/`):
  runs the file's standard semantics — `conditionExpression` + default flows,
  `bpmn:scriptTask` bodies, multi-instance loops, error boundaries, message
  events — with `bsf:mock` blocks standing in for service/user tasks and
  `bsf:test` blocks asserting on the outcome. All scripts, mocks and
  conditions are JavaScript (`text/javascript`) over a mutable `payload`.
- **Everything else is standards-compliant BPMN 2.0**: the artifact imports
  into other engines — `spike/` proves it end-to-end in bpmn-engine, with a
  generic adapter mapping the declared JavaScript onto the engine.
- **WebMCP tools for the whole workspace**: 31 tools registered on
  `navigator.modelContext` (and always on `window.bsf` for the console) —
  read (`get_model`, `get_element`, `get_issues`), build (`add_element`,
  `connect`, `add_lane`, `auto_layout`, …), logic (`set_condition`,
  `set_script`, `set_mock`, `set_binding`, `set_documentation`), execute &
  verify (`define_scenario`, `run_scenario`, `step_scenario`, `add_test`,
  `run_tests`) and workspace management (`new_document`, `load_document`,
  `export_document`, `save_document`, `open_document`, `list_documents`,
  `delete_document`, `undo`). Agent and human mutations share one undo stack.
- **IDE-like UI**: [shadcn-svelte](https://shadcn-svelte.com) components
  (installed via the shadcn-svelte CLI into `studio/src/lib/components/ui/`,
  on bits-ui + Tailwind 4; `studio/components.json` configures the CLI for
  adding more), CodeMirror editors for scripts, mocks, conditions, test
  bodies and the live XML view, plus Run / Tests / Issues panels and a
  localStorage-backed document workspace with autosave.

```sh
npm run studio        # dev server (opens the studio)
npm run build-studio  # static build into studio/dist/
```

## Development

```sh
npm install
npm run storybook        # browse the notation catalog at :6006
npm run check            # svelte-check
npm run package          # build the library into dist/
npm run build-storybook  # static storybook
npm test                 # library engine tests + studio engine tests
```

## License

[MIT](./LICENSE)
