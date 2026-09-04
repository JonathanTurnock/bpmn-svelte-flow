/**
 * The bpmn-svelte-flow (BSF) browser BPMN engine.
 *
 * Executes a bpmn-moddle process tree using the file's own standard
 * semantics — `bpmn:conditionExpression` + default flows route gateways,
 * `bpmn:scriptTask` bodies run, multi-instance loop characteristics iterate —
 * with `bsf:mock` blocks standing in for service/user/etc. task
 * implementations and `bsf:sample` supplying message payloads.
 * All script/expression bodies are JavaScript (`text/javascript`), run
 * against a mutable `payload`.
 *
 * The same module runs in the browser (over bpmn-js businessObjects — they
 * ARE moddle objects) and in node (over a bpmn-moddle parse), so the studio
 * UI, the WebMCP tools, and the repo tests all execute one engine.
 */

const JS_FORMAT = /javascript|ecmascript|(^|\/)js$/i;

// ---------------------------------------------------------------------------
// moddle helpers — tolerant of both registered (`bsf:Mock`) and
// unregistered (`bsf:mock` generic) extension parses, and of any prefix.
// ---------------------------------------------------------------------------

function localName(type) {
  const i = (type || '').indexOf(':');
  return (i >= 0 ? type.slice(i + 1) : type || '').toLowerCase();
}

export function extensions(element, name) {
  const values = element?.extensionElements?.values || [];
  return values.filter((v) => localName(v.$type) === name);
}

export function extensionBody(element, name) {
  const ext = extensions(element, name)[0];
  const body = ext && (ext.body ?? ext.$body);
  return typeof body === 'string' ? body.trim() : undefined;
}

function is(element, type) {
  return element && (element.$instanceOf ? element.$instanceOf(type) : element.$type === type);
}

function exprBody(expression) {
  if (!expression) return undefined;
  if (typeof expression === 'string') return expression.trim();
  const body = expression.body ?? expression.$body;
  return typeof body === 'string' ? body.trim() : undefined;
}

function flowElements(container) {
  return container?.flowElements || [];
}

function outgoing(node) {
  return node.outgoing || [];
}

function incoming(node) {
  return node.incoming || [];
}

// ---------------------------------------------------------------------------
// JavaScript evaluation
// ---------------------------------------------------------------------------

function runScript(body, payload, state) {
  const fn = new Function('payload', 'state', `"use strict";\n${body}`);
  return fn(payload, state);
}

