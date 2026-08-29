import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Activities/Call Activities',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

// Call activities always render with a thick border. Collapsed (the only
// state that's valid for a call activity) also gets the sub-process "+"
// marker. The glyph is deliberately plain -- a call activity references a
// global task/process, and per spec carries no corner glyph of its own.

const CALL_W = 120;
const CALL_H = 90;

const xml = bpmnDefinitions(
  `  <bpmn:process id="Process_CallActivities" isExecutable="false">
    <bpmn:callActivity id="Call_Plain" name="Call Activity"/>
    <bpmn:callActivity id="Call_GlobalTask" name="Call Activity (Global Task)"/>
    <bpmn:callActivity id="Call_SeqMI" name="Call Activity + Sequential MI">
      <bpmn:multiInstanceLoopCharacteristics isSequential="true"/>
    </bpmn:callActivity>
    <bpmn:callActivity id="Call_ParMI" name="Call Activity + Parallel MI">
      <bpmn:multiInstanceLoopCharacteristics isSequential="false"/>
    </bpmn:callActivity>
  </bpmn:process>`,
  ['Call_Plain', 'Call_GlobalTask', 'Call_SeqMI', 'Call_ParMI']
    .map((id, i) => shape(id, 60 + i * 200, 60, CALL_W, CALL_H))
    .join('\n')
);

export const AllVariants = {
  args: {
    xml
  }
};
