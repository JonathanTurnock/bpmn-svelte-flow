import type { BpmnFlowGraph, BpmnWorkflowTest } from '../types.js';
/**
 * Workflow tests are JavaScript blocks embedded in the BPMN file:
 *
 * ```xml
 * <bpmn:process id="Process_1">
 *   <bpmn:extensionElements>
 *     <bsf:test name="large claims go to review" payload='{"amount": 5200}'>
 *       assert(state.visited.has('Task_Manual'), 'manual review reached');
 *       assert.equal(payload.approvedBy, 'supervisor');
 *     </bsf:test>
 *   </bpmn:extensionElements>
 *   …
 * ```
 *
 * Each test runs a fresh headless simulation to completion, then executes the
 * script body with:
 *  - `state`    — the final {@link SimulationState} (visited/traversedEdges are Sets)
 *  - `payloads` — final payloads of every token consumed at an end event
 *  - `payload`  — shorthand for `payloads[0]`
 *  - `assert(cond, msg?)` / `assert.equal(actual, expected, msg?)`
 */
export interface BpmnTestResult {
    name: string;
    passed: boolean;
    /** Failure message when not passed. */
    error?: string;
    /** Steps the simulation ran before the assertions executed. */
    steps: number;
}
/**
 * Runs the given workflow tests (typically `graph.tests`, parsed out of the
 * BPMN file) against the graph. Node scripts embedded in the file run as part
 * of each simulation; `options.scripts` overrides them per element id.
 */
export declare function runWorkflowTests(graph: Pick<BpmnFlowGraph, 'nodes' | 'edges'>, tests: BpmnWorkflowTest[], options?: {
    scripts?: Record<string, string>;
    maxSteps?: number;
}): BpmnTestResult[];
