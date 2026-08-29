# Product Brief — PoC Studio (working title)

*Status: design draft v2 for discussion — nothing here is implemented.*
*v2 change: strict standards conformance — the document must import into any
standards-compliant workflow engine; custom extensions are confined to the
spec's own extension mechanism and carry no portable semantics.*
*Builds on: the bpmn.io ecosystem, the execution semantics and test-runner
contract proven in this repo, the buildless `poc/` walkthrough site, and a
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

- Illustrating an API platform's business logic today means static diagrams
  that drift, or heavyweight engines whose infrastructure is overkill for a
  requirements artifact.
- The `poc/` site in this repo proved the *viewing* half: devs understand a
  flow fastest by stepping a payload through it and reading the logic behind
  each node. But authoring that artifact was manual.
- A WebMCP chat turns authoring into a conversation — and standards
  conformance turns the artifact into a head start: the PoC file is a
  **deployable skeleton**. When devs build the real thing on an engine, they
  import the very same file and bind implementations to elements that are
  already modeled, routed, and documented.

## What it is / is not

| It is | It is not |
|---|---|
| A **requirements & PoC instrument** whose output is valid, executable BPMN 2.0 | A production workflow engine (no timers-at-scale, persistence, retries) |
| **Strictly standard**: spec constructs for everything the spec covers | A vendor dialect; no engine-specific namespaces in authored files |
| A **static site** (Pages-deployable, no backend, state in-browser + file) | A SaaS with accounts, storage, or server-side execution |
| Agent-**and**-human operated (every tool has a UI equivalent) | Agent-only (must be fully usable with the chat closed) |

## Standards conformance (the governing design rule)

**Rule: if BPMN 2.0 defines a construct for it, we use that construct.
Custom data rides only in `bpmn:extensionElements` — the spec's own
extension mechanism, which conformant tools must ignore and preserve — and
never carries semantics the diagram depends on.**

What that means concretely:

| Concern | v1 draft (custom) | v2 (standard) |
|---|---|---|
| Gateway routing | script on the gateway returning a flow id | **`bpmn:conditionExpression`** (`tFormalExpression`, declared `language`) on outgoing flows + **`default`** attribute on the gateway |
| Script logic | `poc:script` on any node | **`bpmn:scriptTask`** with **`scriptFormat`** + **`bpmn:script`** where the logic *is* script; other task types keep their standard meaning |
| Service/user task behaviour in the sim | `poc:script` | the task stays a plain standard `serviceTask`/`userTask` (binding is engine-territory by design); the browser-only mock lives in **`poc:mock`** inside `extensionElements`, ignored by real engines |
| Human-readable business logic | `poc:doc` | **`bpmn:documentation`** — standard on every element, preserved and displayed by engines and modelers |
| Data hand-offs worth modeling | ad-hoc | standard **data objects / data associations / `ioSpecification`** where they add clarity |
| Scenarios & tests | `poc:scenario` / `poc:test` | unchanged — **no standard exists**, so they stay as extensions (spec-sanctioned slot, zero portable semantics: an engine that ignores them loses nothing but our sim/test tooling) |
| Process flag | — | `isExecutable="true"`; definitions declare `expressionLanguage` and default `scriptFormat` explicitly |

Conformance is enforced, not aspirational:

- **Schema validity** — every exported file validates against the BPMN 2.0 XSD
  (moddle strict parse in the app; XSD validation in repo CI).
- **Portability lint** — bpmnlint with a portability ruleset runs on every
  mutation; the agent sees violations in every tool response. (bpmnlint also
  has engine-compat plugins, e.g. Camunda's, available as opt-in profiles.)
- **Round-trip tests** — CI proves: export → re-import (bpmn-moddle strict) →
  semantic model identical; extensions preserved; file opens in stock
  bpmn.io modeler untouched.
- **Acceptance bar** — the flagship example file imports warning-free into
  Camunda Modeler and Flowable's modeler. (Import ≠ run: see the expression
  caveat below.)

**The honest caveat — expression & script language.** XML-level portability
is fully achievable. *Semantic* portability of expressions is where "any
engine" is genuinely fuzzy: the spec lets you declare the condition/script
language but doesn't make engines support any particular one (C7/Flowable
favour JUEL + JSR-223 scripting; Camunda 8 mandates FEEL; the spec's own
default is XPath 1.0). Our in-browser engine must therefore evaluate a
declared language, and we choose ONE primary:

