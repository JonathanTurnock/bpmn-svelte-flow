import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Elements/Gateways',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

// ---------------------------------------------------------------------------
// 1. All gateway types side by side.
// ---------------------------------------------------------------------------

const allGatewayTypes = bpmnDefinitions(
  `  <bpmn:process id="Process_Gateways" isExecutable="false">
    <bpmn:exclusiveGateway id="GW_Exclusive" name="Exclusive"/>
    <bpmn:inclusiveGateway id="GW_Inclusive" name="Inclusive"/>
    <bpmn:parallelGateway id="GW_Parallel" name="Parallel"/>
    <bpmn:complexGateway id="GW_Complex" name="Complex"/>
    <bpmn:eventBasedGateway id="GW_EventBased" name="Event-based"/>
    <bpmn:eventBasedGateway id="GW_EventBasedExclusive" name="Event-based&#10;(instantiate)" instantiate="true"/>
    <bpmn:eventBasedGateway id="GW_EventBasedParallel" name="Event-based&#10;(parallel)" eventGatewayType="Parallel" instantiate="true"/>
  </bpmn:process>`,
  [
    shape('GW_Exclusive', 60, 100, 50, 50),
    shape('GW_Inclusive', 240, 100, 50, 50),
    shape('GW_Parallel', 420, 100, 50, 50),
    shape('GW_Complex', 600, 100, 50, 50),
    shape('GW_EventBased', 780, 100, 50, 50),
    shape('GW_EventBasedExclusive', 960, 100, 50, 50),
    shape('GW_EventBasedParallel', 1140, 100, 50, 50)
  ].join('\n')
);

export const AllGatewayTypes = {
  args: {
    xml: allGatewayTypes
  }
};

// ---------------------------------------------------------------------------
// 2. Exclusive gateway with a default flow + labeled conditional path, plus a
//    task-sourced conditional flow (diamond only renders when the sequence
//    flow's source is an activity, never a gateway).
// ---------------------------------------------------------------------------

const defaultAndConditionalFlow = bpmnDefinitions(
  `  <bpmn:process id="Process_DefaultConditional" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Order received">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_Review" name="Review order">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_1" name="Approved?" default="Flow_Default">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_Default</bpmn:outgoing>
      <bpmn:outgoing>Flow_NeedsReview</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Task_Ship" name="Ship order">
      <bpmn:incoming>Flow_Default</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_ManualReview" name="Manual review">
      <bpmn:incoming>Flow_NeedsReview</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_Shipped" name="Order shipped">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Escalated" name="Escalated">
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_Review"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Review" targetRef="Gateway_1"/>
    <bpmn:sequenceFlow id="Flow_Default" name="approved" sourceRef="Gateway_1" targetRef="Task_Ship"/>
    <bpmn:sequenceFlow id="Flow_NeedsReview" name="needs review" sourceRef="Gateway_1" targetRef="Task_ManualReview"/>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_Ship" targetRef="End_Shipped"/>
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_ManualReview" targetRef="End_Escalated"/>

    <bpmn:userTask id="Task_CheckStock" name="Check stock">
      <bpmn:outgoing>Flow_Stock</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="Task_Fulfil" name="Fulfil order">
      <bpmn:incoming>Flow_Stock</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_Fulfilled" name="Fulfilled">
      <bpmn:incoming>Flow_5</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Stock" name="in stock" sourceRef="Task_CheckStock" targetRef="Task_Fulfil">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">stockLevel &gt; 0</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_Fulfil" targetRef="End_Fulfilled"/>
  </bpmn:process>`,
  [
    shape('Start_1', 40, 160, 36, 36),
    shape('Task_Review', 120, 140, 100, 80),
    shape('Gateway_1', 270, 145, 50, 50),
    shape('Task_Ship', 380, 40, 100, 80),
    shape('Task_ManualReview', 380, 220, 100, 80),
    shape('End_Shipped', 540, 60, 36, 36),
    shape('End_Escalated', 540, 240, 36, 36),
    edge('Flow_1', [
      [76, 178],
      [120, 180]
    ]),
    edge('Flow_2', [
      [220, 180],
      [270, 170]
    ]),
    edge('Flow_Default', [
      [320, 170],
      [350, 80],
      [380, 80]
    ]),
    edge('Flow_NeedsReview', [
      [320, 170],
      [350, 260],
      [380, 260]
    ]),
    edge('Flow_3', [
      [480, 80],
      [540, 78]
    ]),
    edge('Flow_4', [
      [480, 260],
      [540, 258]
    ]),

    shape('Task_CheckStock', 120, 360, 100, 80),
    shape('Task_Fulfil', 320, 360, 100, 80),
    shape('End_Fulfilled', 480, 380, 36, 36),
    edge('Flow_Stock', [
      [220, 400],
      [320, 400]
    ]),
    edge('Flow_5', [
      [420, 400],
      [480, 398]
    ])
  ].join('\n')
);

