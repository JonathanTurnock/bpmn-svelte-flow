# Product Brief — PoC Studio (working title)

*Status: design draft for discussion — nothing here is implemented.*
*Builds on: the bpmn.io ecosystem, the `bsf:` extension format and execution
semantics proven in this repo, the buildless `poc/` walkthrough site, and a
WebMCP-compliant chat client in Chrome (already built, external to this
product).*

## One-liner

A static site where a developer and their in-browser AI agent **build,
execute, and verify a visual API PoC together**: the agent drives the BPMN
canvas through WebMCP tools, the human talks (or edits the diagram directly),
and the result is a single self-contained file — a process diagram that
actually runs, transforms payloads, and passes its own embedded tests.

## Why

- Illustrating an API platform's business logic today means static diagrams
  that drift, or heavyweight engines (Camunda) whose semantics and
  infrastructure leak into a requirements artifact.
- The `poc/` site in this repo proved the *viewing* half: devs understand a
  flow fastest by stepping a payload through it and reading the logic behind
  each node. But authoring that artifact was manual.
- A WebMCP chat turns authoring into a conversation: "add a policy check
  after sanitisation, deny muted senders, prove it with a test" — the agent
  builds it, runs it, and shows the token moving. The human never leaves the
  canvas; the agent never guesses at state, because the tools *are* the state.

## What it is / is not

| It is | It is not |
|---|---|
| A **requirements & PoC instrument** — the spec devs build the real thing from | A production workflow engine (no timers, persistence, retries) |
| Standards-based notation + spec token semantics (BPMN 2.0) | Camunda-compatible or vendor-flavoured |
| A **static site** (Pages-deployable, no backend, state in-browser + file) | A SaaS with accounts, storage, or server-side execution |
| Agent-**and**-human operated (every tool has a UI equivalent) | Agent-only (must be fully usable with the chat closed) |

## The file (single source of truth)

One self-contained document: **BPMN 2.0 XML + a `poc:` extension namespace**
(the evolution of this repo's `bsf:`). Everything the site and the agent need
lives in it; import/export is the only persistence contract.

```xml
<bpmn:definitions xmlns:poc="http://…/poc/1.0" …>
  <bpmn:process id="P">
    <bpmn:extensionElements>
      <poc:scenario name="Happy path" payload='{"amount":5200}'
                    description="Message accepted and delivered"/>
      <poc:test name="large claims go to review" payload='{"amount":5200}'>
        assert(state.visited.has('Task_Review'));
        assert.equal(payload.approvedBy, 'supervisor');
      </poc:test>
    </bpmn:extensionElements>
    <bpmn:serviceTask id="Task_Sanitise" name="Sanitise payload">
      <bpmn:extensionElements>
        <poc:script>payload.text = redact(payload.text);</poc:script>
        <poc:doc>Regex PAN/CVV/IBAN redaction. Every hit → security.redactions.</poc:doc>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    …
```

- `poc:script` — the node's executable JS block (payload transform; gateway
  routing return value; `throw` → error boundary). Same contract proven here.
- `poc:doc` — the human-readable business logic shown verbatim in the panel
  (regexes, Cedar policy source, producer config…). Docs ≠ code on purpose:
  the doc is what devs read; the script is what the simulator runs.
- `poc:test` — executable acceptance criteria (state/payloads/assert contract
  already proven in this repo).
- `poc:scenario` — a named initial payload + description; a scenario run is
  the walkthrough (token + payload diff per step).

Because it's standard BPMN XML with extensions, the file round-trips through
any bpmn.io modeler, and moddle parses the extensions for free.

## Core loops

1. **Converse → build.** User chats; agent calls model-write tools; the
   canvas updates live with each mutation (and the human sees exactly what
   the agent did — mutations are also undo-stack entries).
2. **Direct manipulation.** The same canvas is a full bpmn-js Modeler; humans
   drag/connect/edit properties. Agent stays current by reading tools — it
   never caches the model.
3. **Execute → inspect.** Run a scenario: token animates step-by-step, side
   panel shows `poc:doc` for the active node and the payload with per-step
   diffs (the `poc/` walkthrough UX, now driven by the real engine instead of
   a hand-written script).
4. **Verify (the differentiator).** The agent runs `run_tests` / `run_scenario`
   itself, reads the trace, and iterates until green — it doesn't just draw a
   picture, it ships a passing PoC. The human watches the same runs visually.
