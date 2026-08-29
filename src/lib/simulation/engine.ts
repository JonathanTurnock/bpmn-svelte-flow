import type { BpmnFlowEdge, BpmnFlowGraph, BpmnFlowNode } from '../types.js';

/**
 * Token-flow simulation over a rendered BPMN graph.
 *
 * Instead of implementing an expression language (FEEL/JUEL), behaviour is
 * attached to nodes as small JavaScript snippets ("attachment boxes"):
 *
 *  - On an **activity or event**, the script may inspect and mutate `payload`,
 *    or `return` a replacement payload. Throwing inside an activity script
 *    routes the token to an attached error boundary event, if there is one.
 *  - On an **exclusive / event-based gateway**, the script returns the id or
 *    name of the outgoing sequence flow to take. Without a script (or when
 *    nothing matches) the default flow is taken, else the first outgoing flow.
 *  - On an **inclusive gateway**, the script returns an array of flow
 *    ids/names. Fallbacks: default flow, else all outgoing flows.
 *  - **Parallel gateways** ignore scripts for routing: they fork every
 *    outgoing flow and join by waiting for a token on every incoming flow.
 *
 * Scripts run via `new Function('payload', 'element', body)` in the host
 * page — they are the diagram author's own code, exactly like an `onclick`.
 */

export interface SimulationLogEntry {
  step: number;
  elementId: string;
  elementName?: string;
  message: string;
  kind: 'move' | 'script' | 'error' | 'end' | 'info';
  payload?: unknown;
}

export interface SimulationToken {
  id: number;
  /** Element the token currently sits on. */
  at: string;
  payload: Record<string, unknown>;
}

/** Edge traversal performed during one step (used for animation). */
export interface SimulationTraversal {
  edgeId: string;
  tokenId: number;
  from: string;
  to: string;
}

export interface SimulationState {
  tokens: SimulationToken[];
  /** Elements a token currently sits on. */
  active: Set<string>;
  /** Elements any token has passed through. */
  visited: Set<string>;
  /** Sequence flows any token has traversed. */
  traversedEdges: Set<string>;
  log: SimulationLogEntry[];
  finished: boolean;
  stepCount: number;
}

export interface SimulationOptions {
  /** elementId → JavaScript attachment source. */
  scripts?: Record<string, string>;
  /** Initial payload injected at start events. */
  payload?: Record<string, unknown>;
}

const FLOW_KINDS = new Set(['sequence-flow', 'default-flow', 'conditional-flow']);

const GATEWAY_TYPES = new Set([
  'bpmn:ExclusiveGateway',
  'bpmn:ParallelGateway',
  'bpmn:InclusiveGateway',
  'bpmn:ComplexGateway',
  'bpmn:EventBasedGateway'
]);

const END_TYPES = new Set(['bpmn:EndEvent']);

function isStart(node: BpmnFlowNode): boolean {
  return node.data.element === 'bpmn:StartEvent';
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value ?? {}));
}

export class BpmnSimulation {
  readonly state: SimulationState;

  private nodesById = new Map<string, BpmnFlowNode>();
  private outgoing = new Map<string, BpmnFlowEdge[]>();
  private incoming = new Map<string, BpmnFlowEdge[]>();
  private boundaryByHost = new Map<string, BpmnFlowNode[]>();
  private scripts: Record<string, string>;
  private initialPayload: Record<string, unknown>;
  private nextTokenId = 1;
  /** parallel/inclusive join bookkeeping: gateway id → edge ids arrived. */
  private joinArrivals = new Map<string, Map<string, SimulationToken>>();
  /** Edge traversals of the most recent step (for animation). */
  lastTraversals: SimulationTraversal[] = [];

  constructor(
    private graph: Pick<BpmnFlowGraph, 'nodes' | 'edges'>,
    options: SimulationOptions = {}
  ) {
    this.scripts = { ...(options.scripts ?? {}) };
    this.initialPayload = clone(options.payload ?? {});
    for (const node of graph.nodes) {
      this.nodesById.set(node.id, node);
      const host = node.data.attachedTo;
      if (host) {
        const list = this.boundaryByHost.get(host) ?? [];
        list.push(node);
        this.boundaryByHost.set(host, list);
      }
    }
    for (const edge of graph.edges) {
      if (!FLOW_KINDS.has(edge.data?.kind ?? '')) continue;
      const out = this.outgoing.get(edge.source) ?? [];
      out.push(edge);
      this.outgoing.set(edge.source, out);
      const inc = this.incoming.get(edge.target) ?? [];
      inc.push(edge);
      this.incoming.set(edge.target, inc);
    }
    this.state = {
      tokens: [],
      active: new Set(),
      visited: new Set(),
      traversedEdges: new Set(),
      log: [],
      finished: false,
      stepCount: 0
    };
    this.reset();
  }

