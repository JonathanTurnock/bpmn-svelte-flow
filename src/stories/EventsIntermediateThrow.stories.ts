import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, eventShape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Intermediate Throw Events',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};


const ids = [
  'IT_None',
  'IT_Message',
  'IT_Signal',
  'IT_Escalation',
  'IT_Compensation',
  'IT_Link',
  'IT_Multiple'
];

const intermediateThrow = bpmnDefinitions(
  `  <bpmn:process id="Process_IntermediateThrow" isExecutable="false">
    <bpmn:intermediateThrowEvent id="IT_None" name="None"/>
    <bpmn:intermediateThrowEvent id="IT_Message" name="Message">
      <bpmn:messageEventDefinition id="IT_Message_def"/>
    </bpmn:intermediateThrowEvent>
    <bpmn:intermediateThrowEvent id="IT_Signal" name="Signal">
      <bpmn:signalEventDefinition id="IT_Signal_def"/>
    </bpmn:intermediateThrowEvent>
    <bpmn:intermediateThrowEvent id="IT_Escalation" name="Escalation">
      <bpmn:escalationEventDefinition id="IT_Escalation_def"/>
    </bpmn:intermediateThrowEvent>
    <bpmn:intermediateThrowEvent id="IT_Compensation" name="Compensation">
      <bpmn:compensateEventDefinition id="IT_Compensation_def"/>
    </bpmn:intermediateThrowEvent>
    <bpmn:intermediateThrowEvent id="IT_Link" name="Link">
      <bpmn:linkEventDefinition id="IT_Link_def" name="LinkA"/>
    </bpmn:intermediateThrowEvent>
    <bpmn:intermediateThrowEvent id="IT_Multiple" name="Multiple">
      <bpmn:messageEventDefinition id="IT_Multiple_def1"/>
      <bpmn:signalEventDefinition id="IT_Multiple_def2"/>
    </bpmn:intermediateThrowEvent>
  </bpmn:process>`,
  ids.map((id, i) => eventShape(id, i)).join('\n')
);

/**
 * Intermediate throw events — a DOUBLE thin circle with FILLED (throw) glyphs.
 * Covers: none, message, signal, escalation, compensation, link, multiple.
 */
export const All = {
  args: {
    xml: intermediateThrow
  }
};
