// Empirical spike, part 2: run the UNMODIFIED Dryrun artifact in
// bpmn-engine through a generic adapter that
//   1. accepts the standard MIME scriptFormat (text/javascript),
//   2. evaluates FEEL (the file's declared expressionLanguage) via feelin
//      for sequence-flow conditions and loopCardinality,
//   3. binds service/send/businessRule tasks by executing the file's own
//      dryrun:mock extension blocks (the "bind implementations where the mocks
//      were" story, automated).
// The adapter is process-agnostic: nothing in it mentions the messaging flow.
// Usage: node spike/run-engine-adapted.mjs <file.bpmn> <happy|denied>
import { Engine } from 'bpmn-engine';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import { evaluate as feel } from 'feelin';

const file = process.argv[2] ?? 'spike/messaging-flow.bpmn';
const scenario = process.argv[3] ?? 'happy';

const payloads = {
  happy: {
    senderId: 'usr_1042',
    chatId: 'chat_8231',
    text: 'Paying with card 4111 1111 1111 1111, CVV: 737 — ok?',
    muted: false
  },
  denied: {
    senderId: 'usr_6660',
    chatId: 'chat_8231',
    text: 'hey — card 4111 1111 1111 1111',
    muted: true
  }
};

// Sequential-MI iteration tracker: exposes `participant` (and the current
// index) to FEEL conditions and mocks inside the delivery sub-process.
const iteration = { index: -1 };

function feelContext(environment) {
  const vars = environment.variables;
  const ctx = { ...vars };
  if (iteration.index >= 0 && Array.isArray(vars.participants)) {
    ctx.participant = vars.participants[iteration.index];
  }
  return ctx;
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

// ---- 1+2: Scripts provider: MIME javascript + FEEL conditions -------------
function AdaptedScripts() {
  this.scripts = new Map();
}
AdaptedScripts.prototype.register = function register({ id, type, behaviour, environment }) {
  if (type === 'bpmn:SequenceFlow') {
    const cond = behaviour.conditionExpression;
    if (!cond?.body) return;
    const language = cond.language ?? 'feel'; // inherit declared expressionLanguage
    if (/feel/i.test(language) || !cond.language) {
      const script = {
        execute(scope, callback) {
          try {
            callback(null, !!feelEval(cond.body.trim(), feelContext(scope.environment)));
          } catch (err) {
            callback(err);
          }
        }
      };
      this.scripts.set(id, script);
      return script;
    }
  }
  const language = behaviour.scriptFormat;
  if (!language || !/javascript|(^|\/)js$/i.test(language)) return;
  const compiled = new Script(behaviour.script, { filename: `${type}/${id}` });
  const script = {
    execute(scope, callback) {
      compiled.runInNewContext({ ...scope, next: callback });
    }
  };
  this.scripts.set(id, script);
  return script;
};
AdaptedScripts.prototype.getScript = function getScript(_language, { id }) {
  return this.scripts.get(id);
};

// ---- 2b: FEEL-aware expression resolution (loopCardinality etc.) ----------
function resolveExpression(expression, message) {
  const environment = message?.environment;
  // Formal-expression moddle objects can arrive unflattened.
  if (expression && typeof expression === 'object' && typeof expression.body === 'string') {
    expression = expression.body;
  }
  if (typeof expression !== 'string' || !environment) return expression;
  const trimmed = expression.trim();
  if (trimmed.startsWith('${')) {
    // engine-native expression dialect — minimal support: variable paths
    const path = trimmed.slice(2, -1).replace(/^environment\.variables\./, '');
    return path.split('.').reduce((o, k) => o?.[k], environment.variables);
  }
  try {
    const value = feelEval(trimmed, feelContext(environment));
    // Undefined ⇒ not resolvable as FEEL over current variables (e.g. a plain
    // message name) — hand the raw string back untouched.
    return value === undefined ? expression : value;
  } catch {
    return expression;
  }
}

// ---- 3: bind tasks by executing the file's dryrun:mock blocks ----------------
function localName(type) {
  const i = type.indexOf(':');
  return i >= 0 ? type.slice(i + 1) : type;
}

function dryrunMockExtension(activity) {
  const values = activity.behaviour?.extensionElements?.values ?? [];
  const mock = values.find((v) => localName(v.$type ?? '') === 'mock');
  return mock?.$body?.trim();
}

function DryrunMockService(activity) {
  const source = dryrunMockExtension(activity);
  this.execute = function execute(executionMessage, callback) {
    if (!source) return callback(); // unmocked task: pass through
    const environment = activity.environment;
    const sandbox = createContext({ payload: makePayloadProxy(environment) });
    try {
      new Script(source, { filename: `dryrun:mock/${activity.id}` }).runInContext(sandbox);
      callback();
    } catch (err) {
      callback(err);
    }
  };
}

// Mocks are written against `payload`; map that onto engine variables and
// expose the per-iteration participant.
function makePayloadProxy(environment) {
  const vars = environment.variables;
  return new Proxy(vars, {
    get(target, prop) {
      if (prop === 'participant' && iteration.index >= 0 && Array.isArray(target.participants)) {
        return target.participants[iteration.index];
      }
      return target[prop];
    }
  });
}

const BOUND_TYPES = new Set(['bpmn:ServiceTask', 'bpmn:SendTask', 'bpmn:BusinessRuleTask']);
function dryrunBindingExtension(activity, context) {
  if (BOUND_TYPES.has(activity.type)) {
    activity.behaviour.Service = DryrunMockService;
  }
  // Sequential-MI iteration tracking: a start event whose parent is a
  // multi-instance sub-process fires once per iteration.
  const parent = activity.parent && context?.getActivityById?.(activity.parent.id);
  const parentIsMI = parent?.behaviour?.loopCharacteristics;
  if (activity.type === 'bpmn:StartEvent' && parentIsMI) {
    activity.on('start', () => {
      iteration.index += 1;
    });
  }
}

// ---- run ------------------------------------------------------------------
const engine = new Engine({
  name: 'messaging-flow-adapted',
  source: readFileSync(file, 'utf8'),
  variables: payloads[scenario],
  scripts: new AdaptedScripts(),
  expressions: { resolveExpression },
  extensions: { dryrunBinding: dryrunBindingExtension }
});

const trail = [];
engine.broker.subscribeTmp(
  'event',
  'activity.#',
  (routingKey, msg) => {
    if (['activity.start', 'activity.end', 'activity.error'].includes(routingKey)) {
      trail.push(`${routingKey}  ${msg.content.id}${msg.content.isMultiInstance ? ' (MI)' : ''}`);
    }
  },
  { noAck: true }
);

const listener = {
  emit(eventName, api) {
    if (eventName === 'activity.wait') {
      trail.push(`activity.wait  ${api.id} → message delivered by test harness`);
      setTimeout(() => api.signal({}), 5);
    }
  }
};

try {
  const execution = await engine.execute({ listener });
  await engine.waitFor('end');
  console.log('=== ENGINE COMPLETED ===');
  console.log('trail:');
  for (const t of trail) console.log('  ' + t);
  // The engine clones environments per scope (engine → definition → process);
  // mock/script writes land in the PROCESS environment — walk down to it.
  const def = execution.definitions[0];
  const processEnv =
    def?.execution?.processes?.[0]?.environment ?? def?.environment ?? execution.environment;
  console.log('final variables:', JSON.stringify(processEnv.variables, null, 2));
} catch (err) {
  console.log('=== ENGINE FAILED ===');
  console.log('error:', err.message);
  for (const t of trail) console.log('  ' + t);
  process.exit(1);
}