  setScript(elementId: string, source: string): void {
    if (source.trim()) this.scripts[elementId] = source;
    else delete this.scripts[elementId];
  }

  getScript(elementId: string): string {
    return this.scripts[elementId] ?? '';
  }

  get allScripts(): Record<string, string> {
    return { ...this.scripts };
  }

  setInitialPayload(payload: Record<string, unknown>): void {
    this.initialPayload = clone(payload);
  }

  reset(): void {
    const s = this.state;
    s.tokens = [];
    s.active.clear();
    s.visited.clear();
    s.traversedEdges.clear();
    s.log = [];
    s.finished = false;
    s.stepCount = 0;
    this.joinArrivals.clear();
    this.lastTraversals = [];
    this.nextTokenId = 1;

    // Seed a token on every top-level start event (boundary events and event
    // sub-process starts never seed; sub-process internals are opaque in v1,
    // which we approximate by skipping start events that sit inside an
    // expanded container's bounds).
    const containers = this.graph.nodes.filter((n) => n.type === 'bpmn-subprocess');
    const insideContainer = (n: BpmnFlowNode) =>
      containers.some(
        (c) =>
          n.position.x >= c.position.x &&
          n.position.y >= c.position.y &&
          n.position.x <= c.position.x + (c.width ?? 0) &&
          n.position.y <= c.position.y + (c.height ?? 0)
      );

    for (const node of this.graph.nodes) {
      if (!isStart(node) || node.data.attachedTo || insideContainer(node)) continue;
      const token: SimulationToken = {
        id: this.nextTokenId++,
        at: node.id,
        payload: clone(this.initialPayload)
      };
      this.runScript(node, token, 'event');
      s.tokens.push(token);
      s.active.add(node.id);
      s.visited.add(node.id);
      this.log(node, `token #${token.id} created`, 'info', token.payload);
    }
    if (s.tokens.length === 0) {
      s.finished = true;
      s.log.push({
        step: 0,
        elementId: '',
        message: 'No start event found — nothing to simulate',
        kind: 'info'
      });
    }
  }

  /** Advances every live token by one hop. Returns the traversals performed. */
  step(): SimulationTraversal[] {
    const s = this.state;
    this.lastTraversals = [];
    if (s.finished) return [];
    s.stepCount += 1;

    const tokens = [...s.tokens];
    for (const token of tokens) {
      if (!s.tokens.includes(token)) continue; // consumed by a join this step
      this.advance(token);
    }

    s.active = new Set(s.tokens.map((t) => t.at));
    if (s.tokens.length === 0) {
      s.finished = true;
      s.log.push({
        step: s.stepCount,
        elementId: '',
        message: 'Simulation finished — all tokens consumed',
        kind: 'end'
      });
    }
    return this.lastTraversals;
  }

  /** Runs until finished (bounded to avoid infinite loops). */
  run(maxSteps = 200): void {
    let i = 0;
    while (!this.state.finished && i++ < maxSteps) this.step();
  }

  // ----- internals ---------------------------------------------------------

  private advance(token: SimulationToken): void {
    const node = this.nodesById.get(token.at);
    if (!node) return this.consume(token);
    const type = node.data.element;

    // A token parked at a join that hasn't fired yet stays put.
    const arrivals = this.joinArrivals.get(token.at);
    if (arrivals && [...arrivals.values()].includes(token)) return;

    if (END_TYPES.has(type)) {
      this.log(node, `token #${token.id} consumed`, 'end', token.payload);
      return this.consume(token);
    }

    let edges: BpmnFlowEdge[];
    if (GATEWAY_TYPES.has(type)) {
      edges = this.routeGateway(node, token);
    } else {
      // activity / event: run the attachment, then follow every outgoing flow
      const outcome = this.runScript(node, token, 'activity');
      if (outcome === 'boundary') return; // token re-routed by a thrown error
      edges = this.outgoing.get(node.id) ?? [];
    }

    if (edges.length === 0) {
      this.log(node, `token #${token.id} stuck — no outgoing sequence flow`, 'error');
      return this.consume(token);
    }

    // First edge continues this token; extra edges fork new tokens.
    this.moveAlong(token, edges[0]);
    for (const edge of edges.slice(1)) {
      const fork: SimulationToken = {
        id: this.nextTokenId++,
        at: node.id,
        payload: clone(token.payload)
      };
      this.state.tokens.push(fork);
      this.moveAlong(fork, edge);
    }
  }

