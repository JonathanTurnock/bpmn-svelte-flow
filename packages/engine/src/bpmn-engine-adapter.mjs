/**
 * Generic binding-pass adapter: runs a BSF artifact, unmodified, in
 * bpmn-engine (a third-party Node.js BPMN 2.0 engine). It maps the file's
 * declared dialect onto the engine:
 *   - MIME `text/javascript` script tasks and sequence-flow conditions run
 *     against the BSF `payload` contract via a proxy over engine variables
 *     (FEEL via feelin where a file declares that instead),
 *   - service/send/businessRule tasks execute the file's own `bsf:mock`
 *     extension blocks as their implementations,
 *   - `bsf:collection` provides per-iteration multi-instance data.
 * The adapter is process-agnostic: nothing in it mentions any particular
 * flow, and per-run state is closed over — safe to call concurrently.
 */
import { Engine } from 'bpmn-engine';
import { evaluate as feel } from 'feelin';
// @ts-ignore - bpmn-moddle ships no types
import { BpmnModdle } from 'bpmn-moddle';
import bsfSchema from './bsf-moddle.js';

const JS_LANGUAGE = /javascript|ecmascript|(^|\/)js$/i;
const BOUND_TYPES = new Set(['bpmn:ServiceTask', 'bpmn:SendTask', 'bpmn:BusinessRuleTask']);

function localName(type) {
  const i = (type ?? '').indexOf(':');
  // Registered moddle parses type extension elements (`bsf:Sample`); the
  // engine's serializer keeps them as written (`bsf:sample`) — compare
  // case-insensitively.
  return (i >= 0 ? type.slice(i + 1) : (type ?? '')).toLowerCase();
}

function bsfExtension(owner, name) {
  const values = owner?.extensionElements?.values ?? [];
  return values.find((v) => localName(v.$type) === name);
}

/**
 * feelin's evaluate returns { value, warnings }. Returns the plain value, or
 * `undefined` when evaluation only failed to find variables — the caller then
 * falls back to the raw string (the engine routes plain attribute strings,
 * e.g. message names, through the same resolver).
 */
function feelEval(expression, context) {
  const result = feel(expression, context);
  const value = result && typeof result === 'object' && 'warnings' in result ? result.value : result;
  const warnings =
    result && typeof result === 'object' && Array.isArray(result.warnings) ? result.warnings : [];
  if (value === null && warnings.some((w) => w.type === 'NO_VARIABLE_FOUND')) return undefined;
  return value;
}

/**
 * Map waiting-element id → the parsed `bsf:sample` payload of its message,
 * so the adapter can deliver the same message payloads the BSF engine
 * merges — the correlation half of the binding pass.
 */
async function collectMessageSamples(source) {
  const moddle = new BpmnModdle({ bsf: bsfSchema });
  const { rootElement } = await moddle.fromXML(source);
  const samples = new Map();
  const sampleOf = (message) => {
    const sample = bsfExtension(message, 'sample');
    const body = (sample?.body ?? sample?.$body ?? '').trim();
    return body ? JSON.parse(body) : undefined;
  };
  const walk = (container) => {
    for (const el of container.flowElements ?? []) {
      const msgDef = (el.eventDefinitions ?? []).find(
        (d) => d.$type === 'bpmn:MessageEventDefinition'
      );
      const message = msgDef?.messageRef ?? el.messageRef;
      const payload = message && sampleOf(message);
      if (payload !== undefined) samples.set(el.id, payload);
      if (el.flowElements) walk(el);
    }
  };
  for (const root of rootElement.rootElements ?? []) {
    if (root.$type === 'bpmn:Process') walk(root);
  }
  return samples;
}

/**
 * Run `source` (BPMN 2.0 XML) in bpmn-engine with the given initial
 * variables. Waiting activities (message events, user tasks) are signalled
 * automatically — with their message's `bsf:sample` payload where one is
 * declared — unless options.autoSignal === false.
 *
 * @returns {Promise<{completed: boolean, error?: string,
 *   trail: Array<{event: string, id: string}>, variables: object}>}
 */
