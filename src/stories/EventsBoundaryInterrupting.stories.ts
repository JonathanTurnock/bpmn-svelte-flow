import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Boundary Interrupting',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

const EV = 36;
const TASK_W = 100;
const TASK_H = 80;
const SPACING = 130;
const X0 = 40;
const TASK_Y = 100;

/** DI for one host activity plus its boundary event straddling the bottom border. */
function column(hostId: string, eventId: string, i: number): string[] {
  const x = X0 + i * SPACING;
  // Centre the 36px event on the host's bottom edge: half in, half out.
  const ex = x + TASK_W / 2 - EV / 2;
  const ey = TASK_Y + TASK_H - EV / 2;
  return [
    shape(hostId, x, TASK_Y, TASK_W, TASK_H),
    shape(eventId, ex, ey, EV, EV, { label: [ex + EV / 2 - 48, ey + EV + 8, 96, 26] })
  ];
}

const columns: Array<[string, string]> = [
  ['Task_Message', 'B_Message'],
  ['Task_Timer', 'B_Timer'],
  ['Task_Conditional', 'B_Conditional'],
  ['Task_Signal', 'B_Signal'],
  ['Task_Error', 'B_Error'],
  ['Task_Escalation', 'B_Escalation'],
  ['Task_Compensation', 'B_Compensation'],
  ['Transaction_Cancel', 'B_Cancel']
];

const boundaryInterrupting = bpmnDefinitions(
  `  <bpmn:process id="Process_BoundaryInterrupting" isExecutable="false">
    <bpmn:task id="Task_Message" name="Task"/>
    <bpmn:task id="Task_Timer" name="Task"/>
    <bpmn:task id="Task_Conditional" name="Task"/>
    <bpmn:task id="Task_Signal" name="Task"/>
    <bpmn:task id="Task_Error" name="Task"/>
    <bpmn:task id="Task_Escalation" name="Task"/>
    <bpmn:task id="Task_Compensation" name="Task"/>
    <bpmn:transaction id="Transaction_Cancel" name="Transaction"/>
    <bpmn:boundaryEvent id="B_Message" name="Message" attachedToRef="Task_Message" cancelActivity="true">
      <bpmn:messageEventDefinition id="B_Message_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="B_Timer" name="Timer" attachedToRef="Task_Timer" cancelActivity="true">
      <bpmn:timerEventDefinition id="B_Timer_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="B_Conditional" name="Conditional" attachedToRef="Task_Conditional" cancelActivity="true">
      <bpmn:conditionalEventDefinition id="B_Conditional_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="B_Signal" name="Signal" attachedToRef="Task_Signal" cancelActivity="true">
      <bpmn:signalEventDefinition id="B_Signal_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="B_Error" name="Error" attachedToRef="Task_Error" cancelActivity="true">
      <bpmn:errorEventDefinition id="B_Error_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="B_Escalation" name="Escalation" attachedToRef="Task_Escalation" cancelActivity="true">
      <bpmn:escalationEventDefinition id="B_Escalation_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="B_Compensation" name="Compensation" attachedToRef="Task_Compensation" cancelActivity="true">
      <bpmn:compensateEventDefinition id="B_Compensation_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="B_Cancel" name="Cancel" attachedToRef="Transaction_Cancel" cancelActivity="true">
      <bpmn:cancelEventDefinition id="B_Cancel_def"/>
    </bpmn:boundaryEvent>
  </bpmn:process>`,
  columns.flatMap(([host, event], i) => column(host, event, i)).join('\n')
);

/**
 * Interrupting boundary events — a DOUBLE thin SOLID circle with unfilled
 * (catch) glyphs, straddling the host activity's border.
 * Covers: message, timer, conditional, signal, error, escalation, compensation,
 * cancel (on a transaction, as the spec requires).
 */
export const All = {
  args: {
    xml: boundaryInterrupting
  }
};
