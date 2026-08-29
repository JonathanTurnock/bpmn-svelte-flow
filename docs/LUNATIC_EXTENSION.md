# The `lunatic:` execution extension (design spec, v0.1)

*Companion to `PRODUCT_BRIEF.md`.*

## Position

BPMN 2.0 pins down structure, control-flow semantics, routing
(`conditionExpression` + default flows), script-task bodies, and
documentation — those all live in **standard constructs and never in this
extension**. What the spec leaves open to each tool is **task implementation
binding** (engines declare it in their own dialects: `zeebe:*`, `camunda:*`,
`flowable:*`), plus **scenarios** and **tests**.

`lunatic:` is our dialect for exactly that space — the browser runtime's
equivalent of `zeebe:TaskDefinition` — declared under
`bpmn:extensionElements` so every conformant tool ignores and preserves it.

**Design rules**
1. Never duplicate a standard construct. If the spec has a home for it, the
   standard element is the only home.
2. Stripping every `lunatic:` element leaves a complete, valid, importable
   process. The extension adds executability *here* and evidence *for the
   decision pack* — never diagram meaning.
3. Everything is inspectable text: JS bodies, JSON payloads, name/value
   properties. No opaque blobs.

Namespace: `xmlns:lunatic="https://lunatic.dev/schema/1.0"`.

## Vocabulary

### `lunatic:mock` — browser stand-in for an unbound task
On service / send / receive / user / business-rule tasks and call
activities. JS body run by the studio simulator when the token arrives;
mutates `payload` (and sees `participant` inside a multi-instance scope).
Mocks double as reference implementations: an engine adapter can execute
them directly as the task binding, and the binding pass can hand them to a
target engine as worker stubs.

```xml
<bpmn:serviceTask id="Task_Save" name="Save message (Messages API)">
  <bpmn:extensionElements>
    <lunatic:mock>payload.messagesApi = { status: 201, messageId: id() };</lunatic:mock>
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

### `lunatic:binding` — declared real-world implementation intent
Optional, same elements as `lunatic:mock`. *Descriptive, not executable*: a
thin declaration — a `type` plus open name/value properties, the same shape
as `zeebe:TaskDefinition`. Three consumers: the **binding inventory**
(build-or-buy pack) prints it; the **binding pass** maps it to a target
engine's dialect; the simulator runs the mock alongside it.

```xml
<bpmn:extensionElements>
  <lunatic:binding type="http">
    <lunatic:property name="method" value="POST"/>
    <lunatic:property name="url" value="https://internal.messages-api/v1/messages"/>
  </lunatic:binding>
  <lunatic:mock>payload.messagesApi = { status: 201, messageId: id() };</lunatic:mock>
</bpmn:extensionElements>
```

Suggested starter `type` values: `http`, `kafka-producer`, `queue`,
`decision`, `stream-consumer`, `manual`, `custom`. The type list is open —
a type the inventory has no template for renders as "custom".

### `lunatic:test` — embedded acceptance test
On the process (or definitions). Runs a fresh headless simulation with the
`payload` attribute (JSON), then executes the JS body with
`state` / `payloads` / `payload` / `assert`. Proven in this repo.

### `lunatic:scenario` — named walkthrough input
On the process. `name`, `payload` (JSON), optional `description`. Drives the
interactive token walkthrough; a test is conceptually a scenario with
assertions.

### `lunatic:collection` — multi-instance data binding
On `bpmn:multiInstanceLoopCharacteristics`: names the collection to iterate
and the per-instance variable — the same shape as
`zeebe:LoopCharacteristics` and `camunda:collection`/`elementVariable`, so
the binding pass maps it directly:

```xml
<bpmn:multiInstanceLoopCharacteristics isSequential="true">
  <bpmn:loopCardinality xsi:type="bpmn:tFormalExpression">payload.participants.length</bpmn:loopCardinality>
  <lunatic:collection expression="participants" elementVariable="participant"/>
