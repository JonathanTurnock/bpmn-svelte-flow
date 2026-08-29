import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, eventShape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Start Events',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};


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
    .map((id, i) => eventShape(id, i))
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
