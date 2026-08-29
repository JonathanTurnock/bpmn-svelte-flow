import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Intermediate Throw Events',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

const EV = 36;
const SPACING = 100;

function evShape(id: string, i: number, x0 = 60, y = 90): string {
  const x = x0 + i * SPACING;
  return shape(id, x, y, EV, EV, { label: [x + EV / 2 - 48, y + EV + 8, 96, 26] });
}

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
  ids.map((id, i) => evShape(id, i)).join('\n')
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
