# Product Brief — BSF Studio


*Status: shipped — the studio lives in `studio/` (`bun run studio`).*
*Builds on: this repo's own Svelte Flow BPMN renderer, bpmn-moddle, the
execution semantics and test-runner contract proven here, and a
WebMCP-compliant chat client in Chrome (already built, external to this
product).*

## One-liner

A static site where a developer and their in-browser AI agent **build,
execute, and verify a visual API PoC together**: the agent drives the BPMN
canvas through WebMCP tools, the human talks (or edits the diagram directly),
and the result is a single **standards-compliant BPMN 2.0 file** — a process
that runs in the browser today and imports into Camunda, Flowable, or any
other conformant engine tomorrow.

## Why

- Devs understand a flow fastest by stepping a payload through it and reading
  the logic behind each node — the `poc/` site in this repo proved the
  *viewing* half of that.
- A WebMCP chat makes *authoring* a conversation: describe the flow, watch it
  appear on the canvas, run it, verify it.
- Standards conformance turns the artifact into a head start: the PoC file is
  a **deployable skeleton**. When devs build the real thing on an engine,
  they import the very same file and bind implementations to elements that
  are already modeled, routed, and documented.
- Because the artifact is engine-neutral and executable, it becomes the
  company's **build-or-buy instrument**: once the business modelling is done
  and verified, the same file prices both paths — deploy it onto a candidate
  engine (buy) or implement it in code against its embedded acceptance tests
  (build) — and the comparison is measured, not argued.

## What it is

- A **requirements & PoC studio** whose output is valid, executable BPMN 2.0.
- **Strictly standard**: spec constructs for everything the spec covers;
  custom data rides in `bpmn:extensionElements`, the spec's own extension
  mechanism.
- A **static site**: deploys to Pages by copying a folder; state lives in the
  browser and in the file.
- **Agent-and-human operated**: every tool has a UI equivalent, and the
  canvas is a full modeler in its own right.
- An **in-browser execution engine**, plain JavaScript: it runs the file's
  standard semantics (condition expressions, default flows, script tasks) and
  its `bsf:mock` blocks, drives the visible token, and runs the embedded
  tests.

## Standards conformance (the governing design rule)

**Rule: if BPMN 2.0 defines a construct for it, we use that construct.
Custom data rides only in `bpmn:extensionElements` — the spec's own
extension mechanism, which conformant tools ignore and preserve — and
never carries semantics the diagram depends on.**

What that means concretely:

| Concern | Standard construct |
|---|---|
| Gateway routing | **`bpmn:conditionExpression`** (`tFormalExpression`, declared `language`) on outgoing flows + **`default`** attribute on the gateway |
| Script logic | **`bpmn:scriptTask`** with **`scriptFormat`** + **`bpmn:script`** where the logic *is* script; other task types keep their standard meaning |
| Browser behaviour of service/user tasks | the task stays a plain standard `serviceTask`/`userTask`; the browser mock lives in **`bsf:mock`** inside `extensionElements` |
| Human-readable business logic | **`bpmn:documentation`** — standard on every element, preserved and displayed by engines and modelers |
| Data hand-offs worth modeling | standard **data objects / data associations / `ioSpecification`** where they add clarity |
| Scenarios & tests | **`bsf:scenario`** / **`bsf:test`** in `extensionElements` (the spec-sanctioned slot for tool data) |
| Process flag | `isExecutable="true"`; definitions declare `expressionLanguage` and default `scriptFormat` explicitly |

Conformance is enforced:

- **Schema validity** — every exported file validates against the BPMN 2.0 XSD
  (moddle strict parse in the app; XSD validation in repo CI).