  private moveAlong(token: SimulationToken, edge: BpmnFlowEdge): void {
    token.at = edge.target;
    this.state.traversedEdges.add(edge.id);
    this.state.visited.add(edge.target);
    this.lastTraversals.push({
      edgeId: edge.id,
      tokenId: token.id,
      from: edge.source,
      to: edge.target
    });

    const target = this.nodesById.get(edge.target);
    if (!target) return;
    const type = target.data.element;

    // Joining gateways: hold the token until every incoming flow has arrived.
    if (type === 'bpmn:ParallelGateway' || type === 'bpmn:InclusiveGateway') {
      const incoming = this.incoming.get(target.id) ?? [];
      if (incoming.length > 1) {
        const arrivals = this.joinArrivals.get(target.id) ?? new Map();
        arrivals.set(edge.id, token);
        this.joinArrivals.set(target.id, arrivals);
        const required =
          type === 'bpmn:ParallelGateway'
            ? incoming.length
            : Math.min(incoming.length, arrivals.size + this.pendingUpstream(target.id));
        if (arrivals.size < required) {
          this.log(
            target,
            `token #${token.id} waiting at join (${arrivals.size}/${incoming.length})`,
            'info'
          );
          // token parks on the gateway; remove all but one arrival later
          return;
        }
        // Join fires: merge payloads into the first arrival, drop the rest.
        const arrived = [...arrivals.values()];
        const survivor = arrived[0];
        for (const other of arrived.slice(1)) {
          Object.assign(survivor.payload, other.payload);
          this.consume(other);
        }
        survivor.at = target.id;
        this.joinArrivals.delete(target.id);
        this.log(target, `join fired, tokens merged into #${survivor.id}`, 'info', survivor.payload);
      }
    }
  }

  /** Count live tokens that could still reach the given join (rough heuristic). */
  private pendingUpstream(gatewayId: string): number {
    return this.state.tokens.filter((t) => t.at !== gatewayId).length;
  }

  private routeGateway(node: BpmnFlowNode, token: SimulationToken): BpmnFlowEdge[] {
    const outgoing = this.outgoing.get(node.id) ?? [];
    if (outgoing.length <= 1) return outgoing;
    const type = node.data.element;

    if (type === 'bpmn:ParallelGateway') return outgoing;

    const result = this.runScript(node, token, 'gateway');
    const byIdOrName = (key: unknown) =>
      outgoing.find((e) => e.id === key || (e.data?.label && e.data.label === key));

    if (type === 'bpmn:InclusiveGateway' || type === 'bpmn:ComplexGateway') {
      if (Array.isArray(result)) {
        const chosen = result.map(byIdOrName).filter((e): e is BpmnFlowEdge => !!e);
        if (chosen.length > 0) return chosen;
      } else if (result !== undefined) {
        const one = byIdOrName(result);
        if (one) return [one];
      }
      const def = outgoing.find((e) => e.data?.kind === 'default-flow');
      return def ? [def] : outgoing;
    }

    // exclusive / event-based: one path
    if (result !== undefined) {
      const one = byIdOrName(result);
      if (one) return [one];
      this.log(node, `script chose "${String(result)}" but no such flow — using fallback`, 'error');
    }
    const def = outgoing.find((e) => e.data?.kind === 'default-flow');
    return [def ?? outgoing[0]];
  }

  /**
   * Executes an element's JavaScript attachment.
   * Returns the script's return value, or 'boundary' when a thrown error was
   * re-routed to an attached boundary event.
   */
  private runScript(
    node: BpmnFlowNode,
    token: SimulationToken,
    context: 'activity' | 'gateway' | 'event'
  ): unknown | 'boundary' {
    const source = this.scripts[node.id];
    if (!source) return undefined;
    try {
      const fn = new Function('payload', 'element', source);
      const result = fn(token.payload, { id: node.id, type: node.data.element, name: node.data.label });
      if (context !== 'gateway' && result && typeof result === 'object') {
        token.payload = result as Record<string, unknown>;
      }
      this.log(node, 'script ran', 'script', token.payload);
      return result ?? undefined;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const boundary = (this.boundaryByHost.get(node.id) ?? [])[0];
      if (context === 'activity' && boundary) {
        this.log(node, `script threw (${message}) → boundary event`, 'error');
        token.at = boundary.id;
        this.state.visited.add(boundary.id);
        this.lastTraversals.push({
          edgeId: `${node.id}→${boundary.id}`,
          tokenId: token.id,
          from: node.id,
          to: boundary.id
        });
        return 'boundary';
      }
      this.log(node, `script error: ${message}`, 'error');
      return undefined;
    }
  }

  private consume(token: SimulationToken): void {
    const i = this.state.tokens.indexOf(token);
    if (i >= 0) this.state.tokens.splice(i, 1);
  }

  private log(
    node: BpmnFlowNode,
    message: string,
    kind: SimulationLogEntry['kind'],
    payload?: unknown
  ): void {
    this.state.log.push({
      step: this.state.stepCount,
      elementId: node.id,
      elementName: node.data.label,
      message,
      kind,
      payload: payload !== undefined ? clone(payload) : undefined
    });
  }
}
