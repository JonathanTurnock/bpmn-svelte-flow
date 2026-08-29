import type { BpmnFlowGraph, BpmnWorkflowTest } from '../types.js';
import { BpmnSimulation, type SimulationState } from './engine.js';

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

interface WorkflowAssert {
  (condition: unknown, message?: string): void;
  equal(actual: unknown, expected: unknown, message?: string): void;
}

function makeAssert(): WorkflowAssert {
  const assert = ((condition: unknown, message?: string) => {
    if (!condition) throw new Error(message ?? 'assertion failed');
  }) as WorkflowAssert;
  assert.equal = (actual: unknown, expected: unknown, message?: string) => {
    if (actual !== expected) {
      throw new Error(
        message ?? `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  };
  return assert;
}

/**
 * Runs the given workflow tests (typically `graph.tests`, parsed out of the
 * BPMN file) against the graph. Node scripts embedded in the file run as part
 * of each simulation; `options.scripts` overrides them per element id.
 */
export function runWorkflowTests(
  graph: Pick<BpmnFlowGraph, 'nodes' | 'edges'>,
  tests: BpmnWorkflowTest[],
  options: { scripts?: Record<string, string>; maxSteps?: number } = {}
): BpmnTestResult[] {
  return tests.map((test) => {
    let sim: BpmnSimulation | undefined;
    try {
      sim = new BpmnSimulation(graph, { scripts: options.scripts, payload: test.payload });
      sim.run(options.maxSteps ?? 200);
      const payloads = sim.state.results.map((r) => r.payload);
      const fn = new Function('state', 'payloads', 'payload', 'assert', test.script);
      fn(sim.state, payloads, payloads[0] ?? {}, makeAssert());
      return { name: test.name, passed: true, steps: sim.state.stepCount };
    } catch (err) {
      return {
        name: test.name,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
        steps: sim?.state.stepCount ?? 0
      };
    }
  });
}
