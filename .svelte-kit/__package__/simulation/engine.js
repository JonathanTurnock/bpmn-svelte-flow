const FLOW_KINDS = new Set(['sequence-flow', 'default-flow', 'conditional-flow']);
const GATEWAY_TYPES = new Set([
    'bpmn:ExclusiveGateway',
    'bpmn:ParallelGateway',
    'bpmn:InclusiveGateway',
    'bpmn:ComplexGateway',
    'bpmn:EventBasedGateway'
]);
const END_TYPES = new Set(['bpmn:EndEvent']);
function isStart(node) {
    return node.data.element === 'bpmn:StartEvent';
}
function clone(value) {
    return typeof structuredClone === 'function'
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value ?? {}));
}
export class BpmnSimulation {
    graph;
    state;
    nodesById = new Map();
    outgoing = new Map();
    incoming = new Map();
    boundaryByHost = new Map();
    scripts;
    initialPayload;
    nextTokenId = 1;
    /** parallel/inclusive join bookkeeping: gateway id → edge ids arrived. */
    joinArrivals = new Map();
    /** Edge traversals of the most recent step (for animation). */
    lastTraversals = [];
    constructor(graph, options = {}) {
        this.graph = graph;
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
            if (!FLOW_KINDS.has(edge.data?.kind ?? ''))
                continue;
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
    setScript(elementId, source) {
        if (source.trim())
            this.scripts[elementId] = source;
        else
            delete this.scripts[elementId];
    }
    getScript(elementId) {
        return this.scripts[elementId] ?? '';
    }
    get allScripts() {
        return { ...this.scripts };
    }
    setInitialPayload(payload) {
        this.initialPayload = clone(payload);
    }
    reset() {
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
        const insideContainer = (n) => containers.some((c) => n.position.x >= c.position.x &&
            n.position.y >= c.position.y &&
            n.position.x <= c.position.x + (c.width ?? 0) &&
            n.position.y <= c.position.y + (c.height ?? 0));
        for (const node of this.graph.nodes) {
            if (!isStart(node) || node.data.attachedTo || insideContainer(node))
                continue;
            const token = {
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
    step() {
        const s = this.state;
        this.lastTraversals = [];
        if (s.finished)
            return [];
        s.stepCount += 1;
        const tokens = [...s.tokens];
        for (const token of tokens) {
            if (!s.tokens.includes(token))
                continue; // consumed by a join this step
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
    run(maxSteps = 200) {
        let i = 0;
        while (!this.state.finished && i++ < maxSteps)
            this.step();
    }
    // ----- internals ---------------------------------------------------------
    advance(token) {
        const node = this.nodesById.get(token.at);
        if (!node)
            return this.consume(token);
        const type = node.data.element;
        // A token parked at a join that hasn't fired yet stays put.
        const arrivals = this.joinArrivals.get(token.at);
        if (arrivals && [...arrivals.values()].includes(token))
            return;
        if (END_TYPES.has(type)) {
            this.log(node, `token #${token.id} consumed`, 'end', token.payload);
            return this.consume(token);
        }
        let edges;
        if (GATEWAY_TYPES.has(type)) {
            edges = this.routeGateway(node, token);
        }
        else {
            // activity / event: run the attachment, then follow every outgoing flow
            const outcome = this.runScript(node, token, 'activity');
            if (outcome === 'boundary')
                return; // token re-routed by a thrown error
            edges = this.outgoing.get(node.id) ?? [];
        }
        if (edges.length === 0) {
            this.log(node, `token #${token.id} stuck — no outgoing sequence flow`, 'error');
            return this.consume(token);
        }
        // First edge continues this token; extra edges fork new tokens.
        this.moveAlong(token, edges[0]);
        for (const edge of edges.slice(1)) {
            const fork = {
                id: this.nextTokenId++,
                at: node.id,
                payload: clone(token.payload)
            };
            this.state.tokens.push(fork);
            this.moveAlong(fork, edge);
        }
    }
    moveAlong(token, edge) {
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
        if (!target)
            return;
        const type = target.data.element;
        // Joining gateways: hold the token until every incoming flow has arrived.
        if (type === 'bpmn:ParallelGateway' || type === 'bpmn:InclusiveGateway') {
            const incoming = this.incoming.get(target.id) ?? [];
            if (incoming.length > 1) {
                const arrivals = this.joinArrivals.get(target.id) ?? new Map();
                arrivals.set(edge.id, token);
                this.joinArrivals.set(target.id, arrivals);
                const required = type === 'bpmn:ParallelGateway'
                    ? incoming.length
                    : Math.min(incoming.length, arrivals.size + this.pendingUpstream(target.id));
                if (arrivals.size < required) {
                    this.log(target, `token #${token.id} waiting at join (${arrivals.size}/${incoming.length})`, 'info');
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
    pendingUpstream(gatewayId) {
        return this.state.tokens.filter((t) => t.at !== gatewayId).length;
    }
    routeGateway(node, token) {
        const outgoing = this.outgoing.get(node.id) ?? [];
        if (outgoing.length <= 1)
            return outgoing;
        const type = node.data.element;
        if (type === 'bpmn:ParallelGateway')
            return outgoing;
        const result = this.runScript(node, token, 'gateway');
        const byIdOrName = (key) => outgoing.find((e) => e.id === key || (e.data?.label && e.data.label === key));
        if (type === 'bpmn:InclusiveGateway' || type === 'bpmn:ComplexGateway') {
            if (Array.isArray(result)) {
                const chosen = result.map(byIdOrName).filter((e) => !!e);
                if (chosen.length > 0)
                    return chosen;
            }
            else if (result !== undefined) {
                const one = byIdOrName(result);
                if (one)
                    return [one];
            }
            const def = outgoing.find((e) => e.data?.kind === 'default-flow');
            return def ? [def] : outgoing;
        }
        // exclusive / event-based: one path
        if (result !== undefined) {
            const one = byIdOrName(result);
            if (one)
                return [one];
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
    runScript(node, token, context) {
        const source = this.scripts[node.id];
        if (!source)
            return undefined;
        try {
            const fn = new Function('payload', 'element', source);
            const result = fn(token.payload, { id: node.id, type: node.data.element, name: node.data.label });
            if (context !== 'gateway' && result && typeof result === 'object') {
                token.payload = result;
            }
            this.log(node, 'script ran', 'script', token.payload);
            return result ?? undefined;
        }
        catch (err) {
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
    consume(token) {
        const i = this.state.tokens.indexOf(token);
        if (i >= 0)
            this.state.tokens.splice(i, 1);
    }
    log(node, message, kind, payload) {
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
