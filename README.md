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

## Development

```sh
npm install
npm run storybook        # browse the notation catalog at :6006
npm run check            # svelte-check
npm run package          # build the library into dist/
npm run build-storybook  # static storybook
```

## License

[MIT](./LICENSE)
