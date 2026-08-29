import type {
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
} from '../types.js';

const EVENT_TYPES = new Set([
  'bpmn:StartEvent',
  'bpmn:EndEvent',
  'bpmn:IntermediateThrowEvent',
  'bpmn:IntermediateCatchEvent',
  'bpmn:BoundaryEvent'
]);

const TASK_TYPES = new Set([
  'bpmn:Task',
  'bpmn:UserTask',
  'bpmn:ServiceTask',
  'bpmn:ScriptTask',
  'bpmn:ManualTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:BusinessRuleTask',
  'bpmn:CallActivity',
  'bpmn:SubProcess',
  'bpmn:AdHocSubProcess',
  'bpmn:Transaction'
]);

const SUBPROCESS_TYPES = new Set(['bpmn:SubProcess', 'bpmn:AdHocSubProcess', 'bpmn:Transaction']);

const GATEWAY_KINDS: Record<string, GatewayKind> = {
  'bpmn:ExclusiveGateway': 'exclusive',
  'bpmn:ParallelGateway': 'parallel',
  'bpmn:InclusiveGateway': 'inclusive',
  'bpmn:ComplexGateway': 'complex',
  'bpmn:EventBasedGateway': 'event-based'
};

function is(element: any, type: string): boolean {
  return typeof element?.$instanceOf === 'function' ? element.$instanceOf(type) : element?.$type === type;
}

/** 'bsf:script' → 'script' (extension elements are matched prefix-agnostically). */
function localName(type: string): string {
  const i = type.indexOf(':');
  return i >= 0 ? type.slice(i + 1) : type;
}

/** JavaScript block attached to an element via a <bsf:script> extension. */
function extensionScript(element: any): string | undefined {
  const values = element?.extensionElements?.values ?? [];
  const scriptEl = values.find((v: any) => localName(v?.$type ?? '') === 'script');
  const body = scriptEl?.$body?.trim();
  return body || undefined;
}

/** <bsf:test> extensions on the definitions or any root element (process, …). */
function collectTests(definitions: any, warnings: string[]): BpmnWorkflowTest[] {
  const holders = [definitions, ...(definitions?.rootElements ?? [])];
  const tests: BpmnWorkflowTest[] = [];
  for (const holder of holders) {
    for (const v of holder?.extensionElements?.values ?? []) {
      if (localName(v?.$type ?? '') !== 'test') continue;
      const script = v.$body?.trim();
      if (!script) continue;
      let payload: Record<string, unknown> | undefined;
      if (v.payload) {
        try {
          payload = JSON.parse(v.payload);
        } catch {
          warnings.push(`Workflow test "${v.name ?? '?'}" has an invalid payload attribute (must be JSON)`);
        }
      }
      tests.push({ name: v.name ?? `test ${tests.length + 1}`, payload, script });
    }
  }
  return tests;
}

function toBounds(b: any): Bounds {
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}

function relativeLabelBounds(di: any, shapeBounds: Bounds): Bounds | undefined {
  const lb = di?.label?.bounds;
  if (!lb) return undefined;
  return {
    x: lb.x - shapeBounds.x,
    y: lb.y - shapeBounds.y,
    width: lb.width,
    height: lb.height
  };
}

/** How deep an element is nested inside sub-processes (drives z-ordering). */
function nestingDepth(element: any): number {
  let depth = 0;
  let parent = element?.$parent;
  while (parent) {
    if (SUBPROCESS_TYPES.has(parent.$type)) depth += 1;
    parent = parent.$parent;
  }
  return depth;
}

function eventKindOf(element: any): EventKind {
  switch (element.$type) {
    case 'bpmn:StartEvent':
      return 'start';
    case 'bpmn:EndEvent':
      return 'end';
    case 'bpmn:BoundaryEvent':
      return 'boundary';
    case 'bpmn:IntermediateCatchEvent':
      return 'intermediate-catch';
    default:
      return 'intermediate-throw';
  }
}

function activityMarkersOf(element: any, isExpanded: boolean): ActivityMarker[] {
  const markers: ActivityMarker[] = [];
  const loop = element.loopCharacteristics;
  if (loop) {
    if (loop.$type === 'bpmn:MultiInstanceLoopCharacteristics') {
      markers.push(loop.isSequential ? 'sequential-mi' : 'parallel-mi');
    } else {
      markers.push('loop');
    }
  }
  if (element.isForCompensation) markers.push('compensation');
  if (element.$type === 'bpmn:AdHocSubProcess') markers.push('ad-hoc');
  const isSubLike = SUBPROCESS_TYPES.has(element.$type) || element.$type === 'bpmn:CallActivity';
  if (isSubLike && !isExpanded) markers.push('sub-process');
  return markers;
}

function gatewayKindOf(element: any): GatewayKind {
  const base = GATEWAY_KINDS[element.$type] ?? 'exclusive';
  if (base === 'event-based') {
    if (element.eventGatewayType === 'Parallel') return 'event-based-parallel';
    if (element.instantiate) return 'event-based-exclusive';
  }
  return base;
}

