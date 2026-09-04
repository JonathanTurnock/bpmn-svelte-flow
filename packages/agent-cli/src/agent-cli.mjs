/**
 * bsf-agent — a JSON-RPC CLI that lets an LLM agent drive a BPMN workflow.
 *
 * The workflow file is the contract: activities carrying bsf:instructions are
 * the agent's work items. The CLI reuses the BsfEngine executor and keeps
 * durable state on the filesystem as an event-sourced record — the initial
 * payload plus every completed task result. Each invocation replays the run
 * from that record (scripts, mocks, conditions and routing re-execute
 * deterministically), so a run survives process exits and can be resumed by a
 * different agent session at any time.
 *
 * Usage (every response is a JSON-RPC 2.0 message on stdout):
 *   bsf-agent start '{"file":"flow.bpmn","scenario":"Checkout outage"}'
 *   bsf-agent next '{"runId":"run-..."}'
 *   bsf-agent complete '{"runId":"run-...","taskId":"Task_Classify#1","result":{"category":"technical"}}'
 *   bsf-agent status|trace '{"runId":"run-..."}'   ·   bsf-agent list
 *   bsf-agent serve            (line-delimited JSON-RPC requests on stdin)
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { BpmnModdle } from 'bpmn-moddle';
import bsfSchema from '@bsf/engine/moddle';
import { BsfEngine, collectScenarios } from '@bsf/engine';

const STATE_VERSION = 1;

class RpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}
const invalidParams = (message, data) => new RpcError(-32602, message, data);

// -- durable state -----------------------------------------------------------

function runsDir(params) {
  return resolve(params?.stateDir || process.env.BSF_RUNS_DIR || '.bsf-runs');
}

function statePath(dir, runId) {
  if (!/^[\w.-]+$/.test(runId)) throw invalidParams(`invalid runId ${runId}`);
  return join(dir, `${runId}.json`);
}

function loadState(params) {
  const dir = runsDir(params);
  if (!params?.runId) throw invalidParams('runId is required');
  const path = statePath(dir, params.runId);
  if (!existsSync(path)) {
    throw invalidParams(`no run ${params.runId} in ${dir}`, { stateDir: dir });
  }
  return { dir, path, state: JSON.parse(readFileSync(path, 'utf8')) };
}

/** Atomic write so a crash mid-save never corrupts the run record. */
function saveState(dir, state) {
  mkdirSync(dir, { recursive: true });
  state.updatedAt = new Date().toISOString();
  const path = statePath(dir, state.runId);
  const tmp = `${path}.tmp-${randomBytes(4).toString('hex')}`;
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, path);
  return path;
}

// -- replay ------------------------------------------------------------------

async function parseDefinitions(file) {
  const xml = readFileSync(file, 'utf8');
  const moddle = new BpmnModdle({ bsf: bsfSchema });
  const { rootElement } = await moddle.fromXML(xml);
  return { definitions: rootElement, hash: createHash('sha256').update(xml).digest('hex') };
}

function buildEngine(definitions, state) {
  const completions = new Map(state.completions.map((c) => [c.taskId, c.result]));
  return new BsfEngine(definitions, undefined, {
    onAgentTask: ({ taskId }) => (completions.has(taskId) ? (completions.get(taskId) ?? {}) : undefined)
  });
}

/** Rebuilds the live run by replaying recorded completions over the file. */
async function replay(state) {
  const { definitions, hash } = await parseDefinitions(state.file);
  if (state.xmlHash && hash !== state.xmlHash) {
    throw new RpcError(
      -32000,
      `${state.file} changed since this run started — its recorded completions may no longer apply. Start a new run (or delete the state file to discard this one).`
    );
  }
  const engine = buildEngine(definitions, state);
  engine.runToEnd(structuredClone(state.payload));
  return engine;
}

function statusOf(state, engine) {
  const s = engine.state;
  return {
    runId: state.runId,
    file: state.file,
    scenario: state.scenario ?? null,
    finished: s.finished,
    steps: s.steps,
    errors: s.errors,
    completedTasks: state.completions.map((c) => c.taskId),
    pending: engine.pendingAgentTasks(),
    ...(s.finished ? { results: s.results } : {})
  };
}

// -- methods -----------------------------------------------------------------