- **Portability lint** — bpmnlint with a portability ruleset runs on every
  mutation; the agent sees violations in every tool response. (bpmnlint also
  has engine-compat plugins, e.g. Camunda's, available as opt-in profiles.)
- **Round-trip tests** — CI proves: export → re-import (bpmn-moddle strict) →
  semantic model identical; extensions preserved; file opens in stock
  bpmn.io modeler untouched.
- **Acceptance bar** — the flagship example file imports warning-free into
  Camunda Modeler and Flowable's modeler.

**The language: JavaScript, everywhere.** Script task bodies,
`bsf:mock` blocks, and `conditionExpression` bodies are all JavaScript,
declared honestly in the file (`scriptFormat` /
`conditionExpression language` = `text/javascript`). It is the browser
engine's native language and the richest language for mocks; the binding
pass re-expresses conditions in each target engine's dialect on export.

## The file (single source of truth)

One self-contained, schema-valid BPMN 2.0 document. Sketch:

```xml
<bpmn:definitions xmlns:bsf="http://bpmn-svelte-flow/schema/1.0" …>
  <bpmn:process id="P" isExecutable="true">
    <bpmn:extensionElements>
      <bsf:scenario name="Happy path" payload='{"amount":5200}'/>
      <bsf:test name="large claims go to review" payload='{"amount":5200}'>
        assert(state.visited.has('Task_Review'));
      </bsf:test>
    </bpmn:extensionElements>

    <bpmn:serviceTask id="Task_Save" name="Save message (Messages API)">
      <bpmn:documentation>POST /v1/messages → 201 { messageId }.
        Owns durability; emits to Kinesis after commit.</bpmn:documentation>
      <bpmn:extensionElements>
        <bsf:mock>payload.messagesApi = { status: 201, messageId: id() };</bsf:mock>
      </bpmn:extensionElements>
    </bpmn:serviceTask>

    <bpmn:exclusiveGateway id="GW_Allowed" name="Allowed?" default="Flow_Deny"/>
    <bpmn:sequenceFlow id="Flow_Allow" sourceRef="GW_Allowed" targetRef="Task_Save">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
        payload.policy.decision === "ALLOW"
      </bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    …
```

Strip every `bsf:` extension and `bpmn:documentation` stays, routing stays,
script tasks stay: **the process is still complete and executable** — that
is the conformance test in one sentence.

## The model is the application layer

The artifact carries a code-organisation discipline into the real build:
business logic separated from infrastructure, DDD-style, with the BPMN model
as the application/use-case layer and engineers owning every integration.
The mapping is direct:

| BPMN construct | DDD / hexagonal role | Owned by |
|---|---|---|
| Process | Use case / application service (orchestration) | model |
| Script task | Domain logic — pure, deterministic | model |
| Service task + `bsf:binding` | **Port** — adapter implemented in code | engineer |
| Message events | Domain events crossing the boundary | engineer (transport) |
| Timer events | Clock port | engineer (scheduler) |
| Error / compensation boundaries | Failure policy | model |
| Payload | The aggregate/DTO moving through the use case | model |

Service tasks are the ports: in the real build, engineers implement them —
with the file's documentation as the contract and its embedded tests as the
acceptance criteria.

## Core loops

1. **Converse → build.** User chats; agent calls model-write tools; the
   canvas updates live (mutations are undo-stack entries the human can see
   and revert).
2. **Direct manipulation.** The same canvas is a full bpmn-js Modeler; the
   agent stays current by reading tools — it never caches the model.
3. **Execute → inspect.** Run a scenario: token animates, side panel shows
   `bpmn:documentation` for the active node and the payload with per-step
   diffs. The engine executes *standard semantics*: condition expressions
   route gateways, script tasks run their `bpmn:script`, mocks stand in for
   service/user tasks.
4. **Verify (the differentiator).** The agent runs `run_tests` /
   `run_scenario` itself, reads the trace, and iterates until green — it
   ships a passing PoC, not a picture. Portability lint is part of green.
5. **Hand off — three exits from one artifact.**
   (a) *Communicate*: read-only walkthrough bundle for Pages.
   (b) *Build*: the file is the spec — devs implement the services; the
   embedded scenarios/tests are the acceptance criteria the real
   implementation must satisfy (runnable against it as black-box payload
   assertions).
   (c) *Buy*: a binding pass targets a chosen engine — injecting its
   binding extensions (e.g. `zeebe:TaskDefinition` job types where the
   mocks were, message subscriptions for the catch events) so the same
   model deploys and the mocks become the worker stubs to replace.

### The build-or-buy decision pack

Because exits (b) and (c) consume the *same* verified artifact, the studio
can emit a decision pack that turns build-vs-buy into measured deltas:

- **Per-engine compatibility report** — bpmnlint engine profiles (e.g.
  camunda-compat) run against the artifact; every finding is a concrete
  binding task, so the count and class of findings ≈ integration effort.
- **Binding inventory** — the list of elements needing implementations
  either way: each service/send/rule task with its documentation, mock, and
  payload contract at that hop. For *build* it's the backlog; for *buy*
  it's the worker/connector list.
- **What the engine gives you vs. what you write regardless** — the model,
  routing, retries/timers/persistence come with *buy*; the task
  implementations (the binding inventory) are written under **both** paths.
  The pack makes that symmetry visible — often the decisive fact.
- **The walkthrough itself** — so the people making the call watch the
  behaviour they're deciding about, with the tests green on screen.

## WebMCP tool surface (~18 tools)

Design rules: tools are **semantic, not spatial** (layout is the site's
job); every write returns `{ ok, modelSummary, issues[] }` (issues =
validation + portability lint) so the agent stays grounded; destructive ops
are undoable; results are compact JSON.

**Read**
- `get_model` — lanes, elements (id, type, name, has doc/mock/script),
  flows (with conditions/default), scenarios, tests, issues.
- `get_element {id}` — full detail incl. documentation, script/mock, flows.
- `get_issues` — validation + portability lint results.

**Build**
- `add_element {type, name, laneId?, afterElementId?}` (auto-place,
  auto-connect) · `connect {sourceId, targetId, kind?, label?}` ·
  `update_element {id, …}` · `delete_element {id}` ·
  `add_lane {name}` / `move_to_lane {id, laneId}` · `auto_layout {}`

**Logic & docs (split along the standard's seams)**
- `set_condition {flowId, expression, language?}` — conditionExpression on a
  sequence flow · `set_default_flow {gatewayId, flowId}`
- `set_script {scriptTaskId, code, scriptFormat?}` — standard script tasks
- `set_mock {taskId, code}` — browser behaviour for service/user/etc. tasks
- `set_documentation {id, text}`

**Execute & verify**
- `define_scenario {name, payload, description?}` ·
  `run_scenario {name, toStep?}` → full trace ·
  `step_scenario {name}` / `reset` (drives the visible token) ·
  `add_test {name, payload, script}` · `run_tests`

**Document**
- `load_document {xml}` / `export_document`

## Architecture (all in-browser, static hosting — built, in `studio/`)

```
┌──────────────────── the studio (static Svelte site) ─────────────────┐
│  WebMCP adapter ── registers the 31 tools on navigator.modelContext  │
│      │              (and window.bsf); one module isolates the API│
│      ▼                                                               │
│  Studio store ──── every tool = a store mutation; UI panels call the │
│      │             same mutations; one shared undo stack; after every│
│      │             mutation: re-derive graph, validate, autosave     │
│      ▼                                                               │
│  Document core ── bpmn-moddle + bsf extension schema; semantic + │
│      │            DI maintained together on every edit               │
│      ├── Canvas: this repo's own Svelte Flow BPMN renderer (drag,    │
│      │     select, run highlighting — the same nodes Storybook shows)│
│      ├── Execution engine (@bsf/engine, packages/engine — standard  │
│      │     semantics: conditions, default flows, script tasks, MI,   │
│      │     error boundaries, message samples; bsf:mock for the   │
│      │     rest; step-bounded; JavaScript everywhere)                │
│      └── IDE shell: shadcn-svelte components, CodeMirror editors     │
│            (scripts, mocks, conditions, tests, live XML), Run /      │
│            Tests / Issues panels                                     │
│  Persistence: import/export + localStorage workspace with autosave.  │
│  No backend.                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

## Status

Shipped, verified end-to-end in this repo (`bun run test`, plus a headless
browser suite driving the built studio through its WebMCP tools):

- **Document core + engine** — the engine is its own workspace package
  (`@bsf/engine`) with a **conformance suite**: seven fixture workflows
  (conditional routing, pipelines, parallel fork/join, error boundaries,
  message catches, multi-instance, and the full messaging flow) run in both
  `@bsf/engine` and bpmn-engine through the package's generic binding-pass
  adapter, from the same files and payloads, and must agree on end events,
  executed tasks, iteration counts, and payload values. bpmnlint stays
  clean and the Camunda-compat profile lists exactly the per-element
  binding points.
- **Canvas + build tools** — our own Svelte Flow diagrammer with add /
  connect / move / lanes / auto-layout, DI kept correct on every edit.
- **Logic, tests, verify loop** — condition/script/mock/binding/doc tools,
  scenario runner with visible token coverage, tests panel; an agent can
  build a flow from a blank canvas by tools alone, run it, and see it green.
- **Workspace** — named documents in the browser, autosave, import/export,
  shared human/agent undo.

Next: drive the studio from the real WebMCP chat client; grow the binding
pass (`spike/run-engine-adapted.mjs` is the seed) into per-engine export;
emit the decision pack from the binding inventory.

## Success criteria

A dev with the chat open and a blank canvas says what the platform does; ten
minutes later there is a diagram that executes in the browser, a payload
they watched transform at every hop, green tests capturing the rules — and
the file passes portability lint, opens untouched in any BPMN modeler, and
imports into the team's workflow engine as the skeleton of the real build.

And when the modelling is done, the company puts the same artifact on the
table and decides **build or buy** from evidence: the compat report, the
binding inventory, and a process everyone in the room has watched run.
