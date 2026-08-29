# Spike: run the Dryrun artifact in a real workflow engine

**Question:** build what the visual PoC designer would build (per
`PRODUCT_BRIEF.md` v2 — strict BPMN 2.0, FEEL conditions, standard script
tasks, `bpmn:documentation`, `dryrun:` extensions only for mocks/scenarios/tests),
then try to run it in a standards-compliant workflow engine. What breaks?

**Setup:**
- Artifact: `messaging-flow.bpmn` — the messaging-platform flow (message start
  → regex sanitisation script task → Cedar policy business-rule task →
  allow/deny gateway with FEEL condition + default flow → save service task →
  Kinesis message catch → join script task → participants service task →
  sequential multi-instance delivery sub-process with FEEL-routed
  Kafka/webhook branches → error end / done end), with lanes, DI,
  documentation, and `dryrun:scenario`/`dryrun:test`/`dryrun:mock` extensions.
- Engine: **bpmn-engine 25** (third-party Node.js BPMN 2.0 engine,
  independent codebase). Runners: `run-engine.mjs` (raw), 
  `run-engine-adapted.mjs` (with a generic adapter).
- Import lints: **bpmnlint 11** (`bpmnlint:recommended`) and Camunda's
  official **bpmnlint-plugin-camunda-compat** (`camunda-cloud-8-6` profile).

## Headline results

1. **The untouched artifact runs end-to-end in bpmn-engine** — happy path
   (18 activities incl. both message waits, FEEL-routed allow branch, MI ×2
   routing participant 1 → Kafka and participant 2 → webhook) and denied path
   (DENY → default flow → `403 rejected` error end, nothing downstream) —
   **but only through a ~150-line generic adapter**. Raw, it fails at the
   first script task.
2. **General BPMN lint: clean** (one missing label, fixed). The model itself
   is portable.
3. **Camunda 8 compat lint: 9 errors — every single one the same class**:
   Camunda 8 requires its `zeebe:` extension elements for every executable
   binding (`zeebe:TaskDefinition`/`zeebe:Script` on tasks,
   `zeebe:LoopCharacteristics` on multi-instance, `zeebe:Subscription` on
   messages). Pure-standard executable BPMN does not deploy there either.

**The strategic conclusion the brief predicted, now proven empirically: the
standard XML model is portable; executable *binding* is vendor territory in
every engine.** The product's job is therefore exactly two layers: a
canonical standard file, plus per-engine binding (an adapter at runtime, or
an export pass that injects the engine's extensions). Our `dryrun:mock` blocks
even served as the binding implementation: the adapter executes them as the
engine's service implementations — "bind where the mocks were", automated.

## What broke, in order (raw engine, no adapter)

| # | Break | Cause | Class |
|---|---|---|---|
| 1 | `Script format text/javascript is unsupported` at Task_Sanitise | bpmn-engine matches `scriptFormat` against `javascript\|js`, not MIME types. The spec recommends MIME/URI but engines use short names (Camunda 7: `javascript`, `groovy`). | dialect |
| 2 | FEEL conditions not evaluated | Engine only script-evaluates conditions with a `language` attr matching `javascript\|js`; the definitions-level `expressionLanguage` declaration (how the spec says to set a default) is **ignored**. A FEEL body would fall through to the engine's own `${…}` expression dialect. | dialect + spec gap |
| 3 | `invalid loop cardinality >[object Object]<` | `loopCardinality` needs expression-language evaluation too (`count(participants)` is FEEL); also surfaced that the engine feeds raw values to the expression resolver. | dialect |
| 4 | Service/send/business-rule tasks have no behaviour | The spec deliberately leaves task *implementation* unbound. bpmn-engine binds via `behaviour.Service` / expression attributes; Camunda 8 via `zeebe:TaskDefinition`; Camunda 7 via delegate expressions. | by design |

## What the adapter had to do (all engine-side; the file was never edited)

- **Scripts provider**: accept `text/javascript` (map MIME → JS), and
  evaluate flow conditions written in the declared FEEL via `feelin`.
- **Expression resolver**: FEEL-evaluate non-`${…}` expressions
  (loopCardinality). Two surprises: (a) current `feelin` returns
  `{ value, warnings }`, not a raw value; (b) the engine routes **every**
  attribute string through the resolver — including message *names* like
  `api-request`, which FEEL parses as a subtraction — so the adapter must
  fall back to the raw string on unresolved-variable results.
- **Task binding**: attach a Service to service/send/business-rule tasks that
  executes the file's own `dryrun:mock` block against a `payload` proxy over
  engine variables.
- **MI per-instance data**: expose `participant` to conditions/mocks by
  tracking the sequential iteration (start-event-per-iteration counter).

## Softer findings worth carrying into the product

- **Message events "just work" as models** but need the outside world:
  both the API-request start and the Kinesis catch waited until the harness
  delivered the message — the exact correlation work a real deployment does.
  Good news: the model expresses it truthfully.
- **Per-instance MI data is the weakest corner of the standard in practice.**
  The spec's `loopDataInputRef`/`inputDataItem` is so poorly supported that
  every engine invented a dialect (Camunda's `collection`/`elementVariable`,
  zeebe:LoopCharacteristics). Our FEEL `count(participants)` cardinality +
  adapter-provided `participant` worked, but this is the area to design
  deliberately in the studio.
- **Scope isolation is real**: MI-iteration variable writes stayed in the
  iteration's cloned environment (deliveries[] did not aggregate to process
  scope) — real engines require explicit output mappings for exactly this
  reason. The studio's simulator should either model output aggregation or
  teach it.
- **Engines leak their own metadata**: signalling a message with `{}` merged
  broker fields into process variables. Adapters should pass clean payloads.
- **Our own in-repo simulator** currently routes gateways by node scripts and
  does not evaluate `conditionExpression`/FEEL — brief M1 must add the FEEL
  evaluator + condition semantics (and `dryrun:mock` support) so the studio
  executes the same file the engines see. (Our parser already ignores the
  unknown `dryrun:` elements gracefully and picks up `dryrun:test`.)

## Verdict for the product brief

- ✅ "Standard constructs for everything the spec covers" survived contact:
  conditions + default flows, script tasks, documentation, messages, errors,
  MI — all imported and (with language adaptation) executed.
- ✅ `dryrun:` extensions were ignored by the engine exactly as the spec
  promises, and doubled as binding implementations.
- ✅ The FEEL-first lean is validated *as the canonical language*, with the
  caveat now measured: no engine evaluates it from the standard attributes
  alone — every target needs a small language adapter or an export pass.
- 🔁 Brief updates to make: add "binding pass / engine adapter" as a
  first-class concept (M4 hand-off), and add condition-expression + mock
  execution to the studio simulator scope (M1).

## Reproduce

```sh
npm i
node spike/run-engine.mjs spike/messaging-flow.bpmn happy           # raw: fails (finding #1)
node spike/run-engine-adapted.mjs spike/messaging-flow.bpmn happy   # completes, full trace
node spike/run-engine-adapted.mjs spike/messaging-flow.bpmn denied  # completes at 403 rejected
npx bpmnlint --config spike/.bpmnlintrc spike/messaging-flow.bpmn      # clean
npx bpmnlint --config spike/.bpmnlintrc-c8 spike/messaging-flow.bpmn   # 9 zeebe-binding errors
```
