import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';

// Every story on this page renders a complete, standalone BPMN 2.0 document
// from `src/stories/fixtures/`. Nothing is assembled in TypeScript: the
// stories differ only by which file they load, so the fixtures double as a
// regression corpus for the parser, the DI handling and every node/edge
// component.
import activityShowcase from './fixtures/activity-showcase.bpmn?raw';
import choreography from './fixtures/choreography.bpmn?raw';
import collaboration from './fixtures/collaboration.bpmn?raw';
import conversation from './fixtures/conversation.bpmn?raw';
import dataAndArtifacts from './fixtures/data-and-artifacts.bpmn?raw';
import eventShowcase from './fixtures/event-showcase.bpmn?raw';
import gatewayShowcase from './fixtures/gateway-showcase.bpmn?raw';
import quickstart from './fixtures/quickstart.bpmn?raw';

export default {
  title: 'BPMN Files/Rendering',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

/** `quickstart.bpmn` — start event, user task, exclusive gateway with a default flow, two end events. */
export const Quickstart = {
  args: { xml: quickstart, height: '100vh' }
};

/** `event-showcase.bpmn` — start/intermediate/end/boundary events across every event definition. */
export const EventShowcase = {
  args: { xml: eventShowcase, height: '100vh' }
};

/** `activity-showcase.bpmn` — all task types, markers, sub-processes, transaction, ad-hoc, event sub-process, call activity. */
export const ActivityShowcase = {
  args: { xml: activityShowcase, height: '100vh' }
};

/** `gateway-showcase.bpmn` — exclusive, parallel, inclusive, complex and event-based gateways with default and conditional flows. */
export const GatewayShowcase = {
  args: { xml: gatewayShowcase, height: '100vh' }
};

/** `data-and-artifacts.bpmn` — data objects/inputs/outputs/store, data associations, text annotation, group. */
export const DataAndArtifacts = {
  args: { xml: dataAndArtifacts, height: '100vh' }
};

/** `collaboration.bpmn` — two pools with lanes, message flows and a black-box participant. */
export const Collaboration = {
  args: { xml: collaboration, height: '100vh' }
};

/** `choreography.bpmn` — choreography tasks with participant bands, sub- and call choreography. */
export const Choreography = {
  args: { xml: choreography, height: '100vh' }
};

/** `conversation.bpmn` — conversation, sub-conversation and call conversation hexagons joined by conversation links. */
export const Conversation = {
  args: { xml: conversation, height: '100vh' }
};
