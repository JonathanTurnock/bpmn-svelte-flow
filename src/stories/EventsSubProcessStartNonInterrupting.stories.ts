import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Event SubProcess Start Non Interrupting',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

const EV = 36;
const SPACING = 100;

function evShape(id: string, i: number, x0 = 90, y = 110): string {
  const x = x0 + i * SPACING;
  return shape(id, x, y, EV, EV, { label: [x + EV / 2 - 48, y + EV + 8, 96, 26] });
}

const ids = [
  'NI_Message',
  'NI_Timer',
  'NI_Conditional',
  'NI_Signal',
  'NI_Escalation',
  'NI_Multiple',
  'NI_ParallelMultiple'
];

const nonInterruptingEventSubProcess = bpmnDefinitions(
  `  <bpmn:process id="Process_EventSubStartNonInterrupting" isExecutable="false">
    <bpmn:subProcess id="EventSub_2" name="Event Sub-Process — non-interrupting start events" triggeredByEvent="true">
      <bpmn:startEvent id="NI_Message" name="Message" isInterrupting="false">
        <bpmn:messageEventDefinition id="NI_Message_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="NI_Timer" name="Timer" isInterrupting="false">
        <bpmn:timerEventDefinition id="NI_Timer_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="NI_Conditional" name="Conditional" isInterrupting="false">
        <bpmn:conditionalEventDefinition id="NI_Conditional_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="NI_Signal" name="Signal" isInterrupting="false">
        <bpmn:signalEventDefinition id="NI_Signal_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="NI_Escalation" name="Escalation" isInterrupting="false">
        <bpmn:escalationEventDefinition id="NI_Escalation_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="NI_Multiple" name="Multiple" isInterrupting="false">
        <bpmn:messageEventDefinition id="NI_Multiple_def1"/>
        <bpmn:signalEventDefinition id="NI_Multiple_def2"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="NI_ParallelMultiple" name="Parallel Multiple" isInterrupting="false" parallelMultiple="true">
        <bpmn:messageEventDefinition id="NI_ParallelMultiple_def1"/>
        <bpmn:timerEventDefinition id="NI_ParallelMultiple_def2"/>
      </bpmn:startEvent>
    </bpmn:subProcess>
  </bpmn:process>`,
  [
    shape('EventSub_2', 50, 50, 720, 160, { expanded: true }),
    ...ids.map((id, i) => evShape(id, i))
  ].join('\n')
);

/**
 * Non-interrupting event sub-process start events — a single THIN DASHED circle
 * with an unfilled (catch) glyph.
 * Covers: message, timer, conditional, signal, escalation, multiple,
 * parallel multiple.
 */
export const All = {
  args: {
    xml: nonInterruptingEventSubProcess
  }
};