export async function runInBpmnEngine(source, variables = {}, options = {}) {
  const { autoSignal = true, name = 'bsf-adapted' } = options;
  const messageSamples = autoSignal ? await collectMessageSamples(source) : new Map();

  // Per-run sequential-MI iteration tracker: exposes the bsf:collection
  // element variable (e.g. `participant`) to conditions and mocks.
  const iteration = { index: -1, collection: null, elementVariable: null };

  function makePayloadProxy(environment) {
    const vars = environment.variables;
    return new Proxy(vars, {
      get(target, prop) {
        if (
          prop === iteration.elementVariable &&
          iteration.index >= 0 &&
          Array.isArray(target[iteration.collection])
        ) {
          return target[iteration.collection][iteration.index];
        }
        return target[prop];
      }
    });
  }

  function feelContext(environment) {
    const ctx = { ...environment.variables };
    if (
      iteration.index >= 0 &&
      iteration.elementVariable &&
      Array.isArray(ctx[iteration.collection])
    ) {
      ctx[iteration.elementVariable] = ctx[iteration.collection][iteration.index];
    }
    return ctx;
  }

  function jsEval(expression, environment) {
    return new Function('payload', `"use strict"; return (${expression});`)(
      makePayloadProxy(environment)
    );
  }

  // -- scripts provider: MIME javascript + declared-language conditions -----
  const scripts = new Map();
  const scriptsProvider = {
    register({ id, type, behaviour }) {
      if (type === 'bpmn:SequenceFlow') {
        const cond = behaviour.conditionExpression;
        if (!cond?.body) return;
        const language = cond.language ?? 'feel';
        const script = {
          execute(scope, callback) {
            try {
              const result = JS_LANGUAGE.test(language)
                ? jsEval(cond.body.trim(), scope.environment)
                : feelEval(cond.body.trim(), feelContext(scope.environment));
              callback(null, !!result);
            } catch (err) {
              callback(err);
            }
          }
        };
        scripts.set(id, script);
        return script;
      }
      const language = behaviour.scriptFormat;
      if (!language || !JS_LANGUAGE.test(language)) return;
      // BSF contract: the body is a plain JS block over a mutable `payload`.
      const fn = new Function('payload', `"use strict";\n${behaviour.script}`);
      const script = {
        execute(scope, callback) {
          try {
            fn(makePayloadProxy(scope.environment));
            callback();
          } catch (err) {
            callback(err);
          }
        }
      };
      scripts.set(id, script);
      return script;
    },
    getScript(_language, { id }) {
      return scripts.get(id);
    }
  };

  // -- expression resolution (loopCardinality etc.) -------------------------
  function resolveExpression(expression, message) {
    const environment = message?.environment;
    if (expression && typeof expression === 'object' && typeof expression.body === 'string') {
      expression = expression.body;
    }
    if (typeof expression !== 'string' || !environment) return expression;
    const trimmed = expression.trim();
    if (trimmed.startsWith('${')) {
      const path = trimmed.slice(2, -1).replace(/^environment\.variables\./, '');
      return path.split('.').reduce((o, k) => o?.[k], environment.variables);
    }
    if (/^payload\b/.test(trimmed)) {
      try {
        return jsEval(trimmed, environment);
      } catch {
        return expression;
      }
    }
    try {
      const value = feelEval(trimmed, feelContext(environment));
      return value === undefined ? expression : value;
    } catch {
      return expression;
    }
  }

  // -- bind tasks by executing the file's bsf:mock blocks -------------------
  function BsfMockService(activity) {
    const mock = bsfExtension(activity.behaviour, 'mock');
    const source = (mock?.$body ?? mock?.body ?? '').trim();
    this.execute = function execute(executionMessage, callback) {
      if (!source) return callback(); // unmocked task: pass through
      try {
        new Function('payload', `"use strict";\n${source}`)(
          makePayloadProxy(activity.environment)
        );
        callback();
      } catch (err) {
        callback(err);
      }
    };
  }

  function bsfBindingExtension(activity, context) {
    if (BOUND_TYPES.has(activity.type)) {
      activity.behaviour.Service = BsfMockService;
    }
    // Deliver the message payload the way the BSF engine does: when a
    // catching element with a bsf:sample completes its wait, merge the
    // sample into the activity's (shared) environment.
    const sample = messageSamples.get(activity.id);
    if (sample) {
      activity.on('end', () => Object.assign(activity.environment.variables, sample));
    }
    const loop = activity.behaviour?.loopCharacteristics?.behaviour;
    const collection = bsfExtension(loop, 'collection');
    if (collection) {
      iteration.collection = collection.expression;
      iteration.elementVariable = collection.elementVariable;
    }
    // Sequential-MI iteration tracking: a start event whose parent is a
    // multi-instance sub-process fires once per iteration.
    const parent = activity.parent && context?.getActivityById?.(activity.parent.id);
    if (activity.type === 'bpmn:StartEvent' && parent?.behaviour?.loopCharacteristics) {
      activity.on('start', () => {
        iteration.index += 1;
      });
    }
  }

  // -- run ------------------------------------------------------------------
  const engine = new Engine({
    name,
    source,
    variables,
    scripts: scriptsProvider,
    expressions: { resolveExpression },
    extensions: { bsfBinding: bsfBindingExtension }
  });

  const trail = [];
  engine.broker.subscribeTmp(
    'event',
    'activity.#',
    (routingKey, msg) => {
      if (['activity.start', 'activity.end', 'activity.error', 'activity.wait'].includes(routingKey)) {
        trail.push({ event: routingKey.slice('activity.'.length), id: msg.content.id });
      }
    },
    { noAck: true }
  );

  const listener = {
    emit(eventName, api) {
      if (eventName === 'activity.wait' && autoSignal) {
        setTimeout(() => api.signal({}), 5);
      }
    }
  };

  try {
    const execution = await engine.execute({ listener });
    // A flow with no waits can complete before waitFor is armed.
    if (execution.state !== 'completed' && execution.state !== 'idle') {
      await engine.waitFor('end');
    }
    // The engine clones environments per scope (engine → definition →
    // process); mock/script writes land in the PROCESS environment.
    const def = execution.definitions[0];
    const processEnv =
      def?.execution?.processes?.[0]?.environment ?? def?.environment ?? execution.environment;
    return { completed: true, trail, variables: processEnv.variables };
  } catch (err) {
    return { completed: false, error: err.message, trail, variables: {} };
  }
}
