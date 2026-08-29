import type {
  ActivityMarker,
  BpmnEdgeKind,
  BpmnFlowEdge,
  BpmnFlowGraph,
  BpmnFlowNode,
  BpmnNodeData,
  BpmnWorkflowTest,
  Point
} from '../types.js';

/**
 * A friendly JSON authoring format for diagrams: shapes get sensible default
 * sizes and edges are auto-routed between node borders when waypoints are
 * omitted, so documents stay terse:
 *
 * ```json
 * {
 *   "payload": { "amount": 5200 },
 *   "tests": [{ "name": "settles", "script": "assert(state.finished);" }],
 *   "nodes": [
 *     { "id": "start", "type": "startEvent", "name": "Received", "x": 100, "y": 100 },
 *     { "id": "score", "type": "userTask", "name": "Score claim", "x": 200, "y": 80,
 *       "script": "payload.risk = payload.amount > 1000 ? 'high' : 'low';" }
 *   ],
 *   "edges": [{ "source": "start", "target": "score" }]
 * }
 * ```
 */
export interface BpmnJsonDocument {
  name?: string;
  /** Default initial payload for simulation. */
  payload?: Record<string, unknown>;
  /** Workflow tests, same contract as bsf:test extension elements. */
  tests?: BpmnWorkflowTest[];
  nodes: BpmnJsonNode[];
  edges?: BpmnJsonEdge[];
}

export interface BpmnJsonNode {
  id: string;
  /** Friendly element type, e.g. 'userTask', 'startEvent', 'pool'. */
  type: string;
  name?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** JavaScript attachment run by the simulator. */
  script?: string;

  // events
  /** e.g. 'message' or ['message', 'timer'] (multiple). */
  eventDefinition?: string | string[];
  interrupting?: boolean;
  /** Boundary events: id of the host activity. */
  attachedTo?: string;
  /** With 2+ event definitions: parallel-multiple marker. */
  parallel?: boolean;

  // activities
  markers?: ActivityMarker[];
  expanded?: boolean;
  triggeredByEvent?: boolean;

  // gateways (event-based variants)
  instantiate?: boolean;

  // pools & lanes
  horizontal?: boolean;
  blackBox?: boolean;
  multiInstance?: boolean;

  // data
  collection?: boolean;

  // annotation
  text?: string;

  // choreography
  participants?: Array<{ id?: string; name?: string; initiating?: boolean; multiplicity?: boolean }>;
}

export interface BpmnJsonEdge {
  id?: string;
  source: string;
  target: string;
  /** 'sequenceFlow' (default) | 'messageFlow' | 'association' | 'dataAssociation' | 'conversationLink'. */
  type?: string;
  label?: string;
  /** Explicit route; auto-routed border-to-border when omitted. */
  waypoints?: Array<[number, number]>;
  /** Sequence flows: render the default-flow slash marker. */
  default?: boolean;
  /** Sequence flows: render the conditional diamond marker. */
  conditional?: boolean;
  /** Associations: 'None' | 'One' | 'Both'. */
  direction?: 'None' | 'One' | 'Both';
}

interface KindSpec {
  nodeType: string;
  element: string;
  width: number;
  height: number;
  zIndex?: number;
}

