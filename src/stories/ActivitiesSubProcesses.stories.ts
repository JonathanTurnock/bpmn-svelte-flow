import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Activities/Sub-Processes Collapsed',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

const SUB_W = 140;
const SUB_H = 100;
const CELL_W = 220;
const CELL_H = 200;
const COLS = 3;
const ORIGIN_X = 60;
const ORIGIN_Y = 60;

function cell(index: number) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return { x: ORIGIN_X + col * CELL_W, y: ORIGIN_Y + row * CELL_H };
}

const xml = bpmnDefinitions(
  `  <bpmn:process id="Process_SubProcessesCollapsed" isExecutable="false">
    <bpmn:subProcess id="Sub_Plain" name="Sub-Process"/>
    <bpmn:subProcess id="Sub_Loop" name="Loop Sub-Process">
      <bpmn:standardLoopCharacteristics/>
    </bpmn:subProcess>
    <bpmn:subProcess id="Sub_MI" name="Multi-Instance Sub-Process">
      <bpmn:multiInstanceLoopCharacteristics isSequential="false"/>
    </bpmn:subProcess>
    <bpmn:adHocSubProcess id="Sub_AdHoc" name="Ad-hoc Sub-Process"/>
    <bpmn:subProcess id="Sub_Event" name="Event Sub-Process" triggeredByEvent="true"/>
    <bpmn:transaction id="Sub_Transaction" name="Transaction"/>
  </bpmn:process>`,
  ['Sub_Plain', 'Sub_Loop', 'Sub_MI', 'Sub_AdHoc', 'Sub_Event', 'Sub_Transaction']
    .map((id, i) => {
      const { x, y } = cell(i);
      return shape(id, x, y, SUB_W, SUB_H);
    })
    .join('\n')
);

export const AllVariants = {
  args: {
    xml
  }
};
