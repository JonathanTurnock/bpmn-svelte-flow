# Spike: the Lunatic artifact in a third-party engine

`messaging-flow.bpmn` is the messaging-platform flow authored the way the
studio authors it (per `PRODUCT_BRIEF.md`): strict BPMN 2.0 — message start
→ regex sanitisation script task → policy business-rule task → allow/deny
gateway with condition + default flow → save service task → Kinesis message
catch → join script task → participants service task → sequential
multi-instance delivery sub-process routing Kafka/webhook branches — with
lanes, DI, `bpmn:documentation`, and `lunatic:scenario` / `lunatic:test` /
`lunatic:mock` extensions.

This spike runs that artifact end-to-end in **bpmn-engine 25** (a
third-party Node.js BPMN 2.0 engine) and lints it for portability. It
demonstrates the product's hand-off story working against real software:

- **`run-engine.mjs`** — binds task implementations natively through the
  engine's `services` API: the *build* exit, where engineers implement the
  ports the model declares.
- **`run-engine-adapted.mjs`** — a ~150-line generic, process-agnostic
  adapter that executes the file's own `lunatic:mock` blocks as the task
  implementations, evaluates the file's declared expression/script
  languages, and tracks per-iteration multi-instance data. The file itself
  is never edited: the *buy* exit's binding pass, done at runtime. Both
  scenarios complete — the happy path (18 activities, both message waits,
  the allow branch, MI ×2 routing participant 1 → Kafka and participant 2 →
  webhook) and the denied path (DENY → default flow → `403 rejected` error
  end).
- **bpmnlint** (`.bpmnlintrc`, `bpmnlint:recommended`) passes clean, and the
  **camunda-compat** profile (`.bpmnlintrc-c8`, `camunda-cloud-8-6`) lists
  exactly the per-element binding extensions (`zeebe:*`) a Camunda 8 export
  pass injects — the binding inventory, computed by lint.

This adapter is the seed of the brief's M4 binding pass, and the mocks
doubling as the engine's implementations is the extension spec's
"reference implementation" role in action.

## Run it

```sh
npm i
node spike/run-engine.mjs spike/messaging-flow.bpmn happy            # native service binding
node spike/run-engine-adapted.mjs spike/messaging-flow.bpmn happy    # adapter executes lunatic:mock
node spike/run-engine-adapted.mjs spike/messaging-flow.bpmn denied   # policy-deny path
npx bpmnlint --config spike/.bpmnlintrc spike/messaging-flow.bpmn    # portability lint
npx bpmnlint --config spike/.bpmnlintrc-c8 spike/messaging-flow.bpmn # Camunda 8 binding inventory
```
