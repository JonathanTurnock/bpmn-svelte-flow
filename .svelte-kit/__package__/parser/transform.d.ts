import type { BpmnFlowGraph } from '../types.js';
/**
 * Transforms a parsed bpmn:Definitions tree into Svelte Flow nodes and edges,
 * using the BPMN DI (diagram interchange) for geometry.
 */
export declare function bpmnToFlow(definitions: any, options?: {
    diagramId?: string;
}): BpmnFlowGraph;
