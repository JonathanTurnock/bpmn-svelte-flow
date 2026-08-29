import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Examples/End To End',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

// A realistic order-fulfilment process exercising many notation elements at
// once: pools, message start/end events, task types, an expanded sub-process,
// boundary events, gateways, data objects, a data store and annotations.
const orderProcess = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="Part_Shop" name="Web Shop" processRef="Process_1"/>
    <bpmn:participant id="Part_Customer" name="Customer"/>
    <bpmn:messageFlow id="MsgFlow_1" name="order" sourceRef="Part_Customer" targetRef="Start_1"/>
    <bpmn:messageFlow id="MsgFlow_2" name="confirmation" sourceRef="Task_Confirm" targetRef="Part_Customer"/>
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Order received">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
      <bpmn:messageEventDefinition id="StartMsgDef_1"/>
    </bpmn:startEvent>
    <bpmn:businessRuleTask id="Task_Check" name="Check fraud score">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:dataOutputAssociation id="DOA_1">
        <bpmn:targetRef>Store_1</bpmn:targetRef>
      </bpmn:dataOutputAssociation>
    </bpmn:businessRuleTask>
    <bpmn:exclusiveGateway id="Gw_Risk" name="Risky?" default="Flow_3">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="Task_Review" name="Review manually">
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:subProcess id="Sub_Fulfil" name="Fulfil order">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:incoming>Flow_5</bpmn:incoming>
      <bpmn:outgoing>Flow_6</bpmn:outgoing>
      <bpmn:startEvent id="Sub_Start" name="">
        <bpmn:outgoing>SubFlow_1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:serviceTask id="Sub_Pick" name="Pick items">
        <bpmn:incoming>SubFlow_1</bpmn:incoming>
        <bpmn:outgoing>SubFlow_2</bpmn:outgoing>
        <bpmn:multiInstanceLoopCharacteristics/>
      </bpmn:serviceTask>
      <bpmn:manualTask id="Sub_Pack" name="Pack parcel">
        <bpmn:incoming>SubFlow_2</bpmn:incoming>
        <bpmn:outgoing>SubFlow_3</bpmn:outgoing>
      </bpmn:manualTask>
      <bpmn:endEvent id="Sub_End" name="">
        <bpmn:incoming>SubFlow_3</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SubFlow_1" sourceRef="Sub_Start" targetRef="Sub_Pick"/>
      <bpmn:sequenceFlow id="SubFlow_2" sourceRef="Sub_Pick" targetRef="Sub_Pack"/>
      <bpmn:sequenceFlow id="SubFlow_3" sourceRef="Sub_Pack" targetRef="Sub_End"/>
    </bpmn:subProcess>
    <bpmn:boundaryEvent id="Bound_OutOfStock" name="Out of stock" attachedToRef="Sub_Fulfil" cancelActivity="false">
      <bpmn:outgoing>Flow_7</bpmn:outgoing>
      <bpmn:escalationEventDefinition id="BoundEscDef_1"/>
    </bpmn:boundaryEvent>
    <bpmn:sendTask id="Task_Notify" name="Notify customer of delay">
      <bpmn:incoming>Flow_7</bpmn:incoming>
      <bpmn:outgoing>Flow_8</bpmn:outgoing>
    </bpmn:sendTask>
    <bpmn:endEvent id="End_Delayed" name="Delay reported">
      <bpmn:incoming>Flow_8</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:serviceTask id="Task_Confirm" name="Send confirmation">
      <bpmn:incoming>Flow_6</bpmn:incoming>
      <bpmn:outgoing>Flow_9</bpmn:outgoing>
      <bpmn:dataInputAssociation id="DIA_1">
        <bpmn:sourceRef>Data_Invoice</bpmn:sourceRef>
      </bpmn:dataInputAssociation>
    </bpmn:serviceTask>
    <bpmn:dataObjectReference id="Data_Invoice" name="Invoice" dataObjectRef="DO_1"/>
    <bpmn:dataObject id="DO_1"/>
    <bpmn:dataStoreReference id="Store_1" name="Fraud DB"/>
    <bpmn:endEvent id="End_Done" name="Order fulfilled">
      <bpmn:incoming>Flow_9</bpmn:incoming>
      <bpmn:messageEventDefinition id="EndMsgDef_1"/>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_Check"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Check" targetRef="Gw_Risk"/>
    <bpmn:sequenceFlow id="Flow_3" name="no" sourceRef="Gw_Risk" targetRef="Sub_Fulfil"/>
    <bpmn:sequenceFlow id="Flow_4" name="yes" sourceRef="Gw_Risk" targetRef="Task_Review"/>
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_Review" targetRef="Sub_Fulfil"/>
    <bpmn:sequenceFlow id="Flow_6" sourceRef="Sub_Fulfil" targetRef="Task_Confirm"/>
    <bpmn:sequenceFlow id="Flow_7" sourceRef="Bound_OutOfStock" targetRef="Task_Notify"/>
    <bpmn:sequenceFlow id="Flow_8" sourceRef="Task_Notify" targetRef="End_Delayed"/>
    <bpmn:sequenceFlow id="Flow_9" sourceRef="Task_Confirm" targetRef="End_Done"/>
    <bpmn:textAnnotation id="Anno_1">
      <bpmn:text>Fraud checks use the shared scoring service</bpmn:text>
    </bpmn:textAnnotation>
    <bpmn:association id="Assoc_1" associationDirection="None" sourceRef="Task_Check" targetRef="Anno_1"/>
  </bpmn:process>`,
  [
    shape('Part_Customer', 160, 40, 1180, 60),
    shape('Part_Shop', 160, 160, 1180, 460),
    shape('Start_1', 232, 262, 36, 36),
    shape('Task_Check', 320, 240, 100, 80),
    shape('Gw_Risk', 475, 255, 50, 50, { label: [482, 232, 36, 14] }),
    shape('Task_Review', 450, 380, 100, 80),
    shape('Sub_Fulfil', 590, 200, 360, 180, { expanded: true }),
    shape('Sub_Start', 610, 272, 36, 36),
    shape('Sub_Pick', 680, 250, 100, 80),
    shape('Sub_Pack', 800, 250, 100, 80),
    shape('Sub_End', 912, 272, 36, 36),
    shape('Bound_OutOfStock', 752, 362, 36, 36, { label: [700, 402, 90, 14] }),
    shape('Task_Notify', 830, 460, 100, 80),
    shape('End_Delayed', 990, 482, 36, 36),
    shape('Task_Confirm', 1010, 240, 100, 80),
    shape('Data_Invoice', 1040, 380, 36, 50, { label: [1030, 434, 60, 14] }),
    shape('Store_1', 310, 420, 50, 50, { label: [305, 474, 60, 14] }),
    shape('End_Done', 1180, 262, 36, 36),
    shape('Anno_1', 240, 150, 200, 40),
    edge('MsgFlow_1', [
      [250, 100],
      [250, 262]
    ]),
    edge('MsgFlow_2', [
      [1060, 240],
      [1060, 100]
    ]),
    edge('Flow_1', [
      [268, 280],
      [320, 280]
    ]),
    edge('Flow_2', [
      [420, 280],
      [475, 280]
    ]),
    edge('Flow_3', [
      [525, 280],
      [590, 280]
    ]),
    edge('Flow_4', [
      [500, 305],
      [500, 380]
    ]),
    edge('Flow_5', [
      [550, 420],
      [770, 420],
      [770, 380]
    ]),
    edge('Flow_6', [
      [950, 280],
      [1010, 280]
    ]),
    edge('Flow_7', [
      [770, 398],
      [770, 500],
      [830, 500]
    ]),
    edge('Flow_8', [
      [930, 500],
      [990, 500]
    ]),
    edge('Flow_9', [
      [1110, 280],
      [1180, 280]
    ]),
    edge('SubFlow_1', [
      [646, 290],
      [680, 290]
    ]),
    edge('SubFlow_2', [
      [780, 290],
      [800, 290]
    ]),
    edge('SubFlow_3', [
      [900, 290],
      [912, 290]
    ]),
    edge('DOA_1', [
      [345, 320],
      [335, 420]
    ]),
    edge('DIA_1', [
      [1058, 380],
      [1058, 320]
    ]),
    edge('Assoc_1', [
      [360, 240],
      [345, 190]
    ])
  ].join('\n')
);

export const OrderFulfilment = {
  args: {
    xml: orderProcess
  }
};