- **Option A — JavaScript** (`scriptFormat`/`language` = `text/javascript`):
  richest for mocks, runs natively in the browser, honestly declared in the
  file; engines with JS scripting run it as-is, others rewrite expressions
  at binding time.
- **Option B — FEEL** (`https://www.omg.org/spec/DMN/FEEL/`): the only
  OMG-standard expression language, evaluable in-browser via `feelin`,
  native to Camunda 8, and the natural bridge to DMN later — but weaker for
  imperative mocks.
- **Current lean: FEEL for `conditionExpression`, JavaScript for
  `bpmn:script` bodies and `poc:mock`** — conditions (the part engines
  actually re-execute) get the standards-blessed language; mocks (browser-
  only by definition) get the practical one. Open question #2.

## The file (single source of truth)

One self-contained, schema-valid BPMN 2.0 document. Sketch:

```xml
<bpmn:definitions xmlns:poc="http://…/poc/1.0"
    expressionLanguage="https://www.omg.org/spec/DMN/FEEL/" …>
  <bpmn:process id="P" isExecutable="true">
    <bpmn:extensionElements>
      <poc:scenario name="Happy path" payload='{"amount":5200}'/>
      <poc:test name="large claims go to review" payload='{"amount":5200}'>
        assert(state.visited.has('Task_Review'));
      </poc:test>
    </bpmn:extensionElements>

    <bpmn:serviceTask id="Task_Save" name="Save message (Messages API)">
      <bpmn:documentation>POST /v1/messages → 201 { messageId }.
        Owns durability; emits to Kinesis after commit.</bpmn:documentation>
      <bpmn:extensionElements>
        <poc:mock>payload.messagesApi = { status: 201, messageId: id() };</poc:mock>
      </bpmn:extensionElements>
    </bpmn:serviceTask>

    <bpmn:exclusiveGateway id="GW_Allowed" name="Allowed?" default="Flow_Deny"/>
    <bpmn:sequenceFlow id="Flow_Allow" sourceRef="GW_Allowed" targetRef="Task_Save">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
        policy.decision = "ALLOW"
      </bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    …
```

Strip every `poc:` extension and `bpmn:documentation` stays, routing stays,
script tasks stay: **the process is still complete and executable** — that
is the conformance test in one sentence.

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
5. **Hand off — two exits.** (a) Read-only walkthrough bundle for Pages;
   (b) **the file itself into a real engine**, implementations bound where
   the mocks were.

## WebMCP tool surface (draft v2 — ~18 tools)

Design rules: tools are **semantic, not spatial** (layout is the site's
job); every write returns `{ ok, modelSummary, issues[] }` (issues =
validation + portability lint) so the agent stays grounded; destructive ops
are undoable; results are compact JSON, never pixels.

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

