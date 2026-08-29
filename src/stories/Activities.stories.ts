import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Activities/Tasks',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

// ---------------------------------------------------------------------------
// All task-type glyphs, laid out in a 3x3 grid.
// ---------------------------------------------------------------------------

const TASK_W = 100;
const TASK_H = 80;
const COLS = 3;
const CELL_W = 180;
const CELL_H = 160;
const ORIGIN_X = 60;
const ORIGIN_Y = 60;

function cell(index: number) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return { x: ORIGIN_X + col * CELL_W, y: ORIGIN_Y + row * CELL_H };
}

const taskTypesXml = bpmnDefinitions(
  `  <bpmn:process id="Process_TaskTypes" isExecutable="false">
    <bpmn:task id="Task_Abstract" name="Task"/>
    <bpmn:userTask id="Task_User" name="User Task"/>
    <bpmn:serviceTask id="Task_Service" name="Service Task"/>
    <bpmn:scriptTask id="Task_Script" name="Script Task"/>
    <bpmn:manualTask id="Task_Manual" name="Manual Task"/>
    <bpmn:sendTask id="Task_Send" name="Send Task"/>
    <bpmn:receiveTask id="Task_Receive" name="Receive Task"/>
    <bpmn:businessRuleTask id="Task_BusinessRule" name="Business Rule Task"/>
    <bpmn:receiveTask id="Task_ReceiveInstantiate" name="Receive Task (instantiate)" instantiate="true"/>
  </bpmn:process>`,
  [
    'Task_Abstract',
    'Task_User',
    'Task_Service',
    'Task_Script',
    'Task_Manual',
    'Task_Send',
    'Task_Receive',
    'Task_BusinessRule',
    'Task_ReceiveInstantiate'
  ]
    .map((id, i) => {
      const { x, y } = cell(i);
      return shape(id, x, y, TASK_W, TASK_H);
    })
    .join('\n')
);

export const AllTypes = {
  args: {
    xml: taskTypesXml
  }
};

// ---------------------------------------------------------------------------
// Loop / multi-instance / compensation markers on tasks, laid out in a row.
// ---------------------------------------------------------------------------

const MARKER_CELL_W = 170;
const MARKER_ORIGIN_X = 60;
const MARKER_ORIGIN_Y = 60;

const markersXml = bpmnDefinitions(
  `  <bpmn:process id="Process_TaskMarkers" isExecutable="false">
    <bpmn:task id="Task_Loop" name="Standard Loop">
      <bpmn:standardLoopCharacteristics/>
    </bpmn:task>
    <bpmn:task id="Task_SeqMI" name="Sequential MI">
      <bpmn:multiInstanceLoopCharacteristics isSequential="true"/>
    </bpmn:task>
    <bpmn:task id="Task_ParMI" name="Parallel MI">
      <bpmn:multiInstanceLoopCharacteristics isSequential="false"/>
    </bpmn:task>
    <bpmn:task id="Task_Comp" name="Compensation" isForCompensation="true"/>
    <bpmn:task id="Task_LoopComp" name="Loop + Compensation" isForCompensation="true">
      <bpmn:standardLoopCharacteristics/>
    </bpmn:task>
  </bpmn:process>`,
  ['Task_Loop', 'Task_SeqMI', 'Task_ParMI', 'Task_Comp', 'Task_LoopComp']
    .map((id, i) => shape(id, MARKER_ORIGIN_X + i * MARKER_CELL_W, MARKER_ORIGIN_Y, TASK_W, TASK_H))
    .join('\n')
);

export const Markers = {
  args: {
    xml: markersXml
  }
};