const NODE_KINDS: Record<string, KindSpec> = {
  startEvent: { nodeType: 'bpmn-event', element: 'bpmn:StartEvent', width: 36, height: 36 },
  endEvent: { nodeType: 'bpmn-event', element: 'bpmn:EndEvent', width: 36, height: 36 },
  intermediateThrowEvent: { nodeType: 'bpmn-event', element: 'bpmn:IntermediateThrowEvent', width: 36, height: 36 },
  intermediateCatchEvent: { nodeType: 'bpmn-event', element: 'bpmn:IntermediateCatchEvent', width: 36, height: 36 },
  boundaryEvent: { nodeType: 'bpmn-event', element: 'bpmn:BoundaryEvent', width: 36, height: 36, zIndex: 30 },

  task: { nodeType: 'bpmn-task', element: 'bpmn:Task', width: 100, height: 80 },
  userTask: { nodeType: 'bpmn-task', element: 'bpmn:UserTask', width: 100, height: 80 },
  serviceTask: { nodeType: 'bpmn-task', element: 'bpmn:ServiceTask', width: 100, height: 80 },
  scriptTask: { nodeType: 'bpmn-task', element: 'bpmn:ScriptTask', width: 100, height: 80 },
  manualTask: { nodeType: 'bpmn-task', element: 'bpmn:ManualTask', width: 100, height: 80 },
  sendTask: { nodeType: 'bpmn-task', element: 'bpmn:SendTask', width: 100, height: 80 },
  receiveTask: { nodeType: 'bpmn-task', element: 'bpmn:ReceiveTask', width: 100, height: 80 },
  businessRuleTask: { nodeType: 'bpmn-task', element: 'bpmn:BusinessRuleTask', width: 100, height: 80 },
  callActivity: { nodeType: 'bpmn-task', element: 'bpmn:CallActivity', width: 100, height: 80 },
  subProcess: { nodeType: 'bpmn-task', element: 'bpmn:SubProcess', width: 100, height: 80 },
  adHocSubProcess: { nodeType: 'bpmn-task', element: 'bpmn:AdHocSubProcess', width: 100, height: 80 },
  transaction: { nodeType: 'bpmn-task', element: 'bpmn:Transaction', width: 100, height: 80 },

  exclusiveGateway: { nodeType: 'bpmn-gateway', element: 'bpmn:ExclusiveGateway', width: 50, height: 50 },
  parallelGateway: { nodeType: 'bpmn-gateway', element: 'bpmn:ParallelGateway', width: 50, height: 50 },
  inclusiveGateway: { nodeType: 'bpmn-gateway', element: 'bpmn:InclusiveGateway', width: 50, height: 50 },
  complexGateway: { nodeType: 'bpmn-gateway', element: 'bpmn:ComplexGateway', width: 50, height: 50 },
  eventBasedGateway: { nodeType: 'bpmn-gateway', element: 'bpmn:EventBasedGateway', width: 50, height: 50 },

  pool: { nodeType: 'bpmn-pool', element: 'bpmn:Participant', width: 600, height: 250, zIndex: -50 },
  lane: { nodeType: 'bpmn-lane', element: 'bpmn:Lane', width: 570, height: 125, zIndex: -40 },

  dataObject: { nodeType: 'bpmn-data-object', element: 'bpmn:DataObjectReference', width: 36, height: 50 },
  dataInput: { nodeType: 'bpmn-data-object', element: 'bpmn:DataInput', width: 36, height: 50 },
  dataOutput: { nodeType: 'bpmn-data-object', element: 'bpmn:DataOutput', width: 36, height: 50 },
  dataStore: { nodeType: 'bpmn-data-store', element: 'bpmn:DataStoreReference', width: 50, height: 50 },

  annotation: { nodeType: 'bpmn-annotation', element: 'bpmn:TextAnnotation', width: 160, height: 40 },
  group: { nodeType: 'bpmn-group', element: 'bpmn:Group', width: 250, height: 160, zIndex: -30 },

  conversation: { nodeType: 'bpmn-conversation', element: 'bpmn:Conversation', width: 50, height: 44 },
  subConversation: { nodeType: 'bpmn-conversation', element: 'bpmn:SubConversation', width: 50, height: 44 },
  callConversation: { nodeType: 'bpmn-conversation', element: 'bpmn:CallConversation', width: 50, height: 44 },

  choreographyTask: { nodeType: 'bpmn-choreography', element: 'bpmn:ChoreographyTask', width: 100, height: 80 },
  subChoreography: { nodeType: 'bpmn-choreography', element: 'bpmn:SubChoreography', width: 100, height: 80 },
  callChoreography: { nodeType: 'bpmn-choreography', element: 'bpmn:CallChoreography', width: 100, height: 80 }
};

const EVENT_DEFINITIONS: Record<string, string> = {
  message: 'bpmn:MessageEventDefinition',
  timer: 'bpmn:TimerEventDefinition',
  signal: 'bpmn:SignalEventDefinition',
  error: 'bpmn:ErrorEventDefinition',
  escalation: 'bpmn:EscalationEventDefinition',
  compensation: 'bpmn:CompensateEventDefinition',
  compensate: 'bpmn:CompensateEventDefinition',
  conditional: 'bpmn:ConditionalEventDefinition',
  link: 'bpmn:LinkEventDefinition',
  terminate: 'bpmn:TerminateEventDefinition',
  cancel: 'bpmn:CancelEventDefinition'
};