function evalExpression(body, payload) {
  // Engine-dialect expressions (Camunda/JUEL-style `${approved}` or
  // `#{approved}`) evaluate their inner expression with payload fields in
  // scope, so unmodified third-party files route in the studio too.
  const dialect = /^[$#]\{([\s\S]*)\}$/.exec(body.trim());
  if (dialect) {
    const fn = new Function('payload', `with (payload) { return (${dialect[1]}); }`);
    return fn(payload);
  }
  const fn = new Function('payload', `"use strict"; return (${body});`);
  return fn(payload);
}

function makeAssert() {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message || 'assertion failed');
  };
  assert.equal = (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(message || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  };
  return assert;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Definitions-level collectors
// ---------------------------------------------------------------------------

export function processesOf(definitions) {
  return (definitions.rootElements || []).filter((r) => is(r, 'bpmn:Process'));
}

function processScopedExtensions(definitions, processBo, name) {
  return [...extensions(definitions, name), ...extensions(processBo, name)];
}

export function collectScenarios(definitions, processBo) {
  return processScopedExtensions(definitions, processBo, 'scenario').map((s) => ({
    name: s.name || 'scenario',
    description: s.description || '',
    payload: s.payload ? JSON.parse(s.payload) : {}
  }));
}

export function collectTests(definitions, processBo) {
  return processScopedExtensions(definitions, processBo, 'test').map((t) => ({
    name: t.name || 'test',
    payload: t.payload ? JSON.parse(t.payload) : {},
    body: (t.body ?? t.$body ?? '').trim()
  }));
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export class BsfEngine {
  /**
   * @param definitions bpmn-moddle bpmn:Definitions
   * @param processBo   the bpmn:Process to run (default: first executable, else first)
   */
  constructor(definitions, processBo, { maxSteps = 2000, onAgentTask } = {}) {
    this.definitions = definitions;
    this.process =
      processBo ||
      processesOf(definitions).find((p) => p.isExecutable) ||
      processesOf(definitions)[0];
    if (!this.process) throw new Error('no bpmn:Process in definitions');
    this.maxSteps = maxSteps;
    /**
     * Called when a token reaches an activity carrying bsf:instructions.
     * Return an object to complete the task (merged into the payload), or
     * undefined to park the token as "awaiting agent" — the run then idles
     * unfinished until completeAgentTask() (or a replay) supplies the result.
     * Without a handler, instructions are informational and the mock runs.
     */
    this.onAgentTask = onAgentTask;
    this.reset();
  }

  reset() {
    this.state = {
      visited: new Set(),
      traversedEdges: new Set(),
      /** Every traversal in order (repeats included) — a playback can diff it. */
      edgeTrail: [],
      log: [],
      results: [],
      errors: [],
      finished: false,
      steps: 0
    };
    this.tokens = [];
    this.joins = new Map();
    this.scopes = new Map();
    this.seq = 0;
    this.started = false;
    /** Tokens parked at agent tasks: {taskId, token, element, instructions}. */
    this.agentPending = [];
    /** Occurrence counter per element id — makes taskIds stable across loops. */
    this.agentSeen = new Map();
  }

  // -- lifecycle ------------------------------------------------------------

  start(payload = {}) {
    this.reset();
    this.started = true;
    const root = this.newScope(null, this.process, null);
    const starts = flowElements(this.process).filter(
      (el) => is(el, 'bpmn:StartEvent') && !el.$parent?.triggeredByEvent
    );
    if (!starts.length) {
      this.state.errors.push('process has no start event');
      this.state.finished = true;
      return this.state;
    }
    for (const startEl of starts) this.spawn(startEl, payload, root);
    return this.state;
  }

  /** Advance one token one hop. Returns false when nothing is left to do. */
  step() {
    if (!this.started || this.state.finished) return false;
    if (this.state.steps >= this.maxSteps) {
      this.state.errors.push(`step budget exhausted (${this.maxSteps})`);
      this.finish();
      return false;
    }
    const token = this.tokens.find((t) => t.status === 'queued');
    if (!token) {
      if (!this.releaseStuckJoin()) {
        // Tokens awaiting an agent keep the run alive but idle.
        if (this.livePendingAgents().length) return false;
        this.finish();
      }
      return !this.state.finished;
    }
    this.state.steps += 1;
    this.execute(token);
    return true;
  }

  livePendingAgents() {
    return this.agentPending.filter((p) => p.token.status === 'waiting');
  }

  /** The agent work the run is currently parked on, with payload snapshots. */
  pendingAgentTasks() {
    return this.livePendingAgents().map((p) => ({
      taskId: p.taskId,
      elementId: p.element.id,
      name: p.element.name || p.element.id,
      type: p.element.$type,
      instructions: p.instructions,
      documentation: (p.element.documentation || []).map((d) => d.text).filter(Boolean).join('\n'),
      payload: clone(p.token.payload)
    }));
  }

  /**
   * Completes a parked agent task: merges `result` into the token's payload
   * and sends the token onward. Follow with runToEnd()/step() to continue.
   */
  completeAgentTask(taskId, result) {
    const index = this.agentPending.findIndex(
      (p) => p.taskId === taskId && p.token.status === 'waiting'
    );
    if (index < 0) throw new Error(`no pending agent task ${taskId}`);
    const [pending] = this.agentPending.splice(index, 1);
    if (result && typeof result === 'object') Object.assign(pending.token.payload, result);
    this.log(pending.element, 'agent ran', pending.taskId, pending.token.payload);
    this.log(pending.element, 'completed');
    pending.token.status = 'queued';
    this.moveAlong(pending.token, outgoing(pending.element));
  }

  /**
   * Advance every token that was queued at the start of the round one hop, so
   * parallel branches move in lockstep (one round = one "beat" of the run).
   * Tokens spawned mid-round (e.g. by a fork) wait for the next round.
   * Returns false when nothing is left to do.
   */
  stepRound() {
    if (!this.started || this.state.finished) return false;
    const round = this.tokens.filter((t) => t.status === 'queued');
    if (!round.length) return this.step(); // join release / finish handling
    for (const token of round) {
      if (this.state.finished) return false;
      if (token.status !== 'queued') continue; // consumed earlier this round
      if (this.state.steps >= this.maxSteps) {
        this.state.errors.push(`step budget exhausted (${this.maxSteps})`);
        this.finish();
        return false;
      }
      this.state.steps += 1;
      this.execute(token);
    }
    return !this.state.finished;
  }

  runToEnd(payload) {
    if (!this.started) this.start(payload);
    while (this.step()) {
      /* step-bounded by maxSteps */
    }
    return this.state;
  }

  finish() {
    this.state.finished = true;
    for (const t of this.tokens) t.status = 'done';
  }

  liveTokens() {
    return this.tokens.filter((t) => t.status === 'queued' || t.status === 'waiting');
  }

  // -- scopes & tokens ------------------------------------------------------

  newScope(parent, container, outerToken, onComplete) {
    const scope = {
      id: `scope_${this.seq++}`,
      parent,
      container,
      outerToken,
      live: 0,
      onComplete
    };
    this.scopes.set(scope.id, scope);
    return scope;
  }

  spawn(element, payload, scope) {
    const token = { id: `tok_${this.seq++}`, at: element, payload, scope, status: 'queued' };
    scope.live += 1;
    this.tokens.push(token);
    return token;
  }

  consume(token) {
    token.status = 'done';
    token.scope.live -= 1;
    if (token.scope.live <= 0) this.completeScope(token.scope);
  }

  completeScope(scope) {
    if (scope.onComplete) scope.onComplete();
    else if (!scope.parent) {
      const anyLive = this.liveTokens().length > 0;
      if (!anyLive) this.finish();
    }
  }

  /** `payload` (when passed) is snapshotted — the data point at this step. */
  log(element, action, detail, payload) {
    this.state.log.push({
      step: this.state.steps,
      id: element?.id,
      name: element?.name || '',
      type: element?.$type,
      action,
      ...(detail !== undefined ? { detail } : {}),
      ...(payload !== undefined ? { payload: clone(payload) } : {})
    });
  }

  // -- element execution ----------------------------------------------------

  execute(token) {
    const el = token.at;
    this.state.visited.add(el.id);
    try {
      if (is(el, 'bpmn:SubProcess') || is(el, 'bpmn:Transaction')) return this.enterActivity(token);
      if (is(el, 'bpmn:ExclusiveGateway')) return this.exclusive(token);
      if (is(el, 'bpmn:InclusiveGateway')) return this.inclusive(token);
      if (is(el, 'bpmn:ParallelGateway')) return this.parallel(token);
      if (is(el, 'bpmn:EventBasedGateway')) return this.eventBased(token);
      if (is(el, 'bpmn:ComplexGateway')) return this.inclusive(token);
      if (is(el, 'bpmn:EndEvent')) return this.endEvent(token);
      if (is(el, 'bpmn:BoundaryEvent')) return this.passThrough(token, 'boundary caught');
      if (is(el, 'bpmn:StartEvent')) return this.startEvent(token);
      if (is(el, 'bpmn:IntermediateCatchEvent')) return this.catchEvent(token);
      if (is(el, 'bpmn:IntermediateThrowEvent')) return this.passThrough(token, 'thrown');
      if (is(el, 'bpmn:Activity')) return this.enterActivity(token);
      return this.passThrough(token);
    } catch (err) {
      this.handleError(token, el, err);
    }
  }

  passThrough(token, action = 'passed') {
    this.log(token.at, action);
    this.moveAlong(token, outgoing(token.at));
  }

  startEvent(token) {
    this.mergeSample(token);
    this.log(token.at, 'started', undefined, token.payload);
    this.moveAlong(token, outgoing(token.at));
  }

  catchEvent(token) {
    const defs = token.at.eventDefinitions || [];
    if (defs.some((d) => is(d, 'bpmn:TimerEventDefinition'))) {
      this.log(token.at, 'timer fired');
    } else if (defs.some((d) => is(d, 'bpmn:MessageEventDefinition'))) {
      this.mergeSample(token);
      this.log(token.at, 'message delivered');
    } else {
      this.log(token.at, 'caught');
    }
    this.moveAlong(token, outgoing(token.at));
  }

  /** Merge the element's message `bsf:sample` JSON into the payload. */
  mergeSample(token) {
    const defs = token.at.eventDefinitions || [];
    const msgDef = defs.find((d) => is(d, 'bpmn:MessageEventDefinition'));
    const message = msgDef?.messageRef;
    const body = message && extensionBody(message, 'sample');
    if (!body) return;
    Object.assign(token.payload, JSON.parse(body));
    this.log(token.at, 'sample merged', message.name || message.id, token.payload);
  }

  // -- activities -----------------------------------------------------------

  enterActivity(token) {
    const el = token.at;
    const loop = el.loopCharacteristics;
    if (loop && is(loop, 'bpmn:MultiInstanceLoopCharacteristics')) {
      return this.multiInstance(token, loop);
    }
    if (is(el, 'bpmn:SubProcess') || is(el, 'bpmn:Transaction')) {
      return this.runSubProcess(token, () => this.moveAlong(token, outgoing(el)));
    }

    // Agent task: bsf:instructions + a handler hand the work to an LLM agent.
    // The handler's result completes the task (the mock is the simulation
    // stand-in and is skipped); undefined parks the token as awaiting agent.
    const instructions = extensionBody(el, 'instructions');
    if (instructions && this.onAgentTask) {
      const occurrence = (this.agentSeen.get(el.id) ?? 0) + 1;
      this.agentSeen.set(el.id, occurrence);
      const taskId = `${el.id}#${occurrence}`;
      const result = this.onAgentTask({
        taskId,
        elementId: el.id,
        name: el.name || el.id,
        instructions,
        payload: token.payload
      });
      if (result === undefined) {
        token.status = 'waiting';
        this.agentPending.push({ taskId, token, element: el, instructions });
        this.log(el, 'awaiting agent', taskId);
        return;
      }
      if (result && typeof result === 'object') Object.assign(token.payload, result);
      this.log(el, 'agent ran', taskId, token.payload);
      this.log(el, 'completed');
      this.moveAlong(token, outgoing(el));
      return;
    }

    this.runActivityBody(token);
    this.log(el, 'completed');
    this.moveAlong(token, outgoing(el));
  }

  /** Task-shaped element: run its script (script task) or mock (all others). */
  runActivityBody(token, item) {
    const el = token.at;
    if (is(el, 'bpmn:ScriptTask')) {
      const body = exprBody(el.script);
      if (body) {
        if (el.scriptFormat && !JS_FORMAT.test(el.scriptFormat)) {
          this.log(el, 'script format', `running ${el.scriptFormat} as JavaScript`);
        }
        const returned = runScript(body, token.payload, this.publicState());
        if (returned !== undefined) token.payload = returned;
        this.log(el, 'script ran', undefined, token.payload);
      }
      return;
    }
    if (is(el, 'bpmn:ReceiveTask')) {
      const body = el.messageRef && extensionBody(el.messageRef, 'sample');
      if (body) {
        Object.assign(token.payload, JSON.parse(body));
        this.log(el, 'sample merged', el.messageRef.name || el.messageRef.id);
      }
    }
    const mock = extensionBody(el, 'mock');
    if (mock) {
      const returned = runScript(mock, token.payload, this.publicState());
      if (returned !== undefined) token.payload = returned;
      this.log(el, 'mock ran', item !== undefined ? `item ${JSON.stringify(item)}` : undefined, token.payload);
    }
  }

  runSubProcess(token, onDone) {
    const el = token.at;
    const scope = this.newScope(token.scope, el, token, () => {
      this.log(el, 'completed');
      onDone();
    });
    const starts = flowElements(el).filter(
      (inner) => is(inner, 'bpmn:StartEvent') && !el.triggeredByEvent
    );
    if (!starts.length) {
      this.log(el, 'completed', 'empty sub-process');
      return onDone();
    }
    this.log(el, 'entered');
    // The outer token parks until the inner scope drains; scope completion
    // re-queues it via onDone → moveAlong.
    token.status = 'waiting';
    for (const startEl of starts) this.spawn(startEl, token.payload, scope);
  }

  // -- multi-instance -------------------------------------------------------

  multiInstance(token, loop) {
    const el = token.at;
    const collection = extensions(loop, 'collection')[0];
    let items;
    let elementVariable = 'loopIndex';
    if (collection?.expression) {
      const expr = collection.expression;
      items = /^[A-Za-z_$][\w$]*$/.test(expr)
        ? token.payload[expr]
        : evalExpression(expr, token.payload);
      elementVariable = collection.elementVariable || 'item';
    } else {
      const body = exprBody(loop.loopCardinality);
      const n = body ? Number(evalExpression(body, token.payload)) : 0;
      items = Array.from({ length: Number.isFinite(n) ? n : 0 }, (_, i) => i);
    }
    if (!Array.isArray(items)) items = [];
    const mode = loop.isSequential ? 'sequential' : 'parallel';
    this.log(el, 'multi-instance', `${mode} ×${items.length}`);

    const finishAll = () => {
      delete token.payload[elementVariable];
      this.log(el, 'completed');
      this.moveAlong(token, outgoing(el));
    };

    // Parallel sub-process instances all start at once — their tokens advance
    // concurrently (in lockstep under stepRound). Instances share the outer
    // payload object (identical semantics to the sequential mode), with only
    // the element variable overridden per instance via a proxy.
    const isScoped = is(el, 'bpmn:SubProcess') || is(el, 'bpmn:Transaction');
    if (!loop.isSequential && isScoped && items.length) {
      const starts = flowElements(el).filter(
        (inner) => is(inner, 'bpmn:StartEvent') && !el.triggeredByEvent
      );
      if (!starts.length) {
        this.log(el, 'completed', 'empty sub-process');
        return finishAll();
      }
      let remaining = items.length;
      token.status = 'waiting';
      this.log(el, 'entered');
      for (const item of items) {
        const local = { [elementVariable]: item };
        const instancePayload = new Proxy(token.payload, {
          get: (t, k, r) => (k in local ? local[k] : Reflect.get(t, k, r)),
          set: (t, k, v) => Reflect.set(k in local ? local : t, k, v),
          has: (t, k) => k in local || k in t,
          deleteProperty: (t, k) => Reflect.deleteProperty(k in local ? local : t, k),
          ownKeys: (t) => [...new Set([...Reflect.ownKeys(t), ...Reflect.ownKeys(local)])],
          getOwnPropertyDescriptor: (t, k) =>
            k in local
              ? { value: local[k], writable: true, enumerable: true, configurable: true }
              : Reflect.getOwnPropertyDescriptor(t, k)
        });
        const scope = this.newScope(token.scope, el, token, () => {
          remaining -= 1;
          if (!remaining) finishAll();
        });
        for (const startEl of starts) this.spawn(startEl, instancePayload, scope);
      }
      return;
    }

    const runIteration = (index) => {
      if (index >= items.length) return finishAll();
      token.payload[elementVariable] = items[index];
      if (isScoped) {
        this.runSubProcess(token, () => runIteration(index + 1));
      } else {
        this.runActivityBody(token, items[index]);
        runIteration(index + 1);
      }
    };
    runIteration(0);
  }

  // -- gateways -------------------------------------------------------------

  conditionOf(flow) {
    return exprBody(flow.conditionExpression);
  }

  takeableFlows(el, payload) {
    const flows = outgoing(el);
    const defaultFlow = el.default;
    const conditional = flows.filter((f) => f !== defaultFlow);
    const taken = conditional.filter((f) => {
      const cond = this.conditionOf(f);
      if (cond === undefined) return false;
      return !!evalExpression(cond, payload);
    });
    return { flows, defaultFlow, taken, unconditional: conditional.filter((f) => this.conditionOf(f) === undefined) };
  }

  exclusive(token) {
    const el = token.at;
    if (outgoing(el).length <= 1) return this.passThrough(token, 'merged');
    const { defaultFlow, taken, unconditional } = this.takeableFlows(el, token.payload);
    const flow = taken[0] || defaultFlow || unconditional[0];
    if (!flow) {
      throw new Error(`no sequence flow condition matched at gateway ${el.id}`);
    }
    this.log(el, 'routed', flow.name || flow.id);
    this.moveAlong(token, [flow]);
  }

  inclusive(token) {
    const el = token.at;
    if (incoming(el).length > 1 && !this.arriveAtJoin(token, 'inclusive')) return;
    if (outgoing(el).length <= 1) return this.passThrough(token, 'merged');
    const { defaultFlow, taken, unconditional } = this.takeableFlows(el, token.payload);
    let flows = [...taken, ...unconditional];
    if (!flows.length && defaultFlow) flows = [defaultFlow];
    if (!flows.length) throw new Error(`no sequence flow condition matched at gateway ${el.id}`);
    this.log(el, 'routed', flows.map((f) => f.name || f.id).join(', '));
    this.moveAlong(token, flows);
  }

  parallel(token) {
    const el = token.at;
    if (incoming(el).length > 1 && !this.arriveAtJoin(token, 'parallel')) return;
    this.log(el, outgoing(el).length > 1 ? 'forked' : 'merged');
    this.moveAlong(token, outgoing(el));
  }

  eventBased(token) {
    const el = token.at;
    const flows = outgoing(el);
    const withSample = flows.find((f) => {
      const target = f.targetRef;
      const defs = target?.eventDefinitions || [];
      const msg = defs.find((d) => is(d, 'bpmn:MessageEventDefinition'));
      return msg?.messageRef && extensionBody(msg.messageRef, 'sample');
    });
    const flow = withSample || flows[0];
    if (!flow) throw new Error(`event-based gateway ${el.id} has no outgoing flow`);
    this.log(el, 'event selected', flow.targetRef?.name || flow.targetRef?.id);
    this.moveAlong(token, [flow]);
  }

  /**
   * Join bookkeeping. Returns true when this arrival releases the join —
   * the arriving token then carries the merged payload onward.
   */
  arriveAtJoin(token, kind) {
    const el = token.at;
    const key = `${token.scope.id}:${el.id}`;
    let join = this.joins.get(key);
    if (!join) {
      join = { tokens: [], arrivedFlows: new Set() };
      this.joins.set(key, join);
    }
    if (token.arrivedVia) join.arrivedFlows.add(token.arrivedVia.id);
    join.tokens.push(token);
    token.status = 'waiting';

    const ready =
      kind === 'parallel'
        ? join.arrivedFlows.size >= incoming(el).length
        : this.otherLiveTokenCount(join) === 0;
    if (!ready) return false;
    return this.releaseJoin(key, join, token);
  }

  releaseJoin(key, join, token) {
    this.joins.delete(key);
    const merged = join.tokens[0].payload;
    for (const t of join.tokens.slice(1)) {
      if (t.payload !== merged) Object.assign(merged, t.payload);
    }
    for (const t of join.tokens) {
      if (t !== token) this.consume(t);
    }
    token.status = 'queued';
    token.payload = merged;
    this.log(token.at, 'joined', `${join.tokens.length} token(s)`, merged);
    return true;
  }

  otherLiveTokenCount(join) {
    return this.liveTokens().filter((t) => !join.tokens.includes(t)).length;
  }

  /** A join is stuck with no other live tokens anywhere: release it. */
  releaseStuckJoin() {
    for (const [key, join] of this.joins) {
      const token = join.tokens[join.tokens.length - 1];
      this.log(token.at, 'join released', 'no more tokens can arrive');
      this.releaseJoin(key, join, token);
      return true;
    }
    return false;
  }

  // -- ends & errors --------------------------------------------------------

  endEvent(token) {
    const el = token.at;
    const defs = el.eventDefinitions || [];
    const errDef = defs.find((d) => is(d, 'bpmn:ErrorEventDefinition'));
    const terminate = defs.find((d) => is(d, 'bpmn:TerminateEventDefinition'));
    if (terminate) {
      this.log(el, 'terminated');
      this.state.results.push({ endId: el.id, name: el.name || '', payload: clone(token.payload) });
      this.finish();
      return;
    }
    if (errDef && token.scope.parent) {
      const code = errDef.errorRef?.errorCode || errDef.errorRef?.name || el.name || 'error';
      this.log(el, 'error end', code);
      return this.propagateError(token, new Error(code), errDef.errorRef);
    }
    this.log(el, 'ended', undefined, token.scope.parent ? undefined : token.payload);
    if (!token.scope.parent) {
      this.state.results.push({ endId: el.id, name: el.name || '', payload: clone(token.payload) });
    }
    this.consume(token);
  }

  handleError(token, el, err) {
    this.log(el, 'threw', err.message);
    this.propagateError(token, err, undefined);
  }

  /** Walk scopes outward looking for an error boundary event to catch. */
  propagateError(token, err, errorRef) {
    let activity = token.at;
    let scope = token.scope;
    while (scope) {
      const boundary = this.findErrorBoundary(scope, activity, errorRef);
      if (boundary) {
        this.interruptScopeOf(token, boundary.scope);
        const t = this.spawn(boundary.element, token.payload, boundary.scope);
        t.arrivedVia = undefined;
        this.log(boundary.element, 'error caught', err.message);
        return;
      }
      activity = scope.container;
      scope = scope.parent;
    }
    this.state.errors.push(`unhandled error at ${token.at.id}: ${err.message}`);
    this.consume(token);
  }

  findErrorBoundary(scope, activity, errorRef) {
    const container = scope.container;
    const boundaries = flowElements(container).filter(
      (el) =>
        is(el, 'bpmn:BoundaryEvent') &&
        el.attachedToRef === activity &&
        (el.eventDefinitions || []).some((d) => is(d, 'bpmn:ErrorEventDefinition'))
    );
    if (!boundaries.length) return null;
    const match =
      boundaries.find((b) =>
        (b.eventDefinitions || []).some(
          (d) => is(d, 'bpmn:ErrorEventDefinition') && errorRef && d.errorRef === errorRef
        )
      ) ||
      boundaries.find((b) =>
        (b.eventDefinitions || []).some((d) => is(d, 'bpmn:ErrorEventDefinition') && !d.errorRef)
      ) ||
      boundaries[0];
    return { element: match, scope };
  }

  /**
   * Interrupting boundary caught at `catchScope`: kill the failing token and
   * every live token inside the scopes between it and `catchScope` (the
   * failing activity's subtree), without firing their completion hooks.
   */
  interruptScopeOf(token, catchScope) {
    const doomed = new Set();
    for (let s = token.scope; s && s !== catchScope; s = s.parent) doomed.add(s);
    const kill = (t) => {
      if (t.status === 'done') return;
      t.status = 'done';
      t.scope.live -= 1;
    };
    for (const t of this.liveTokens()) {
      let s = t.scope;
      while (s && !doomed.has(s)) s = s.parent;
      if (s) kill(t);
    }
    kill(token);
  }

  // -- token movement -------------------------------------------------------

  moveAlong(token, flows) {
    if (!flows.length) {
      this.consume(token);
      return;
    }
    flows.forEach((flow, i) => {
      this.state.traversedEdges.add(flow.id);
      this.state.edgeTrail.push(flow.id);
      if (i === 0) {
        token.at = flow.targetRef;
        token.arrivedVia = flow;
        token.status = 'queued';
      } else {
        const t = this.spawn(flow.targetRef, clone(token.payload), token.scope);
        t.arrivedVia = flow;
      }
    });
  }

  publicState() {
    return {
      visited: this.state.visited,
      traversedEdges: this.state.traversedEdges,
      log: this.state.log,
      results: this.state.results,
      finished: this.state.finished
    };
  }
}

// ---------------------------------------------------------------------------
// Test runner — fresh engine per bsf:test
// ---------------------------------------------------------------------------

export function runTests(definitions, processBo, tests) {
  processBo =
    processBo ||
    processesOf(definitions).find((p) => p.isExecutable) ||
    processesOf(definitions)[0];
  const suite = tests || collectTests(definitions, processBo);
  return suite.map((test) => {
    try {
      const engine = new BsfEngine(definitions, processBo);
      const state = engine.runToEnd(clone(test.payload));
      if (state.errors.length) throw new Error(state.errors.join('; '));
      const payloads = state.results.map((r) => r.payload);
      const fn = new Function(
        'state',
        'payloads',
        'payload',
        'assert',
        `"use strict";\n${test.body}`
      );
      fn(engine.publicState(), payloads, payloads[0], makeAssert());
      return { name: test.name, ok: true };
    } catch (err) {
      return { name: test.name, ok: false, error: err.message };
    }
  });
}

// ---------------------------------------------------------------------------
// Portability / executability checks
// ---------------------------------------------------------------------------

export function validate(definitions) {
  const issues = [];
  const add = (severity, elementId, message) => issues.push({ severity, elementId, message });

  for (const processBo of processesOf(definitions)) {
    if (!processBo.isExecutable) {
      add('warning', processBo.id, 'process is not marked isExecutable="true"');
    }
    walk(processBo);

    function walk(container) {
      for (const el of flowElements(container)) {
        if (is(el, 'bpmn:SequenceFlow')) continue;
        const isBoundary = is(el, 'bpmn:BoundaryEvent');
        const inEventSub = container.triggeredByEvent;
        if (!is(el, 'bpmn:StartEvent') && !isBoundary && !incoming(el).length) {
          add('warning', el.id, 'element has no incoming sequence flow');
        }
        if (!is(el, 'bpmn:EndEvent') && !outgoing(el).length) {
          add('warning', el.id, 'element has no outgoing sequence flow');
        }
        if (is(el, 'bpmn:ScriptTask')) {
          if (!exprBody(el.script)) add('warning', el.id, 'script task has no script body');
          if (el.scriptFormat && !JS_FORMAT.test(el.scriptFormat)) {
            add('warning', el.id, `scriptFormat "${el.scriptFormat}" — the studio engine runs JavaScript`);
          }
        }
        if (is(el, 'bpmn:Gateway') && outgoing(el).length > 1 && !is(el, 'bpmn:ParallelGateway') && !is(el, 'bpmn:EventBasedGateway')) {
          const bare = outgoing(el).filter(
            (f) => f !== el.default && exprBody(f.conditionExpression) === undefined
          );
          for (const f of bare) {
            add('warning', f.id, 'diverging flow has neither a condition nor the default marker');
          }
        }
        const loop = el.loopCharacteristics;
        if (loop && is(loop, 'bpmn:MultiInstanceLoopCharacteristics')) {
          if (!exprBody(loop.loopCardinality) && !extensions(loop, 'collection').length) {
            add('warning', el.id, 'multi-instance has neither loopCardinality nor bsf:collection');
          }
        }
        if (
          (is(el, 'bpmn:ServiceTask') || is(el, 'bpmn:SendTask') || is(el, 'bpmn:BusinessRuleTask')) &&
          !extensionBody(el, 'mock')
        ) {
          add('info', el.id, 'task has no bsf:mock — it will pass the payload through unchanged');
        }
        if (is(el, 'bpmn:SubProcess')) walk(el);
        void inEventSub;
      }
    }
  }
  return issues;
}