**Logic & docs (v2: split along the standard's seams)**
- `set_condition {flowId, expression, language?}` — conditionExpression on a
  sequence flow · `set_default_flow {gatewayId, flowId}`
- `set_script {scriptTaskId, code, scriptFormat?}` — standard script tasks only
- `set_mock {taskId, code}` — sim-only behaviour for service/user/etc. tasks
- `set_documentation {id, text}`

**Execute & verify**
- `define_scenario {name, payload, description?}` ·
  `run_scenario {name, toStep?}` → full trace ·
  `step_scenario {name}` / `reset` (drives the visible token) ·
  `add_test {name, payload, script}` · `run_tests`

**Document**
- `load_document {xml}` / `export_document`

## Architecture (all in-browser, static hosting)

```
┌────────────────────────── the site (Pages) ──────────────────────────┐
│  WebMCP adapter ── registers tools; isolates the (still-shifting)    │
│      │              navigator.modelContext API behind one module     │
│      ▼                                                               │
│  Command layer ── every tool = a command; UI buttons call the same   │
│      │            commands; undo/redo; after every mutation:         │
│      │            schema validation + portability lint               │
│      ▼                                                               │
│  Document core ── bpmn-moddle (strict) + poc extension schema        │
│      │                                                               │
│      ├── bpmn-js Modeler (canvas: edit, overlays, token, markers)    │
│      ├── Execution engine (port of this repo's BpmnSimulation over   │
│      │     the moddle registry; standard semantics: conditions,      │
│      │     default flows, script tasks; poc:mock for the rest;       │
│      │     step-bounded) + expression evaluator (feelin and/or JS)   │
│      └── Inspector panel (bpmn:documentation, payload diffs, tests,  │
│            scenarios — evolved from the poc/ shell)                  │
│  Persistence: file import/export + localStorage autosave. No backend.│
└──────────────────────────────────────────────────────────────────────┘
```

## Milestones (each independently demoable)

- **M0 — WebMCP spike (de-risk first).** Register 3 tools on today's static
  `poc/` site (`get_model`, `step_scenario`, `run_scenario`); drive it from
  the real chat client. Answers the client-contract questions empirically.
- **M1 — Standard document core.** poc extension schema, load/export,
  XSD/lint pipeline, engine executing conditions + default flows + script
  tasks + mocks from the moddle model; scenario runs replace the
  hand-scripted walkthrough. *Exit test: the messaging-platform flow rebuilt
  as a conformant file, importing warning-free into Camunda Modeler.*
- **M2 — Modeler + build tools.** bpmn-js Modeler canvas, command layer,
  build/connect/lane tools, auto-layout, live lint.
- **M3 — Logic, tests, verify loop.** Condition/script/mock/doc tools, tests
  panel, the acceptance demo: agent builds the messaging PoC from a blank
  canvas by conversation, runs it, fixes it until tests + lint are green.
- **M4 — Hand-off.** Walkthrough export for Pages; engine-compat lint
  profiles (opt-in); polish.

## Risks & mitigations

- **WebMCP is early** (API shape, tool limits, permission UX vary). → One
  adapter module; M0 spike first; command layer is agent-optional.
- **Expression-language portability** — the one place "any engine" is soft.
  → Declare languages explicitly in the file; FEEL-first for conditions
  (OMG-standard, feelin in-browser, Camunda-8-native); document the
  rewrite-at-binding path for JUEL engines; never invent our own syntax.
- **Auto-layout quality.** → Constrain v1 to left-to-right lane flow +
  `afterElementId` insertion + full re-flow; humans can drag.
- **Standard semantics fidelity** — claiming "standards-compliant execution"
  raises the bar on our engine (inclusive-join reachability, sub-process
  traversal). → Scope v1 semantics honestly in docs; test against the
  spec's behaviours; the file remains conformant even where the sim
  approximates.
- **Arbitrary JS in mocks/tests** — author's own browser + agent; engine is
  step-bounded; static site holds no secrets. Revisit if sharing widens.

## Open questions (for us to settle before M1)

1. **Chat client contract** — max tools? result sizes? permission per call
   or per session? can the page push events ("test failed") or only
   respond? M0 answers most of this.
2. **Expression/script languages** — ratify the lean (FEEL conditions + JS
   scripts/mocks)? Or single-language-everywhere (all-FEEL is purest but
   weak mocks; all-JS is pragmatic but Camunda-8 conditions would need
   translation)?
3. **Engine-compat profiles** — is warning-free import into stock modelers
   enough, or do we target a named engine's *runnable* profile (e.g.
   Camunda 8 with FEEL) as a supported export mode?
4. **Scenario vs. test** — unify in the schema (scenario with optional
   assertions), keep both verbs in the UI? (Current lean: yes.)
5. **Multi-process / collaborations** — one process per file with lanes
   (current lean, matches the messaging PoC) or pools + message flows for
   cross-system PoCs?
6. **DMN** — business-rule tasks opening dmn-js decision tables (FEEL,
   evaluated by feelin in-sim) is the natural post-M4 act, and doubly so if
   FEEL wins question 2. Confirm as roadmap, not v1.
7. **Naming** — "PoC Studio" is a placeholder.

## Success criteria

A dev with the chat open and a blank canvas says what the platform does; ten
minutes later there is a diagram that executes in the browser, a payload
they watched transform at every hop, green tests capturing the rules — and
the file passes portability lint, opens untouched in any BPMN modeler, and
imports into the team's workflow engine as the skeleton of the real build.