const EDGE_KINDS: Record<string, { kind: BpmnEdgeKind; element: string }> = {
  sequenceFlow: { kind: 'sequence-flow', element: 'bpmn:SequenceFlow' },
  messageFlow: { kind: 'message-flow', element: 'bpmn:MessageFlow' },
  association: { kind: 'association', element: 'bpmn:Association' },
  dataAssociation: { kind: 'data-association', element: 'bpmn:DataInputAssociation' },
  conversationLink: { kind: 'conversation-link', element: 'bpmn:ConversationLink' }
};

const SUBPROCESS_KINDS = new Set(['subProcess', 'adHocSubProcess', 'transaction', 'callActivity']);

function eventKindOf(type: string, attachedTo?: string): BpmnNodeData['eventKind'] {
  if (type === 'startEvent') return 'start';
  if (type === 'endEvent') return 'end';
  if (type === 'boundaryEvent' || attachedTo) return 'boundary';
  if (type === 'intermediateCatchEvent') return 'intermediate-catch';
  return 'intermediate-throw';
}

function jsonNodeToFlow(node: BpmnJsonNode, spec: KindSpec): BpmnFlowNode {
  const width = node.width ?? (SUBPROCESS_KINDS.has(node.type) && node.expanded ? 350 : spec.width);
  const height = node.height ?? (SUBPROCESS_KINDS.has(node.type) && node.expanded ? 200 : spec.height);

  const data: BpmnNodeData = {
    element: spec.element,
    label: node.name ?? node.text,
    width,
    height,
    script: node.script
  };

  let nodeType = spec.nodeType;
  let zIndex = spec.zIndex ?? 10;

  if (nodeType === 'bpmn-event') {
    data.eventKind = eventKindOf(node.type, node.attachedTo);
    const defs = Array.isArray(node.eventDefinition)
      ? node.eventDefinition
      : node.eventDefinition
        ? [node.eventDefinition]
        : [];
    data.eventDefinitions = defs.map((d) => EVENT_DEFINITIONS[d] ?? d);
    data.interrupting = node.interrupting !== false;
    data.parallelMultiple = !!node.parallel;
    data.attachedTo = node.attachedTo;
  } else if (nodeType === 'bpmn-task') {
    const isSub = SUBPROCESS_KINDS.has(node.type);
    const expanded = isSub && node.expanded === true;
    data.taskType = spec.element;
    data.isExpanded = expanded;
    data.isCall = node.type === 'callActivity';
    data.isTransaction = node.type === 'transaction';
    data.triggeredByEvent = !!node.triggeredByEvent;
    const markers: ActivityMarker[] = [...(node.markers ?? [])];
    if (node.type === 'adHocSubProcess' && !markers.includes('ad-hoc')) markers.push('ad-hoc');
    if (isSub && !expanded && !markers.includes('sub-process')) markers.push('sub-process');
    data.markers = markers;
    if (expanded) {
      nodeType = 'bpmn-subprocess';
      zIndex = -20;
    }
  } else if (nodeType === 'bpmn-gateway') {
    const base = node.type.replace('Gateway', '');
    if (node.type === 'eventBasedGateway') {
      data.gatewayKind = node.parallel
        ? 'event-based-parallel'
        : node.instantiate
          ? 'event-based-exclusive'
          : 'event-based';
    } else {
      data.gatewayKind = base as BpmnNodeData['gatewayKind'];
    }
  } else if (nodeType === 'bpmn-pool' || nodeType === 'bpmn-lane') {
    data.isHorizontal = node.horizontal !== false;
    data.isEmptyPool = !!node.blackBox;
    data.participantMultiplicity = !!node.multiInstance;
  } else if (nodeType === 'bpmn-data-object') {
    data.dataKind = node.type === 'dataInput' ? 'input' : node.type === 'dataOutput' ? 'output' : 'object';
    data.isCollection = !!node.collection;
  } else if (nodeType === 'bpmn-data-store') {
    data.dataKind = 'store';
  } else if (nodeType === 'bpmn-conversation') {
    data.isCall = node.type === 'callConversation';
    data.markers = node.type === 'subConversation' ? ['sub-process'] : [];
  } else if (nodeType === 'bpmn-choreography') {
    data.isCall = node.type === 'callChoreography';
    data.markers = [
      ...(node.markers ?? []),
      ...(node.type === 'subChoreography' ? (['sub-process'] as ActivityMarker[]) : [])
    ];
    const participants = node.participants ?? [];
    const anyInitiating = participants.some((p) => p.initiating);
    data.participants = participants.map((p, i) => ({
      id: p.id ?? `${node.id}-participant-${i}`,
      name: p.name,
      initiating: p.initiating ?? (!anyInitiating && i === 0),
      multiplicity: !!p.multiplicity
    }));
  }

  return {
    id: node.id,
    type: nodeType,
    position: { x: node.x, y: node.y },
    width,
    height,
    zIndex,
    connectable: false,
    data
  };
}

