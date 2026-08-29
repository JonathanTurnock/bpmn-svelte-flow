import type { Node, Edge } from '@xyflow/svelte';

/** Simple point used for edge waypoints. */
export interface Point {
  x: number;
  y: number;
}

/** DI bounds rectangle (absolute diagram coordinates). */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Kinds of BPMN events, derived from the semantic element + DI. */
export type EventKind =
  | 'start'
  | 'intermediate-throw'
  | 'intermediate-catch'
  | 'boundary'
  | 'end';

/** Gateway variants. */
export type GatewayKind =
  | 'exclusive'
  | 'parallel'
  | 'inclusive'
  | 'complex'
  | 'event-based'
  | 'event-based-parallel'
  | 'event-based-exclusive';

/** Marker glyphs drawn at the bottom-center of activities. */
export type ActivityMarker =
  | 'sub-process'
  | 'loop'
  | 'parallel-mi'
  | 'sequential-mi'
  | 'compensation'
  | 'ad-hoc';

/**
 * Data payload attached to every BPMN node. `element` is always the moddle
 * `$type` (e.g. `bpmn:UserTask`); the remaining fields are populated where
 * they apply to that element family.
 */
export interface BpmnNodeData extends Record<string, unknown> {
  /** Moddle $type, e.g. 'bpmn:UserTask'. */
  element: string;
  /** The element's name attribute (label text). */
  label?: string;
  width: number;
  height: number;

  // ----- events -----
  eventKind?: EventKind;
  /** Event definition $types, e.g. ['bpmn:MessageEventDefinition']. */
  eventDefinitions?: string[];
  /** false renders a dashed border (non-interrupting start / boundary event). */
  interrupting?: boolean;
  parallelMultiple?: boolean;
  /** For boundary events: id of the activity the event is attached to. */
  attachedTo?: string;

  // ----- activities -----
  /** e.g. 'bpmn:UserTask' → user glyph; also set for call activities. */
  taskType?: string;
  markers?: ActivityMarker[];
  /** Expanded sub-processes render as containers. */
  isExpanded?: boolean;
  /** Event sub-process → dotted border. */
  triggeredByEvent?: boolean;
  /** bpmn:Transaction → double border. */
  isTransaction?: boolean;
  /** bpmn:CallActivity → thick border. */
  isCall?: boolean;

  // ----- gateways -----
  gatewayKind?: GatewayKind;

  // ----- pools & lanes -----
  isHorizontal?: boolean;
  /** Pool with no processRef / black-box. */
  isEmptyPool?: boolean;
  /** Multi-instance participant marker. */
  participantMultiplicity?: boolean;

  // ----- choreography -----
  /** Participant bands for choreography activities. */
  participants?: Array<{
    id: string;
    name?: string;
    initiating: boolean;
    multiplicity: boolean;
  }>;

  // ----- data elements -----
  isCollection?: boolean;
  dataKind?: 'object' | 'input' | 'output' | 'store' | 'reference';

  /**
   * DI label bounds, translated to be relative to the node's top-left corner.
   * Components use it to place external labels (events, gateways, data, …).
   */
  labelBounds?: Bounds;

  /**
   * JavaScript block attached to the element in the workflow file via
   * `<bsf:script>` inside `<bpmn:extensionElements>`. Used by the simulator.
   */
  script?: string;
}

/**
 * A test embedded in the workflow file via `<bsf:test>` inside the process's
 * (or definitions') `<bpmn:extensionElements>`. The script body runs after a
 * headless simulation and asserts on the outcome.
 */
export interface BpmnWorkflowTest {
  name: string;
  /** Initial payload for the test run (the element's `payload` attribute, JSON). */
  payload?: Record<string, unknown>;
  /** JavaScript body run with (state, payloads, payload, assert). */
  script: string;
}

/** BPMN connecting object kinds. */
export type BpmnEdgeKind =
  | 'sequence-flow'
  | 'default-flow'
  | 'conditional-flow'
  | 'message-flow'
  | 'conversation-link'
  | 'association'
  | 'data-association';

/** Data payload attached to every BPMN edge. */
export interface BpmnEdgeData extends Record<string, unknown> {
  /** Moddle $type, e.g. 'bpmn:SequenceFlow'. */
  element: string;
  kind: BpmnEdgeKind;
  label?: string;
  /** Absolute DI waypoints for the connection. */
  waypoints: Point[];
  /** Association directionality: 'None' | 'One' | 'Both'. */
  associationDirection?: 'None' | 'One' | 'Both';
  /** Absolute DI label bounds (if present in the diagram interchange). */
  labelBounds?: Bounds;
}

export type BpmnFlowNode = Node<BpmnNodeData>;
export type BpmnFlowEdge = Edge<BpmnEdgeData>;

/** Result of transforming a BPMN definitions tree into Svelte Flow graph data. */
export interface BpmnFlowGraph {
  nodes: BpmnFlowNode[];
  edges: BpmnFlowEdge[];
  /** Warnings raised during import (unknown elements, missing DI, …). */
  warnings: string[];
  /** Workflow tests embedded in the file via bsf:test extension elements. */
  tests: BpmnWorkflowTest[];
  /** Default initial simulation payload declared by the document (JSON format). */
  initialPayload?: Record<string, unknown>;
}
