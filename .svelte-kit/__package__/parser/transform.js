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
const GATEWAY_KINDS = {
    'bpmn:ExclusiveGateway': 'exclusive',
    'bpmn:ParallelGateway': 'parallel',
    'bpmn:InclusiveGateway': 'inclusive',
    'bpmn:ComplexGateway': 'complex',
    'bpmn:EventBasedGateway': 'event-based'
};
function is(element, type) {
    return typeof element?.$instanceOf === 'function' ? element.$instanceOf(type) : element?.$type === type;
}
function toBounds(b) {
    return { x: b.x, y: b.y, width: b.width, height: b.height };
}
function relativeLabelBounds(di, shapeBounds) {
    const lb = di?.label?.bounds;
    if (!lb)
        return undefined;
    return {
        x: lb.x - shapeBounds.x,
        y: lb.y - shapeBounds.y,
        width: lb.width,
        height: lb.height
    };
}
/** How deep an element is nested inside sub-processes (drives z-ordering). */
function nestingDepth(element) {
    let depth = 0;
    let parent = element?.$parent;
    while (parent) {
        if (SUBPROCESS_TYPES.has(parent.$type))
            depth += 1;
        parent = parent.$parent;
    }
    return depth;
}
function eventKindOf(element) {
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
function activityMarkersOf(element, isExpanded) {
    const markers = [];
    const loop = element.loopCharacteristics;
    if (loop) {
        if (loop.$type === 'bpmn:MultiInstanceLoopCharacteristics') {
            markers.push(loop.isSequential ? 'sequential-mi' : 'parallel-mi');
        }
        else {
            markers.push('loop');
        }
    }
    if (element.isForCompensation)
        markers.push('compensation');
    if (element.$type === 'bpmn:AdHocSubProcess')
        markers.push('ad-hoc');
    const isSubLike = SUBPROCESS_TYPES.has(element.$type) || element.$type === 'bpmn:CallActivity';
    if (isSubLike && !isExpanded)
        markers.push('sub-process');
    return markers;
}
function gatewayKindOf(element) {
    const base = GATEWAY_KINDS[element.$type] ?? 'exclusive';
    if (base === 'event-based') {
        if (element.eventGatewayType === 'Parallel')
            return 'event-based-parallel';
        if (element.instantiate)
            return 'event-based-exclusive';
    }
    return base;
}
function shapeToNode(di, warnings) {
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
    const type = element.$type;
    const data = {
        element: type,
        label: element.name ?? undefined,
        width: bounds.width,
        height: bounds.height,
        labelBounds: relativeLabelBounds(di, bounds)
    };
    let nodeType;
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
        ].map((d) => d.$type);
        data.parallelMultiple = !!element.parallelMultiple;
        if (type === 'bpmn:StartEvent') {
            data.interrupting = element.isInterrupting !== false;
        }
        else if (type === 'bpmn:BoundaryEvent') {
            data.interrupting = element.cancelActivity !== false;
            zIndex = 30;
        }
        else {
            data.interrupting = true;
        }
    }
    else if (TASK_TYPES.has(type)) {
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
        }
        else {
            nodeType = 'bpmn-task';
        }
    }
    else if (type in GATEWAY_KINDS) {
        nodeType = 'bpmn-gateway';
        data.gatewayKind = gatewayKindOf(element);
    }
    else if (type === 'bpmn:Participant') {
        nodeType = 'bpmn-pool';
        data.isHorizontal = di.isHorizontal !== false;
        data.isEmptyPool = !element.processRef;
        data.participantMultiplicity = !!element.participantMultiplicity;
        zIndex = -50;
    }
    else if (type === 'bpmn:Lane') {
        nodeType = 'bpmn-lane';
        data.isHorizontal = di.isHorizontal !== false;
        zIndex = -40;
    }
    else if (type === 'bpmn:DataObjectReference' || type === 'bpmn:DataObject') {
        nodeType = 'bpmn-data-object';
        data.dataKind = 'object';
        data.isCollection = !!(element.dataObjectRef?.isCollection ?? element.isCollection);
    }
    else if (type === 'bpmn:DataInput') {
        nodeType = 'bpmn-data-object';
        data.dataKind = 'input';
        data.isCollection = !!element.isCollection;
    }
    else if (type === 'bpmn:DataOutput') {
        nodeType = 'bpmn-data-object';
        data.dataKind = 'output';
        data.isCollection = !!element.isCollection;
    }
    else if (type === 'bpmn:DataStoreReference' || type === 'bpmn:DataStore') {
        nodeType = 'bpmn-data-store';
        data.dataKind = 'store';
    }
    else if (type === 'bpmn:Conversation' ||
        type === 'bpmn:SubConversation' ||
        type === 'bpmn:CallConversation') {
        nodeType = 'bpmn-conversation';
        data.isCall = type === 'bpmn:CallConversation';
        data.markers = type === 'bpmn:SubConversation' ? ['sub-process'] : [];
    }
    else if (type === 'bpmn:ChoreographyTask' ||
        type === 'bpmn:SubChoreography' ||
        type === 'bpmn:CallChoreography') {
        nodeType = 'bpmn-choreography';
        data.isCall = type === 'bpmn:CallChoreography';
        const isExpanded = di.isExpanded === true;
        data.isExpanded = isExpanded;
        if (type === 'bpmn:SubChoreography' && !isExpanded)
            data.markers = ['sub-process'];
        // ChoreographyActivity uses the singular (isMany) participantRef property.
        data.participants = (element.participantRef ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            initiating: element.initiatingParticipantRef === p,
            multiplicity: !!p.participantMultiplicity
        }));
        const markers = [
            ...(data.markers ?? []),
            ...activityMarkersOf(element, isExpanded).filter((m) => m !== 'sub-process')
        ];
        // Choreography multiplicity lives on the loopType attribute, not on
        // loopCharacteristics.
        if (element.loopType === 'MultiInstanceParallel')
            markers.push('parallel-mi');
        else if (element.loopType === 'MultiInstanceSequential')
            markers.push('sequential-mi');
        else if (element.loopType === 'Standard')
            markers.push('loop');
        data.markers = markers;
    }
    else if (type === 'bpmn:TextAnnotation') {
        nodeType = 'bpmn-annotation';
        data.label = element.text ?? element.name ?? undefined;
    }
    else if (type === 'bpmn:Group') {
        nodeType = 'bpmn-group';
        data.label = element.categoryValueRef?.value ?? undefined;
        zIndex = -30;
    }
    else {
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
function edgeKindOf(element) {
    const type = element.$type;
    if (type === 'bpmn:MessageFlow')
        return 'message-flow';
    if (type === 'bpmn:ConversationLink')
        return 'conversation-link';
    if (type === 'bpmn:Association')
        return 'association';
    if (type === 'bpmn:DataInputAssociation' || type === 'bpmn:DataOutputAssociation') {
        return 'data-association';
    }
    // sequence flow: default / conditional variants get their own markers
    const source = element.sourceRef;
    if (source && source.default === element)
        return 'default-flow';
    if (element.conditionExpression && source && !is(source, 'bpmn:Gateway'))
        return 'conditional-flow';
    return 'sequence-flow';
}
function edgeEndpoints(element) {
    const type = element.$type;
    if (type === 'bpmn:DataInputAssociation') {
        return { source: element.sourceRef?.[0]?.id, target: element.$parent?.id };
    }
    if (type === 'bpmn:DataOutputAssociation') {
        return { source: element.$parent?.id, target: element.targetRef?.id };
    }
    return { source: element.sourceRef?.id, target: element.targetRef?.id };
}
function diEdgeToEdge(di, nodeIds, warnings) {
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
    const waypoints = (di.waypoint ?? []).map((p) => ({ x: p.x, y: p.y }));
    if (waypoints.length < 2) {
        warnings.push(`Edge <${element.id}> has fewer than 2 waypoints and was skipped`);
        return undefined;
    }
    const data = {
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
function findPlane(definitions, diagramId) {
    const diagrams = definitions?.diagrams ?? [];
    if (diagramId)
        return diagrams.find((d) => d.id === diagramId)?.plane;
    return diagrams[0]?.plane;
}
/**
 * Transforms a parsed bpmn:Definitions tree into Svelte Flow nodes and edges,
 * using the BPMN DI (diagram interchange) for geometry.
 */
export function bpmnToFlow(definitions, options = {}) {
    const warnings = [];
    const plane = findPlane(definitions, options.diagramId);
    if (!plane) {
        return { nodes: [], edges: [], warnings: ['No BPMNDiagram/BPMNPlane found in definitions'] };
    }
    const planeElements = plane.planeElement ?? [];
    const nodes = [];
    for (const di of planeElements) {
        if (di.$type === 'bpmndi:BPMNShape') {
            const node = shapeToNode(di, warnings);
            if (node)
                nodes.push(node);
        }
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = [];
    for (const di of planeElements) {
        if (di.$type === 'bpmndi:BPMNEdge') {
            const edge = diEdgeToEdge(di, nodeIds, warnings);
            if (edge)
                edges.push(edge);
        }
    }
    // Render containers first so flow nodes stack above them at equal z-index.
    nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    return { nodes, edges, warnings };
}
