import BpmnSimulator from '../lib/components/BpmnSimulator.svelte';

// Executable workflow files: the JavaScript code blocks (`bsf:script`) and the
// workflow tests (`bsf:test`) live inside the .bpmn documents themselves, so
// these stories pass nothing but the file and an initial payload. Use the
// "Workflow tests" panel on the right to run the tests shipped in the file.
import executableClaims from './fixtures/executable-claims.bpmn?raw';
import executableParallel from './fixtures/executable-parallel.bpmn?raw';

export default {
  title: 'BPMN Files/Executable',
  component: BpmnSimulator,
  args: {
    height: '100vh'
  }
};

/** `executable-claims.bpmn` — payload-driven exclusive routing with four embedded workflow tests. */
export const ExecutableClaims = {
  args: {
    xml: executableClaims,
    height: '100vh',
    payload: { amount: 5200 }
  }
};

/** `executable-parallel.bpmn` — parallel fork/join plus an error boundary fed by a throwing script. */
export const ExecutableParallel = {
  args: {
    xml: executableParallel,
    height: '100vh',
    payload: { card: 'expired' }
  }
};