export const DefaultAndConditionalFlow = {
  args: {
    xml: defaultAndConditionalFlow
  }
};

// ---------------------------------------------------------------------------
// 3. Event-based gateway in context: deferred choice between a message and a
//    timer intermediate catch event.
// ---------------------------------------------------------------------------

const eventBasedGatewayInContext = bpmnDefinitions(
  `  <bpmn:process id="Process_EventBasedGateway" isExecutable="false">
    <bpmn:userTask id="Task_Request" name="Request info">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:eventBasedGateway id="Gateway_2" name="Wait for response">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_ToMessage</bpmn:outgoing>
      <bpmn:outgoing>Flow_ToTimer</bpmn:outgoing>
    </bpmn:eventBasedGateway>
    <bpmn:intermediateCatchEvent id="Catch_Message" name="Response received">
      <bpmn:incoming>Flow_ToMessage</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:messageEventDefinition id="MessageEventDefinition_1"/>
    </bpmn:intermediateCatchEvent>
    <bpmn:intermediateCatchEvent id="Catch_Timer" name="Timeout">
      <bpmn:incoming>Flow_ToTimer</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
      <bpmn:timerEventDefinition id="TimerEventDefinition_1"/>
    </bpmn:intermediateCatchEvent>
    <bpmn:serviceTask id="Task_Handle" name="Handle response">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_Escalate" name="Escalate">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_A" name="Handled">
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_B" name="Escalated">
      <bpmn:incoming>Flow_5</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_Request" targetRef="Gateway_2"/>
    <bpmn:sequenceFlow id="Flow_ToMessage" sourceRef="Gateway_2" targetRef="Catch_Message"/>
    <bpmn:sequenceFlow id="Flow_ToTimer" sourceRef="Gateway_2" targetRef="Catch_Timer"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Catch_Message" targetRef="Task_Handle"/>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Catch_Timer" targetRef="Task_Escalate"/>
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_Handle" targetRef="End_A"/>
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_Escalate" targetRef="End_B"/>
  </bpmn:process>`,
  [
    shape('Task_Request', 80, 140, 100, 80),
    shape('Gateway_2', 240, 145, 50, 50, { label: [222, 118, 86, 24] }),
    shape('Catch_Message', 360, 80, 36, 36),
    shape('Catch_Timer', 360, 220, 36, 36),
    shape('Task_Handle', 460, 60, 100, 80),
    shape('Task_Escalate', 460, 200, 100, 80),
    shape('End_A', 620, 80, 36, 36),
    shape('End_B', 620, 220, 36, 36),
    edge('Flow_1', [
      [180, 180],
      [240, 170]
    ]),
    edge('Flow_ToMessage', [
      [290, 170],
      [320, 98],
      [360, 98]
    ]),
    edge('Flow_ToTimer', [
      [290, 170],
      [320, 238],
      [360, 238]
    ]),
    edge('Flow_2', [
      [396, 98],
      [460, 98]
    ]),
    edge('Flow_3', [
      [396, 238],
      [460, 238]
    ]),
    edge('Flow_4', [
      [560, 98],
      [620, 98]
    ]),
    edge('Flow_5', [
      [560, 238],
      [620, 238]
    ])
  ].join('\n')
);

export const EventBasedGatewayInContext = {
  args: {
    xml: eventBasedGatewayInContext
  }
};