export const methods = {
  async start(params = {}) {
    if (!params.file) throw invalidParams('params.file (path to a .bpmn file) is required');
    const file = resolve(params.file);
    if (!existsSync(file)) throw invalidParams(`no such file: ${file}`);
    const { definitions, hash } = await parseDefinitions(file);
    const probe = new BsfEngine(definitions);
    const scenarios = collectScenarios(definitions, probe.process);
    let payload = params.payload;
    let scenario = params.scenario ?? null;
    if (payload === undefined) {
      if (scenario) {
        const found = scenarios.find((s) => s.name === scenario);
        if (!found) {
          throw invalidParams(`no scenario "${scenario}"`, {
            scenarios: scenarios.map((s) => s.name)
          });
        }
        payload = found.payload;
      } else {
        payload = scenarios[0]?.payload ?? {};
        scenario = scenarios[0]?.name ?? null;
      }
    }
    const dir = runsDir(params);
    const runId =
      params.runId ??
      `run-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}-${randomBytes(3).toString('hex')}`;
    if (existsSync(statePath(dir, runId))) throw invalidParams(`run ${runId} already exists`);
    const state = {
      version: STATE_VERSION,
      runId,
      file,
      xmlHash: hash,
      scenario,
      payload,
      completions: [],
      createdAt: new Date().toISOString()
    };
    const stateFile = saveState(dir, state);
    const engine = await replay(state);
    return { stateFile, ...statusOf(state, engine) };
  },

  async status(params) {
    const { state } = loadState(params);
    return statusOf(state, await replay(state));
  },

  /** The agent's main loop: the next task to do, or the finished outcome. */
  async next(params) {
    const { state } = loadState(params);
    const engine = await replay(state);
    const pending = engine.pendingAgentTasks();
    return {
      runId: state.runId,
      finished: engine.state.finished,
      task: pending[0] ?? null,
      ...(engine.state.finished
        ? { results: engine.state.results, errors: engine.state.errors }
        : {})
    };
  },

  async complete(params = {}) {
    const { dir, state } = loadState(params);
    if (!params.taskId) throw invalidParams('params.taskId is required');
    if (params.result !== undefined && (typeof params.result !== 'object' || params.result === null)) {
      throw invalidParams('params.result must be an object of payload fields to merge');
    }
    const engine = await replay(state);
    const pending = engine.pendingAgentTasks();
    if (!pending.some((t) => t.taskId === params.taskId)) {
      throw invalidParams(`task ${params.taskId} is not pending`, {
        pending: pending.map((t) => t.taskId)
      });
    }
    state.completions.push({
      taskId: params.taskId,
      result: params.result ?? {},
      completedAt: new Date().toISOString()
    });
    saveState(dir, state);
    return statusOf(state, await replay(state));
  },

  async trace(params) {
    const { state } = loadState(params);
    const engine = await replay(state);
    return { runId: state.runId, trace: engine.state.log };
  },

  async list(params) {
    const dir = runsDir(params);
    if (!existsSync(dir)) return { stateDir: dir, runs: [] };
    const runs = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const s = JSON.parse(readFileSync(join(dir, f), 'utf8'));
        return {
          runId: s.runId,
          file: s.file,
          scenario: s.scenario ?? null,
          completedTasks: s.completions.length,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        };
      });
    return { stateDir: dir, runs };
  }
};

// -- JSON-RPC plumbing -------------------------------------------------------

export async function handleRequest(request) {
  const id = request?.id ?? null;
  if (!request || typeof request.method !== 'string') {
    return { jsonrpc: '2.0', id, error: { code: -32600, message: 'invalid request' } };
  }
  const method = methods[request.method];
  if (!method) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `unknown method ${request.method}`,
        data: { methods: Object.keys(methods) }
      }
    };
  }
  try {
    return { jsonrpc: '2.0', id, result: await method(request.params) };
  } catch (err) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: err instanceof RpcError ? err.code : -32603,
        message: err.message,
        ...(err instanceof RpcError && err.data !== undefined ? { data: err.data } : {})
      }
    };
  }
}

const USAGE = `bsf-agent — drive a BPMN workflow's agent tasks over JSON-RPC.

Tasks carrying <bsf:instructions> are yours to perform: fetch the next one,
do what its instructions say, and complete it with the payload fields you
produced. Everything else in the workflow (scripts, mocks, gateways, joins)
executes automatically. State persists in .bsf-runs/ (override with
BSF_RUNS_DIR or params.stateDir), so runs survive process exits.

  bsf-agent <method> ['<params-json>']   one request; JSON-RPC response on stdout
  bsf-agent rpc '<request-json>'         full JSON-RPC request object
  bsf-agent serve                        line-delimited JSON-RPC on stdin/stdout

Methods:
  start    {file, scenario?, payload?, runId?, stateDir?}  begin a run (defaults to the file's first scenario)
  next     {runId}    the next pending agent task {taskId, name, instructions, payload}, or finished + results
  complete {runId, taskId, result}   merge your result (object) into the payload and advance the run
  status   {runId}    full run status: pending tasks, completed tasks, errors, results
  trace    {runId}    the step-by-step execution log with payload snapshots
  list     {stateDir?}   runs in the state directory

Typical loop: start → next → (do the work) → complete → next → … until finished.`;

export async function main(argv, { stdout = process.stdout, stdin = process.stdin } = {}) {
  const [command, ...rest] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    stdout.write(USAGE + '\n');
    return 0;
  }

  const respond = (response) => stdout.write(JSON.stringify(response) + '\n');

  if (command === 'serve') {
    const rl = createInterface({ input: stdin, terminal: false });
    for await (const line of rl) {
      if (!line.trim()) continue;
      let request;
      try {
        request = JSON.parse(line);
      } catch {
        respond({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
        continue;
      }
      respond(await handleRequest(request));
    }
    return 0;
  }

  let request;
  try {
    request =
      command === 'rpc'
        ? JSON.parse(rest[0] ?? '')
        : { jsonrpc: '2.0', id: 1, method: command, params: rest[0] ? JSON.parse(rest[0]) : {} };
  } catch {
    respond({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
    return 1;
  }
  const response = await handleRequest(request);
  respond(response);
  return response.error ? 1 : 0;
}
