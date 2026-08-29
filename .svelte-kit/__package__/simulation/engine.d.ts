import type { BpmnFlowGraph } from '../types.js';
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
/** Payload of a token consumed at an end event. */
export interface SimulationResult {
    tokenId: number;
    /** The end event the token was consumed at. */
    elementId: string;
    payload: Record<string, unknown>;
}
export interface SimulationState {
    tokens: SimulationToken[];
    /** Elements a token currently sits on. */
    active: Set<string>;
    /** Elements any token has passed through. */
    visited: Set<string>;
    /** Sequence flows any token has traversed. */
    traversedEdges: Set<string>;
    /** Payloads of tokens consumed at end events, in order of consumption. */
    results: SimulationResult[];
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
export declare class BpmnSimulation {
    private graph;
    readonly state: SimulationState;
    private nodesById;
    private outgoing;
    private incoming;
    private boundaryByHost;
    private scripts;
    private initialPayload;
    private nextTokenId;
    /** parallel/inclusive join bookkeeping: gateway id → edge ids arrived. */
    private joinArrivals;
    /** Edge traversals of the most recent step (for animation). */
    lastTraversals: SimulationTraversal[];
    constructor(graph: Pick<BpmnFlowGraph, 'nodes' | 'edges'>, options?: SimulationOptions);
    setScript(elementId: string, source: string): void;
    getScript(elementId: string): string;
    get allScripts(): Record<string, string>;
    setInitialPayload(payload: Record<string, unknown>): void;
    reset(): void;
    /** Advances every live token by one hop. Returns the traversals performed. */
    step(): SimulationTraversal[];
    /** Runs until finished (bounded to avoid infinite loops). */
    run(maxSteps?: number): void;
    private advance;
    private moveAlong;
    /** Count live tokens that could still reach the given join (rough heuristic). */
    private pendingUpstream;
    private routeGateway;
    /**
     * Executes an element's JavaScript attachment.
     * Returns the script's return value, or 'boundary' when a thrown error was
     * re-routed to an attached boundary event.
     */
    private runScript;
    private consume;
    private log;
}
