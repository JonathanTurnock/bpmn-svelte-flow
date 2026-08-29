# @bsf/engine

The bpmn-svelte-flow (BSF) **BPMN engine**: executes a BPMN 2.0 process from
its bpmn-moddle tree using the file's own standard semantics, with JavaScript
(`text/javascript`) as the execution language. Zero runtime dependencies —
the same module runs in the browser (the studio) and under bun.

## What it executes

- **Standard constructs**: `bpmn:conditionExpression` + default flows route
  gateways (exclusive, inclusive, parallel, event-based); `bpmn:scriptTask`
  bodies run; sub-processes and sequential/parallel multi-instance loops
  iterate; error end events and error boundary events propagate and catch;
  terminate ends terminate; message catches deliver.
- **`bsf:` extensions** (see `docs/BSF_EXTENSION.md`): `bsf:mock` stands in
  for service/send/user/rule tasks, `bsf:sample` supplies message payloads,
  `bsf:collection` binds per-iteration multi-instance data, `bsf:scenario`
  names runnable payloads, `bsf:test` embeds acceptance tests.
- **The contract**: every script, mock, and condition is a JavaScript block
  over a mutable `payload`. Runs are step-bounded.

```js
import { BsfEngine, collectScenarios, runTests, validate } from '@bsf/engine';
import bsfSchema from '@bsf/engine/moddle';
import { BpmnModdle } from 'bpmn-moddle';

const { rootElement: definitions } = await new BpmnModdle({ bsf: bsfSchema }).fromXML(xml);
const engine = new BsfEngine(definitions);
const state = engine.runToEnd({ amount: 1500 }); // visited, traversedEdges, log, results, errors
const results = runTests(definitions);           // the file's own bsf:test suite
const issues = validate(definitions);            // portability / executability findings
```

`./adapter` exports `runInBpmnEngine(xml, payload)` — a generic binding-pass
adapter that runs the same unmodified file in
[bpmn-engine](https://github.com/paed01/bpmn-engine) by mapping the declared
JavaScript dialect onto that engine and executing `bsf:mock` blocks as the
task implementations.

## Tests

```sh
bun run test   # unit tests + the conformance suite
```

- `test/engine.test.mjs` — engine unit tests over the fixtures.
- `test/conformance.test.mjs` — **the parity proof**: every fixture workflow
  in `test/fixtures/` runs in BOTH engines (BSF and bpmn-engine via the
  adapter) from the same file and the same `bsf:scenario` payloads, and must
  agree on completion, the end events reached, the tasks executed (including
  multi-instance body counts), and the final value of every compared payload
  key. Fixtures cover conditional routing with defaults, sequential
  pipelines, parallel fork/join payload merging, error boundaries, message
  catches with `bsf:sample`, sequential multi-instance over
  `bsf:collection`, and the full messaging-platform flow.

One deliberate scope note, asserted rather than hidden: keys written *inside*
multi-instance iterations (like the messaging flow's `deliveries[]`) are the
BSF engine's convenience — real engines isolate iteration scopes and bind
output aggregation through their own dialects, so the conformance suite
compares iteration *counts* and pre/post-loop state for those flows.