function shapeToNode(di: any, warnings: string[]): BpmnFlowNode | undefined {
  const element = di.bpmnElement;
  if (!element) {
    warnings.push('BPMNShape without resolvable bpmnElement was skipped');
    return undefined;
  }
  if (!di.bounds) {
    warnings.push(`BPMNShape for <${element.id}> has no bounds and was skipped`);
    return undefined;
  }

  const bounds = toBounds(di.bounds);
  const type = element.$type as string;

  const data: BpmnNodeData = {
    element: type,
    label: element.name ?? undefined,
    width: bounds.width,
    height: bounds.height,
    labelBounds: relativeLabelBounds(di, bounds),
    script: extensionScript(element)
  };

  let nodeType: string;
  let zIndex = 10;
  const depth = nestingDepth(element);

  if (EVENT_TYPES.has(type)) {
    nodeType = 'bpmn-event';
    data.eventKind = eventKindOf(element);
    // Event definitions may be contained (eventDefinitions) or referenced
    // (eventDefinitionRef pointing at definitions hoisted to bpmn:Definitions).
    data.eventDefinitions = [
      ...(element.eventDefinitions ?? []),
      ...(element.eventDefinitionRef ?? [])
    ].map((d: any) => d.$type as string);
    data.parallelMultiple = !!element.parallelMultiple;
    if (type === 'bpmn:StartEvent') {
      data.interrupting = element.isInterrupting !== false;
    } else if (type === 'bpmn:BoundaryEvent') {
      data.interrupting = element.cancelActivity !== false;
      data.attachedTo = element.attachedToRef?.id;
      zIndex = 30;
    } else {
      data.interrupting = true;
    }
  } else if (TASK_TYPES.has(type)) {
    const isExpanded = SUBPROCESS_TYPES.has(type) || type === 'bpmn:CallActivity' ? di.isExpanded === true : false;
    data.isExpanded = isExpanded;
    data.taskType = type;
    data.markers = activityMarkersOf(element, isExpanded);
    data.isCall = type === 'bpmn:CallActivity';
    data.isTransaction = type === 'bpmn:Transaction';
    data.triggeredByEvent = !!element.triggeredByEvent;
    if (isExpanded) {
      nodeType = 'bpmn-subprocess';
      zIndex = -20 + depth;
    } else {
      nodeType = 'bpmn-task';
    }
  } else if (type in GATEWAY_KINDS) {
    nodeType = 'bpmn-gateway';
    data.gatewayKind = gatewayKindOf(element);
  } else if (type === 'bpmn:Participant') {
    nodeType = 'bpmn-pool';
    data.isHorizontal = di.isHorizontal !== false;
    data.isEmptyPool = !element.processRef;
    data.participantMultiplicity = !!element.participantMultiplicity;
    zIndex = -50;
  } else if (type === 'bpmn:Lane') {
    nodeType = 'bpmn-lane';
    data.isHorizontal = di.isHorizontal !== false;
    zIndex = -40;
  } else if (type === 'bpmn:DataObjectReference' || type === 'bpmn:DataObject') {
    nodeType = 'bpmn-data-object';
    data.dataKind = 'object';
    data.isCollection = !!(element.dataObjectRef?.isCollection ?? element.isCollection);
  } else if (type === 'bpmn:DataInput') {
    nodeType = 'bpmn-data-object';
    data.dataKind = 'input';
    data.isCollection = !!element.isCollection;
  } else if (type === 'bpmn:DataOutput') {
    nodeType = 'bpmn-data-object';
    data.dataKind = 'output';
    data.isCollection = !!element.isCollection;
  } else if (type === 'bpmn:DataStoreReference' || type === 'bpmn:DataStore') {
    nodeType = 'bpmn-data-store';
    data.dataKind = 'store';
  } else if (
    type === 'bpmn:Conversation' ||
    type === 'bpmn:SubConversation' ||
    type === 'bpmn:CallConversation'
  ) {
    nodeType = 'bpmn-conversation';
    data.isCall = type === 'bpmn:CallConversation';
    data.markers = type === 'bpmn:SubConversation' ? ['sub-process'] : [];
  } else if (
    type === 'bpmn:ChoreographyTask' ||
    type === 'bpmn:SubChoreography' ||
    type === 'bpmn:CallChoreography'
  ) {
    nodeType = 'bpmn-choreography';
    data.isCall = type === 'bpmn:CallChoreography';
    const isExpanded = di.isExpanded === true;
    data.isExpanded = isExpanded;
    if (type === 'bpmn:SubChoreography' && !isExpanded) data.markers = ['sub-process'];
    // ChoreographyActivity uses the singular (isMany) participantRef property.
    data.participants = (element.participantRef ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      initiating: element.initiatingParticipantRef === p,
      multiplicity: !!p.participantMultiplicity
    }));
    const markers: ActivityMarker[] = [
      ...((data.markers as ActivityMarker[] | undefined) ?? []),
      ...activityMarkersOf(element, isExpanded).filter((m) => m !== 'sub-process')
    ];
    // Choreography multiplicity lives on the loopType attribute, not on
    // loopCharacteristics.
    if (element.loopType === 'MultiInstanceParallel') markers.push('parallel-mi');
    else if (element.loopType === 'MultiInstanceSequential') markers.push('sequential-mi');
    else if (element.loopType === 'Standard') markers.push('loop');
    data.markers = markers;
  } else if (type === 'bpmn:TextAnnotation') {
    nodeType = 'bpmn-annotation';
    data.label = element.text ?? element.name ?? undefined;
  } else if (type === 'bpmn:Group') {
    nodeType = 'bpmn-group';
    data.label = element.categoryValueRef?.value ?? undefined;
    zIndex = -30;
  } else {
    warnings.push(`Unsupported BPMN element <${type}> (${element.id}) rendered as a generic task`);
    nodeType = 'bpmn-task';
    data.taskType = 'bpmn:Task';
    data.markers = [];
  }

  return {
    id: element.id,
    type: nodeType,
    position: { x: bounds.x, y: bounds.y },
    width: bounds.width,
    height: bounds.height,
    zIndex,
    connectable: false,
    data
  };
}

