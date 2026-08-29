import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Overview/Simple Process',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

const simpleProcess = bpmnDefinitions(
  `  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Order received">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="Review order">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_1" name="Approved?">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Task_2" name="Ship order">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_1" name="Order shipped">
      <bpmn:incoming>Flow_5</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_2" name="Order rejected">
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Gateway_1"/>
    <bpmn:sequenceFlow id="Flow_3" name="yes" sourceRef="Gateway_1" targetRef="Task_2"/>
    <bpmn:sequenceFlow id="Flow_4" name="no" sourceRef="Gateway_1" targetRef="End_2"/>
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('Start_1', 152, 182, 36, 36),
    shape('Task_1', 240, 160, 100, 80),
    shape('Gateway_1', 395, 175, 50, 50, { label: [378, 148, 84, 14] }),
    shape('Task_2', 500, 160, 100, 80),
    shape('End_1', 652, 182, 36, 36),
    shape('End_2', 402, 292, 36, 36),
    edge('Flow_1', [
      [188, 200],
      [240, 200]
    ]),
    edge('Flow_2', [
      [340, 200],
      [395, 200]
    ]),
    edge('Flow_3', [
      [445, 200],
      [500, 200]
    ]),
    edge('Flow_4', [
      [420, 225],
      [420, 292]
    ]),
    edge('Flow_5', [
      [600, 200],
      [652, 200]
    ])
  ].join('\n')
);

export const SimpleProcess = {
  args: {
    xml: simpleProcess
  }
};
