# Spike: the Lunatic artifact in a third-party engine

`messaging-flow.bpmn` is the studio's sample artifact, byte-for-byte
(`studio/public/samples/messaging-flow.bpmn`): the messaging-platform flow in
strict BPMN 2.0 — message start → regex sanitisation script task → policy
business-rule task → allow/deny gateway with condition + default flow → save
service task → Kinesis message catch → join script task → participants
service task → sequential multi-instance delivery sub-process routing
Kafka/webhook branches — with lanes, DI, `bpmn:documentation`, JavaScript
(`text/javascript`) for every script and condition, and `lunatic:scenario` /
`lunatic:test` / `lunatic:mock` / `lunatic:binding` / `lunatic:collection` /
`lunatic:sample` extensions.

This spike runs that file end-to-end in **bpmn-engine 25** (a third-party
Node.js BPMN 2.0 engine) and lints it for portability — the product's
hand-off story working against real software:

- **`run-engine-adapted.mjs`** — a generic, process-agnostic adapter (the
  seed of the brief's binding pass). It maps the file's declared language
  onto the engine — MIME `text/javascript` script tasks and conditions run
  against the studio's `payload` contract via a proxy over engine variables
  (FEEL via feelin where a file declares that instead) — executes the file's
  own `lunatic:mock` blocks as the task implementations, and honours
  `lunatic:collection` for per-iteration multi-instance data. The file is
  never edited. Both scenarios complete: the happy path (both message waits,
  the allow branch, MI ×2 routing participant 1 → Kafka and participant 2 →
  webhook) and the denied path (DENY → default flow → `403 rejected`).
  Studio-exported files run the same way.
- **`run-engine.mjs`** — the engine raw, with implementations bound natively
  through its `services` API. It shows why the adapter layer exists: engines
  bind languages and implementations through their own dialects, so the raw
  engine stops at the first `text/javascript` script task. The standard
  model imports everywhere; a thin per-engine adapter (or an export pass
  injecting the engine's extensions) supplies the binding.
- **bpmnlint** (`.bpmnlintrc`, `bpmnlint:recommended`) passes clean, and the
  **camunda-compat** profile (`.bpmnlintrc-c8`, `camunda-cloud-8-6`) lists
  exactly the per-element binding extensions (`zeebe:*`) a Camunda 8 export
  pass injects — the binding inventory, computed by lint.

## Run it

```sh
npm i
node spike/run-engine-adapted.mjs spike/messaging-flow.bpmn happy    # adapter executes lunatic:mock
node spike/run-engine-adapted.mjs spike/messaging-flow.bpmn denied   # policy-deny path
node spike/run-engine.mjs spike/messaging-flow.bpmn happy            # raw engine: shows the dialect gap
npx bpmnlint --config spike/.bpmnlintrc spike/messaging-flow.bpmn    # portability lint
npx bpmnlint --config spike/.bpmnlintrc-c8 spike/messaging-flow.bpmn # Camunda 8 binding inventory
```