function edgeKindOf(element: any): BpmnEdgeKind {
  const type = element.$type as string;
  if (type === 'bpmn:MessageFlow') return 'message-flow';
  if (type === 'bpmn:ConversationLink') return 'conversation-link';
  if (type === 'bpmn:Association') return 'association';
  if (type === 'bpmn:DataInputAssociation' || type === 'bpmn:DataOutputAssociation') {
    return 'data-association';
  }
  // sequence flow: default / conditional variants get their own markers
  const source = element.sourceRef;
  if (source && source.default === element) return 'default-flow';
  if (element.conditionExpression && source && !is(source, 'bpmn:Gateway')) return 'conditional-flow';
  return 'sequence-flow';
}

function edgeEndpoints(element: any): { source?: string; target?: string } {
  const type = element.$type as string;
  if (type === 'bpmn:DataInputAssociation') {
    return { source: element.sourceRef?.[0]?.id, target: element.$parent?.id };
  }
  if (type === 'bpmn:DataOutputAssociation') {
    return { source: element.$parent?.id, target: element.targetRef?.id };
  }
  return { source: element.sourceRef?.id, target: element.targetRef?.id };
}

function diEdgeToEdge(di: any, nodeIds: Set<string>, warnings: string[]): BpmnFlowEdge | undefined {
  const element = di.bpmnElement;
  if (!element) {
    warnings.push('BPMNEdge without resolvable bpmnElement was skipped');
    return undefined;
  }
  const { source, target } = edgeEndpoints(element);
  if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) {
    warnings.push(`Edge <${element.id}> references nodes missing from the diagram and was skipped`);
    return undefined;
  }
  const waypoints: Point[] = (di.waypoint ?? []).map((p: any) => ({ x: p.x, y: p.y }));
  if (waypoints.length < 2) {
    warnings.push(`Edge <${element.id}> has fewer than 2 waypoints and was skipped`);
    return undefined;
  }

  const data: BpmnEdgeData = {
    element: element.$type,
    kind: edgeKindOf(element),
    label: element.name ?? undefined,
    waypoints,
    associationDirection: element.associationDirection,
    labelBounds: di.label?.bounds ? toBounds(di.label.bounds) : undefined
  };

  return {
    id: element.id,
    type: 'bpmn-edge',
    source,
    target,
    selectable: true,
    data
  };
}

/** Finds the BPMNPlane to render (first diagram by default, or by diagram id). */
function findPlane(definitions: any, diagramId?: string): any | undefined {
  const diagrams = definitions?.diagrams ?? [];
  if (diagramId) return diagrams.find((d: any) => d.id === diagramId)?.plane;
  return diagrams[0]?.plane;
}

/**
 * Transforms a parsed bpmn:Definitions tree into Svelte Flow nodes and edges,
 * using the BPMN DI (diagram interchange) for geometry.
 */
export function bpmnToFlow(definitions: any, options: { diagramId?: string } = {}): BpmnFlowGraph {
  const warnings: string[] = [];
  const tests = collectTests(definitions, warnings);
  const plane = findPlane(definitions, options.diagramId);
  if (!plane) {
    return {
      nodes: [],
      edges: [],
      warnings: [...warnings, 'No BPMNDiagram/BPMNPlane found in definitions'],
      tests
    };
  }

  const planeElements: any[] = plane.planeElement ?? [];
  const nodes: BpmnFlowNode[] = [];

  for (const di of planeElements) {
    if (di.$type === 'bpmndi:BPMNShape') {
      const node = shapeToNode(di, warnings);
      if (node) nodes.push(node);
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: BpmnFlowEdge[] = [];

  for (const di of planeElements) {
    if (di.$type === 'bpmndi:BPMNEdge') {
      const edge = diEdgeToEdge(di, nodeIds, warnings);
      if (edge) edges.push(edge);
    }
  }

  // Render containers first so flow nodes stack above them at equal z-index.
  nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return { nodes, edges, warnings, tests };
}
