import BpmnEdge from './edges/BpmnEdge.svelte';
import ChoreographyNode from './nodes/ChoreographyNode.svelte';
import ConversationNode from './nodes/ConversationNode.svelte';
import DataObjectNode from './nodes/DataObjectNode.svelte';
import DataStoreNode from './nodes/DataStoreNode.svelte';
import EventNode from './nodes/EventNode.svelte';
import GatewayNode from './nodes/GatewayNode.svelte';
import GroupNode from './nodes/GroupNode.svelte';
import LaneNode from './nodes/LaneNode.svelte';
import PoolNode from './nodes/PoolNode.svelte';
import SubProcessNode from './nodes/SubProcessNode.svelte';
import TaskNode from './nodes/TaskNode.svelte';
import TextAnnotationNode from './nodes/TextAnnotationNode.svelte';
/** Node type registry for all BPMN shapes. */
export const bpmnNodeTypes = {
    'bpmn-event': EventNode,
    'bpmn-task': TaskNode,
    'bpmn-subprocess': SubProcessNode,
    'bpmn-gateway': GatewayNode,
    'bpmn-pool': PoolNode,
    'bpmn-lane': LaneNode,
    'bpmn-data-object': DataObjectNode,
    'bpmn-data-store': DataStoreNode,
    'bpmn-annotation': TextAnnotationNode,
    'bpmn-group': GroupNode,
    'bpmn-conversation': ConversationNode,
    'bpmn-choreography': ChoreographyNode
};
/** Edge type registry for all BPMN connecting objects. */
export const bpmnEdgeTypes = {
    'bpmn-edge': BpmnEdge
};
