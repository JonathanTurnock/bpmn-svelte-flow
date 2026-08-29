import { BpmnSimulation } from './engine.js';
function makeAssert() {
    const assert = ((condition, message) => {
        if (!condition)
            throw new Error(message ?? 'assertion failed');
    });
    assert.equal = (actual, expected, message) => {
        if (actual !== expected) {
            throw new Error(message ?? `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    };
    return assert;
}
/**
 * Runs the given workflow tests (typically `graph.tests`, parsed out of the
 * BPMN file) against the graph. Node scripts embedded in the file run as part
 * of each simulation; `options.scripts` overrides them per element id.
 */
export function runWorkflowTests(graph, tests, options = {}) {
    return tests.map((test) => {
        let sim;
        try {
            sim = new BpmnSimulation(graph, { scripts: options.scripts, payload: test.payload });
            sim.run(options.maxSteps ?? 200);
            const payloads = sim.state.results.map((r) => r.payload);
            const fn = new Function('state', 'payloads', 'payload', 'assert', test.script);
            fn(sim.state, payloads, payloads[0] ?? {}, makeAssert());
            return { name: test.name, passed: true, steps: sim.state.stepCount };
        }
        catch (err) {
            return {
                name: test.name,
                passed: false,
                error: err instanceof Error ? err.message : String(err),
                steps: sim?.state.stepCount ?? 0
            };
        }
    });
}
