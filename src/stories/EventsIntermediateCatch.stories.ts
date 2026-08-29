import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, eventShape } from './helpers/bpmn-xml.js';

export default {
  title: 'Events/Intermediate Catch Events',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};


const ids = [
  'IC_Message',
  'IC_Timer',
  'IC_Conditional',
  'IC_Signal',
  'IC_Link',
  'IC_Multiple',
  'IC_ParallelMultiple'
];

const intermediateCatch = bpmnDefinitions(
  `  <bpmn:process id="Process_IntermediateCatch" isExecutable="false">
    <bpmn:intermediateCatchEvent id="IC_Message" name="Message">
      <bpmn:messageEventDefinition id="IC_Message_def"/>
    </bpmn:intermediateCatchEvent>
    <bpmn:intermediateCatchEvent id="IC_Timer" name="Timer">
      <bpmn:timerEventDefinition id="IC_Timer_def"/>
    </bpmn:intermediateCatchEvent>
    <bpmn:intermediateCatchEvent id="IC_Conditional" name="Conditional">
      <bpmn:conditionalEventDefinition id="IC_Conditional_def"/>
    </bpmn:intermediateCatchEvent>
    <bpmn:intermediateCatchEvent id="IC_Signal" name="Signal">
      <bpmn:signalEventDefinition id="IC_Signal_def"/>
    </bpmn:intermediateCatchEvent>
    <bpmn:intermediateCatchEvent id="IC_Link" name="Link">
      <bpmn:linkEventDefinition id="IC_Link_def" name="LinkA"/>
    </bpmn:intermediateCatchEvent>
    <bpmn:intermediateCatchEvent id="IC_Multiple" name="Multiple">
      <bpmn:messageEventDefinition id="IC_Multiple_def1"/>
      <bpmn:signalEventDefinition id="IC_Multiple_def2"/>
    </bpmn:intermediateCatchEvent>
    <bpmn:intermediateCatchEvent id="IC_ParallelMultiple" name="Parallel Multiple" parallelMultiple="true">
      <bpmn:messageEventDefinition id="IC_ParallelMultiple_def1"/>
      <bpmn:timerEventDefinition id="IC_ParallelMultiple_def2"/>
    </bpmn:intermediateCatchEvent>
  </bpmn:process>`,
  ids.map((id, i) => eventShape(id, i)).join('\n')
);

/**
 * Intermediate catch events — a DOUBLE thin circle with unfilled (catch) glyphs.
 * Covers: message, timer, conditional, signal, link, multiple, parallel multiple.
 */
export const All = {
  args: {
    xml: intermediateCatch
  }
};