/** Point where the segment center→toward leaves the node's rectangle. */
function borderPoint(node: BpmnFlowNode, toward: Point): Point {
  const cx = node.position.x + (node.width ?? 0) / 2;
  const cy = node.position.y + (node.height ?? 0) / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  const hw = (node.width ?? 0) / 2;
  const hh = (node.height ?? 0) / 2;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty, 1);
  return { x: cx + dx * t, y: cy + dy * t };
}

function autoWaypoints(source: BpmnFlowNode, target: BpmnFlowNode): Point[] {
  const sc = {
    x: source.position.x + (source.width ?? 0) / 2,
    y: source.position.y + (source.height ?? 0) / 2
  };
  const tc = {
    x: target.position.x + (target.width ?? 0) / 2,
    y: target.position.y + (target.height ?? 0) / 2
  };
  return [borderPoint(source, tc), borderPoint(target, sc)];
}

function jsonEdgeToFlow(
  edge: BpmnJsonEdge,
  index: number,
  nodesById: Map<string, BpmnFlowNode>,
  warnings: string[]
): BpmnFlowEdge | undefined {
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);
  if (!source || !target) {
    warnings.push(`Edge ${edge.id ?? index} references unknown node "${!source ? edge.source : edge.target}" and was skipped`);
    return undefined;
  }
  const spec = EDGE_KINDS[edge.type ?? 'sequenceFlow'];
  if (!spec) {
    warnings.push(`Edge ${edge.id ?? index} has unknown type "${edge.type}" and was skipped`);
    return undefined;
  }
  let kind = spec.kind;
  if (kind === 'sequence-flow') {
    if (edge.default) kind = 'default-flow';
    else if (edge.conditional) kind = 'conditional-flow';
  }
  const waypoints: Point[] =
    edge.waypoints && edge.waypoints.length >= 2
      ? edge.waypoints.map(([x, y]) => ({ x, y }))
      : autoWaypoints(source, target);

  return {
    id: edge.id ?? `${edge.source}->${edge.target}#${index}`,
    type: 'bpmn-edge',
    source: edge.source,
    target: edge.target,
    selectable: true,
    data: {
      element: spec.element,
      kind,
      label: edge.label,
      waypoints,
      associationDirection: kind === 'association' ? (edge.direction ?? 'None') : undefined
    }
  };
}

/**
 * Transforms a JSON diagram document into the same Svelte Flow graph the BPMN
 * XML pipeline produces, so both formats feed identical rendering and
 * simulation paths.
 */
export function jsonToFlow(doc: BpmnJsonDocument): BpmnFlowGraph {
  const warnings: string[] = [];
  const nodes: BpmnFlowNode[] = [];

  for (const node of doc.nodes ?? []) {
    if (!node?.id || typeof node.x !== 'number' || typeof node.y !== 'number') {
      warnings.push(`Node ${node?.id ?? '?'} is missing id/x/y and was skipped`);
      continue;
    }
    const spec = NODE_KINDS[node.type];
    if (!spec) {
      warnings.push(`Node ${node.id} has unknown type "${node.type}" — rendered as a plain task`);
      nodes.push(jsonNodeToFlow({ ...node, type: 'task' }, NODE_KINDS.task));
      continue;
    }
    nodes.push(jsonNodeToFlow(node, spec));
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const edges: BpmnFlowEdge[] = [];
  (doc.edges ?? []).forEach((edge, i) => {
    const flow = jsonEdgeToFlow(edge, i, nodesById, warnings);
    if (flow) edges.push(flow);
  });

  nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const tests: BpmnWorkflowTest[] = (doc.tests ?? []).filter((t) => {
    if (!t?.script) {
      warnings.push(`Workflow test "${t?.name ?? '?'}" has no script and was skipped`);
      return false;
    }
    return true;
  });

  return { nodes, edges, warnings, tests, initialPayload: doc.payload };
}
