import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/End Events',
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
  'E_None',
  'E_Message',
  'E_Signal',
  'E_Error',
  'E_Escalation',
  'E_Compensation',
  'E_Cancel',
  'E_Terminate',
  'E_Multiple'
];

const endEvents = bpmnDefinitions(
  `  <bpmn:process id="Process_EndEvents" isExecutable="false">
    <bpmn:endEvent id="E_None" name="None"/>
    <bpmn:endEvent id="E_Message" name="Message">
      <bpmn:messageEventDefinition id="E_Message_def"/>
    </bpmn:endEvent>
    <bpmn:endEvent id="E_Signal" name="Signal">
      <bpmn:signalEventDefinition id="E_Signal_def"/>
    </bpmn:endEvent>
    <bpmn:endEvent id="E_Error" name="Error">
      <bpmn:errorEventDefinition id="E_Error_def"/>
    </bpmn:endEvent>
    <bpmn:endEvent id="E_Escalation" name="Escalation">
      <bpmn:escalationEventDefinition id="E_Escalation_def"/>
    </bpmn:endEvent>
    <bpmn:endEvent id="E_Compensation" name="Compensation">
      <bpmn:compensateEventDefinition id="E_Compensation_def"/>
    </bpmn:endEvent>
    <bpmn:endEvent id="E_Cancel" name="Cancel">
      <bpmn:cancelEventDefinition id="E_Cancel_def"/>
    </bpmn:endEvent>
    <bpmn:endEvent id="E_Terminate" name="Terminate">
      <bpmn:terminateEventDefinition id="E_Terminate_def"/>
    </bpmn:endEvent>
    <bpmn:endEvent id="E_Multiple" name="Multiple">
      <bpmn:messageEventDefinition id="E_Multiple_def1"/>
      <bpmn:signalEventDefinition id="E_Multiple_def2"/>
    </bpmn:endEvent>
  </bpmn:process>`,
  ids.map((id, i) => evShape(id, i)).join('\n')
);

/**
 * End events — a single THICK circle with FILLED (throw) glyphs; terminate is
 * always a solid disc.
 * Covers: none, message, signal, error, escalation, compensation, cancel,
 * terminate, multiple.
 */
export const All = {
  args: {
    xml: endEvents
  }
};
