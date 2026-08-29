import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Event SubProcess Start Interrupting',
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
  'ES_Message',
  'ES_Timer',
  'ES_Conditional',
  'ES_Signal',
  'ES_Error',
  'ES_Escalation',
  'ES_Compensation',
  'ES_Multiple',
  'ES_ParallelMultiple'
];

const interruptingEventSubProcess = bpmnDefinitions(
  `  <bpmn:process id="Process_EventSubStartInterrupting" isExecutable="false">
    <bpmn:subProcess id="EventSub_1" name="Event Sub-Process — interrupting start events" triggeredByEvent="true">
      <bpmn:startEvent id="ES_Message" name="Message" isInterrupting="true">
        <bpmn:messageEventDefinition id="ES_Message_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="ES_Timer" name="Timer" isInterrupting="true">
        <bpmn:timerEventDefinition id="ES_Timer_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="ES_Conditional" name="Conditional" isInterrupting="true">
        <bpmn:conditionalEventDefinition id="ES_Conditional_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="ES_Signal" name="Signal" isInterrupting="true">
        <bpmn:signalEventDefinition id="ES_Signal_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="ES_Error" name="Error" isInterrupting="true">
        <bpmn:errorEventDefinition id="ES_Error_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="ES_Escalation" name="Escalation" isInterrupting="true">
        <bpmn:escalationEventDefinition id="ES_Escalation_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="ES_Compensation" name="Compensation" isInterrupting="true">
        <bpmn:compensateEventDefinition id="ES_Compensation_def"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="ES_Multiple" name="Multiple" isInterrupting="true">
        <bpmn:messageEventDefinition id="ES_Multiple_def1"/>
        <bpmn:signalEventDefinition id="ES_Multiple_def2"/>
      </bpmn:startEvent>
      <bpmn:startEvent id="ES_ParallelMultiple" name="Parallel Multiple" isInterrupting="true" parallelMultiple="true">
        <bpmn:messageEventDefinition id="ES_ParallelMultiple_def1"/>
        <bpmn:timerEventDefinition id="ES_ParallelMultiple_def2"/>
      </bpmn:startEvent>
    </bpmn:subProcess>
  </bpmn:process>`,
  [
    shape('EventSub_1', 50, 45, 920, 190, { expanded: true }),
    ...ids.map((id, i) => evShape(id, i))
  ].join('\n')
);

/**
 * Interrupting event sub-process start events — a single THIN SOLID circle with
 * an unfilled (catch) glyph.
 * Covers: message, timer, conditional, signal, error, escalation, compensation,
 * multiple, parallel multiple.
 */
export const All = {
  args: {
    xml: interruptingEventSubProcess
  }
};
