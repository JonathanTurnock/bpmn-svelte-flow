import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Boundary Non Interrupting',
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

function column(hostId: string, eventId: string, i: number): string[] {
  const x = X0 + i * SPACING;
  const ex = x + TASK_W / 2 - EV / 2;
  const ey = TASK_Y + TASK_H - EV / 2;
  return [
    shape(hostId, x, TASK_Y, TASK_W, TASK_H),
    shape(eventId, ex, ey, EV, EV, { label: [ex + EV / 2 - 48, ey + EV + 8, 96, 26] })
  ];
}

const columns: Array<[string, string]> = [
  ['Task_NiMessage', 'BN_Message'],
  ['Task_NiTimer', 'BN_Timer'],
  ['Task_NiConditional', 'BN_Conditional'],
  ['Task_NiSignal', 'BN_Signal'],
  ['Task_NiEscalation', 'BN_Escalation'],
  ['Task_NiMultiple', 'BN_Multiple'],
  ['Task_NiParallelMultiple', 'BN_ParallelMultiple']
];

const boundaryNonInterrupting = bpmnDefinitions(
  `  <bpmn:process id="Process_BoundaryNonInterrupting" isExecutable="false">
    <bpmn:task id="Task_NiMessage" name="Task"/>
    <bpmn:task id="Task_NiTimer" name="Task"/>
    <bpmn:task id="Task_NiConditional" name="Task"/>
    <bpmn:task id="Task_NiSignal" name="Task"/>
    <bpmn:task id="Task_NiEscalation" name="Task"/>
    <bpmn:task id="Task_NiMultiple" name="Task"/>
    <bpmn:task id="Task_NiParallelMultiple" name="Task"/>
    <bpmn:boundaryEvent id="BN_Message" name="Message" attachedToRef="Task_NiMessage" cancelActivity="false">
      <bpmn:messageEventDefinition id="BN_Message_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="BN_Timer" name="Timer" attachedToRef="Task_NiTimer" cancelActivity="false">
      <bpmn:timerEventDefinition id="BN_Timer_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="BN_Conditional" name="Conditional" attachedToRef="Task_NiConditional" cancelActivity="false">
      <bpmn:conditionalEventDefinition id="BN_Conditional_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="BN_Signal" name="Signal" attachedToRef="Task_NiSignal" cancelActivity="false">
      <bpmn:signalEventDefinition id="BN_Signal_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="BN_Escalation" name="Escalation" attachedToRef="Task_NiEscalation" cancelActivity="false">
      <bpmn:escalationEventDefinition id="BN_Escalation_def"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="BN_Multiple" name="Multiple" attachedToRef="Task_NiMultiple" cancelActivity="false">
      <bpmn:messageEventDefinition id="BN_Multiple_def1"/>
      <bpmn:signalEventDefinition id="BN_Multiple_def2"/>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="BN_ParallelMultiple" name="Parallel Multiple" attachedToRef="Task_NiParallelMultiple" cancelActivity="false" parallelMultiple="true">
      <bpmn:messageEventDefinition id="BN_ParallelMultiple_def1"/>
      <bpmn:timerEventDefinition id="BN_ParallelMultiple_def2"/>
    </bpmn:boundaryEvent>
  </bpmn:process>`,
  columns.flatMap(([host, event], i) => column(host, event, i)).join('\n')
);

/**
 * Non-interrupting boundary events — a DOUBLE thin circle with BOTH rings
 * dashed, unfilled (catch) glyphs, straddling the host activity's border.
 * Covers: message, timer, conditional, signal, escalation, multiple,
 * parallel multiple.
 */
export const All = {
  args: {
    xml: boundaryNonInterrupting
  }
};