5. **Hand off.** Export the file; one-click "export walkthrough" emits a
   read-only static bundle (today's `poc/` shell) for Pages.

## WebMCP tool surface (draft v1 — ~16 tools)

Design rules: tools are **semantic, not spatial** (the agent says
"after Task_Sanitise", never x/y — layout is the site's job); every write
returns `{ ok, modelSummary, issues[] }` so the agent stays grounded and
self-corrects; destructive ops are undoable; tool results are compact JSON,
never SVG/screenshots.

**Read**
- `get_model` → compact process summary: lanes, elements (id, type, name,
  has script/doc), flows, scenarios, tests, validation issues.
- `get_element {id}` → full detail incl. script, doc, incoming/outgoing.
- `get_issues` → lint results (disconnected nodes, gateway without routing
  script or default, boundary without host, test referencing unknown id…).

**Build**
- `add_element {type, name, laneId?, afterElementId?}` → id (auto-placed,
  auto-connected when `afterElementId` given).
- `connect {sourceId, targetId, kind?, label?, isDefault?}`
- `update_element {id, name?, type?}` / `delete_element {id}`
- `add_lane {name, position?}` / `move_to_lane {id, laneId}`
- `auto_layout {}` → re-layouts the whole diagram (also runs after bursts of
  agent edits).

**Logic & docs**
- `set_script {id, code}` / `set_doc {id, markdown}`

**Execute & verify**
- `define_scenario {name, payload, description?}`
- `run_scenario {name, toStep?}` → full trace: ordered steps with element id,
  payload snapshot, diff, logs, thrown errors, end state.
- `step_scenario {name}` / `reset` → drives the *visible* token so the human
  watches while the agent narrates.
- `add_test {name, payload, script}` / `run_tests` → per-test pass/fail +
  failure messages.

**Document**
- `load_document {xml}` / `export_document` → the file, whole.

## Architecture (all in-browser, static hosting)

```
┌────────────────────────── the site (Pages) ──────────────────────────┐
│  WebMCP adapter ── registers tools; isolates the (still-shifting)    │
│      │              navigator.modelContext API behind one module     │
│      ▼                                                               │
│  Command layer ── every tool = a command; UI buttons call the same   │
│      │            commands (agent-optional by construction);         │
│      │            undo/redo; validation after each mutation          │
│      ▼                                                               │
│  Document core ── bpmn-moddle + poc extension schema; the one model  │
│      │                                                               │
│      ├── bpmn-js Modeler (canvas: edit, overlays, token, markers)    │
│      ├── Execution engine (port of this repo's BpmnSimulation,       │
│      │     reading the moddle element registry; step-bounded)        │
│      └── Inspector panel (poc:doc, payload + per-step diff, tests,   │
│            scenario picker — evolved from poc/ shell)                │
│  Persistence: file import/export + localStorage autosave. No backend.│
└──────────────────────────────────────────────────────────────────────┘
```

Carried over from this repo: the engine semantics (token flow, gateway
routing via script return, throw→boundary, MI, bounded steps), the
test-runner contract, the walkthrough panel UX, the vendored-static
deployment model. Replaced: the Svelte Flow renderer (bpmn-js Modeler takes
over rendering *and* editing).

## Milestones (each independently demoable)

- **M0 — WebMCP spike (de-risk first).** Register 3 tools on today's static
  `poc/` site: `get_model`, `step_scenario`, `run_scenario`. Chat drives the
  existing walkthrough. Proves the chat↔page loop end-to-end with zero new
  product surface.
- **M1 — Document core.** `poc:` schema, load/export, engine reading moddle
  directly, scenario runs replacing the hand-scripted walkthrough.
- **M2 — Modeler + build tools.** bpmn-js Modeler canvas, command layer,
  add/connect/update/lanes, auto-layout, validation.
- **M3 — Logic, tests, verify loop.** set_script/doc, tests panel, agent
  builds-runs-fixes demo: "build the messaging platform PoC from a blank
  canvas by conversation" — the acceptance demo for the whole product.
- **M4 — Hand-off.** Read-only walkthrough export for Pages; polish.

## Risks & mitigations

- **WebMCP is early** (API shape, tool-count limits, permission prompts vary
  by client). → All WebMCP contact in one adapter; M0 spike against the real
  chat client before anything else; command layer works without it.
- **Auto-layout quality** — programmatic BPMN layout is the weakest part of
  the ecosystem. → Constrain v1: left-to-right flow per lane,
  `afterElementId` insertion, full `auto_layout` re-flow; accept "tidy, not
  beautiful"; humans can drag.
- **Arbitrary JS in the file** — same posture as today: it's the author's own
  browser and their agent; engine is step-bounded; no secrets exist in a
  static site. Revisit only if files become shared beyond the team.
- **Agent state drift** — mitigated structurally (reads are cheap, writes
  return summaries + issues, spatial decisions are never the agent's).

## Open questions (for us to settle before M1)

1. **Chat client contract** — what does your WebMCP chat support today:
   max tools? tool result size? does it prompt the user per call or per
   session? Does it support the page *pushing* state (e.g. "test failed")
   or only request/response? M0 answers most of this empirically.
2. **Scenario vs. test** — keep both (scenario = interactive walkthrough,
   test = assertion), or unify (a test is a scenario with assertions)?
   Current lean: unify in the schema (`poc:scenario` with optional
   assertions), keep both verbs in the UI.
3. **Narrated steps** — should `run_scenario` return agent-authored
   narration slots (so the chat can talk the human through the run), or is
   `poc:doc` per node enough?
4. **Multi-process files** — one process per file (simple, current lean) or
   collaborations with pools for cross-system PoCs (the messaging flow used
   lanes, not pools — probably sufficient)?
5. **DMN later?** — business-rule tasks could open a dmn-js decision table
   evaluated in-sim (feelin). Compelling, but post-M4.
6. **Naming** — "PoC Studio" is a placeholder.

## Success criteria

A dev with the chat open and a blank canvas says what the platform does; ten
minutes later there is a diagram that executes, a payload they watched
transform at every hop, green tests capturing the rules — and a file they
commit next to the code that will implement it for real.
