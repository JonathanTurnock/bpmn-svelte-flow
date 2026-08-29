import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Start Events',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

const EV = 36;
const SPACING = 100;

/** DI shape for a 36x36 event in column `i`, with a centred label below it. */
function evShape(id: string, i: number, x0 = 60, y = 90): string {
  const x = x0 + i * SPACING;
  return shape(id, x, y, EV, EV, { label: [x + EV / 2 - 48, y + EV + 8, 96, 26] });
}

const startEvents = bpmnDefinitions(
  `  <bpmn:process id="Process_StartEvents" isExecutable="false">
    <bpmn:startEvent id="S_None" name="None"/>
    <bpmn:startEvent id="S_Message" name="Message">
      <bpmn:messageEventDefinition id="S_Message_def"/>
    </bpmn:startEvent>
    <bpmn:startEvent id="S_Timer" name="Timer">
      <bpmn:timerEventDefinition id="S_Timer_def"/>
    </bpmn:startEvent>
    <bpmn:startEvent id="S_Conditional" name="Conditional">
      <bpmn:conditionalEventDefinition id="S_Conditional_def"/>
    </bpmn:startEvent>
    <bpmn:startEvent id="S_Signal" name="Signal">
      <bpmn:signalEventDefinition id="S_Signal_def"/>
    </bpmn:startEvent>
    <bpmn:startEvent id="S_Multiple" name="Multiple">
      <bpmn:messageEventDefinition id="S_Multiple_def1"/>
      <bpmn:signalEventDefinition id="S_Multiple_def2"/>
    </bpmn:startEvent>
    <bpmn:startEvent id="S_ParallelMultiple" name="Parallel Multiple" parallelMultiple="true">
      <bpmn:messageEventDefinition id="S_ParallelMultiple_def1"/>
      <bpmn:timerEventDefinition id="S_ParallelMultiple_def2"/>
    </bpmn:startEvent>
  </bpmn:process>`,
  [
    'S_None',
    'S_Message',
    'S_Timer',
    'S_Conditional',
    'S_Signal',
    'S_Multiple',
    'S_ParallelMultiple'
  ]
    .map((id, i) => evShape(id, i))
    .join('\n')
);

/**
 * Top-level start events — a single THIN circle with an unfilled (catch) glyph.
 * Covers: none, message, timer, conditional, signal, multiple, parallel multiple.
 */
export const All = {
  args: {
    xml: startEvents
  }
};