</bpmn:multiInstanceLoopCharacteristics>
```

The standard `loopCardinality` stays (rule 1: a consumer that only needs a
count gets it from the standard attribute); `lunatic:collection` adds the
per-instance binding the simulator and binding pass use.

### `lunatic:sample` — message/signal payload for simulation
Optional, on `bpmn:message` (or signal). What the simulator injects when the
catch event fires, and the correlation hint the binding pass uses:

```xml
<bpmn:message id="Msg_KinesisRecord" name="kinesis-record">
  <bpmn:extensionElements>
    <lunatic:sample correlationKey="chatId">{"partitionKey":"chat_8231","data":{"messageId":"msg_5f2e9c"}}</lunatic:sample>
  </bpmn:extensionElements>
</bpmn:message>
```

## Who reads what

| Consumer | Standard constructs | `lunatic:mock` | `lunatic:binding` | `lunatic:test` / `lunatic:scenario` | `lunatic:collection` / `lunatic:sample` |
|---|---|---|---|---|---|
| Studio simulator | executes | executes | — | executes / drives | uses |
| Real engine (unmodified file) | executes what it supports | ignores | ignores | ignores | ignores |
| Binding pass (per-engine export) | passes through | optional worker-stub source | **maps to engine dialect** | — | maps (e.g. `zeebe:LoopCharacteristics`, `zeebe:Subscription`) |
| Build-or-buy inventory | documentation + contracts | reference behaviour | **the implementation list** | acceptance criteria | — |

## Binding-pass mapping sketch

| `lunatic:` | Camunda 8 | Camunda 7 / Flowable |
|---|---|---|
| `binding type="http"` | `zeebe:TaskDefinition type="http"` (or REST connector template) | HTTP connector / `flowable:type="http"` |
| `binding type="kafka-producer"` | `zeebe:TaskDefinition type="kafka"` | delegate/connector |
| `binding type="decision"` | `zeebe:CalledDecision` | `camunda:decisionRef` |
| `lunatic:collection` | `zeebe:LoopCharacteristics inputCollection/inputElement` | `camunda:collection` / `camunda:elementVariable` |
| `lunatic:sample correlationKey` | `zeebe:Subscription correlationKey` | message correlation config |
| `lunatic:mock` | worker stub scaffold (job type from binding) | delegate stub scaffold |

## Moddle schema sketch

```json
{
  "name": "Lunatic", "prefix": "lunatic",
  "uri": "https://lunatic.dev/schema/1.0",
  "types": [
    { "name": "Mock", "superClass": ["Element"], "properties": [
      { "name": "body", "isBody": true, "type": "String" } ] },
    { "name": "Binding", "superClass": ["Element"], "properties": [
      { "name": "type", "isAttr": true, "type": "String" },
      { "name": "properties", "isMany": true, "type": "Property" } ] },
    { "name": "Property", "superClass": ["Element"], "properties": [
      { "name": "name", "isAttr": true, "type": "String" },
      { "name": "value", "isAttr": true, "type": "String" } ] },
    { "name": "Test", "superClass": ["Element"], "properties": [
      { "name": "name", "isAttr": true, "type": "String" },
      { "name": "payload", "isAttr": true, "type": "String" },
      { "name": "body", "isBody": true, "type": "String" } ] },
    { "name": "Scenario", "superClass": ["Element"], "properties": [
      { "name": "name", "isAttr": true, "type": "String" },
      { "name": "payload", "isAttr": true, "type": "String" },
      { "name": "description", "isAttr": true, "type": "String" } ] },
    { "name": "Collection", "superClass": ["Element"], "properties": [
      { "name": "expression", "isAttr": true, "type": "String" },
      { "name": "elementVariable", "isAttr": true, "type": "String" } ] },
    { "name": "Sample", "superClass": ["Element"], "properties": [
      { "name": "correlationKey", "isAttr": true, "type": "String" },
      { "name": "body", "isBody": true, "type": "String" } ] }
  ]
}
```
