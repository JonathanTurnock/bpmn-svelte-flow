// Svelte-free entry point (`bpmn-svelte-flow/headless`): everything needed to
// parse documents, build graphs, and run simulations/workflow tests in plain
// Node or any non-Svelte host — CI runners, CLIs, servers.

export { parseBpmn, type ParseResult } from './parser/parse.js';
export { bpmnToFlow } from './parser/transform.js';
export { jsonToFlow, type BpmnJsonDocument, type BpmnJsonEdge, type BpmnJsonNode } from './parser/json.js';
export { loadDefinition } from './parser/load.js';

export {
  BpmnSimulation,
  type SimulationLogEntry,
  type SimulationOptions,
  type SimulationResult,
  type SimulationState,
  type SimulationToken,
  type SimulationTraversal
} from './simulation/engine.js';
export { runWorkflowTests, type BpmnTestResult } from './simulation/testing.js';

export type {
  ActivityMarker,
  Bounds,
  BpmnEdgeData,
  BpmnEdgeKind,
  BpmnFlowEdge,
  BpmnFlowGraph,
  BpmnFlowNode,
  BpmnNodeData,
  BpmnWorkflowTest,
  EventKind,
  GatewayKind,
  Point
} from './types.js';
