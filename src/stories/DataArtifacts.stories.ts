import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Elements/Data & Artifacts',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

// ---------------------------------------------------------------------------
// 1. Data elements row: data object, collection data object, data input,
//    data output, data store.
// ---------------------------------------------------------------------------

const dataElements = bpmnDefinitions(
  `  <bpmn:process id="Process_DataElements" isExecutable="false">
    <bpmn:ioSpecification id="IoSpec_1">
      <bpmn:dataInput id="DataInput_1" name="Input data"/>
      <bpmn:dataOutput id="DataOutput_1" name="Output data"/>
    </bpmn:ioSpecification>
    <bpmn:dataObject id="DataObject_1"/>
    <bpmn:dataObjectReference id="DataObjectRef_1" name="Order" dataObjectRef="DataObject_1"/>
    <bpmn:dataObject id="DataObject_2" isCollection="true"/>
    <bpmn:dataObjectReference id="DataObjectRef_2" name="Orders&#10;(collection)" dataObjectRef="DataObject_2"/>
    <bpmn:dataStoreReference id="DataStoreRef_1" name="Order store"/>
  </bpmn:process>`,
  [
    shape('DataObjectRef_1', 60, 40, 36, 50),
    shape('DataObjectRef_2', 220, 40, 36, 50),
    shape('DataInput_1', 380, 40, 36, 50),
    shape('DataOutput_1', 540, 40, 36, 50),
    shape('DataStoreRef_1', 690, 35, 50, 50)
  ].join('\n')
);

export const DataElements = {
  args: {
    xml: dataElements
  }
};

// ---------------------------------------------------------------------------
// 2. Data associations: a task consuming a data object and producing into a
//    data store (dotted lines, thin open-V arrowheads).
// ---------------------------------------------------------------------------

const dataAssociations = bpmnDefinitions(
  `  <bpmn:process id="Process_DataAssociations" isExecutable="false">
    <bpmn:dataObject id="DataObject_3"/>
    <bpmn:dataObjectReference id="Data_1" name="Invoice" dataObjectRef="DataObject_3"/>
    <bpmn:dataStoreReference id="Store_1" name="Archive"/>
    <bpmn:task id="Task_DA" name="Process invoice">
      <bpmn:dataInputAssociation id="DIA1">
        <bpmn:sourceRef>Data_1</bpmn:sourceRef>
      </bpmn:dataInputAssociation>
      <bpmn:dataOutputAssociation id="DOA1">
        <bpmn:targetRef>Store_1</bpmn:targetRef>
      </bpmn:dataOutputAssociation>
    </bpmn:task>
  </bpmn:process>`,
  [
    shape('Data_1', 60, 20, 36, 50),
    shape('Task_DA', 240, 140, 120, 80),
    shape('Store_1', 500, 145, 50, 50),
    edge('DIA1', [
      [96, 70],
      [180, 70],
      [180, 160],
      [240, 165]
    ]),
    edge('DOA1', [
      [360, 175],
      [430, 170],
      [500, 170]
    ])
  ].join('\n')
);

export const DataAssociations = {
  args: {
    xml: dataAssociations
  }
};

// ---------------------------------------------------------------------------
// 3. Text annotation attached to a task via an association (dotted line, no
//    arrowheads since associationDirection="None").
// ---------------------------------------------------------------------------

const textAnnotation = bpmnDefinitions(
  `  <bpmn:process id="Process_TextAnnotation" isExecutable="false">
    <bpmn:task id="Task_TA" name="Approve request"/>
    <bpmn:textAnnotation id="Annotation_1">
      <bpmn:text>Requires manager sign-off&#10;for orders over $10k</bpmn:text>
    </bpmn:textAnnotation>
    <bpmn:association id="Assoc_1" associationDirection="None" sourceRef="Task_TA" targetRef="Annotation_1"/>
  </bpmn:process>`,
  [
    shape('Task_TA', 140, 100, 100, 80),
    shape('Annotation_1', 300, 40, 180, 56),
    edge('Assoc_1', [
      [220, 120],
      [300, 68]
    ])
  ].join('\n')
);

export const TextAnnotation = {
  args: {
    xml: textAnnotation
  }
};

// ---------------------------------------------------------------------------
// 4. Group: a non-constraining dash-dot rounded rectangle labeled with its
//    category value, surrounding a couple of tasks.
// ---------------------------------------------------------------------------

const group = bpmnDefinitions(
  `  <bpmn:category id="Cat_1">
    <bpmn:categoryValue id="CatVal_1" value="Region of interest"/>
  </bpmn:category>
  <bpmn:process id="Process_Group" isExecutable="false">
    <bpmn:task id="Task_G1" name="Draft"/>
    <bpmn:task id="Task_G2" name="Review"/>
    <bpmn:sequenceFlow id="Flow_G1" sourceRef="Task_G1" targetRef="Task_G2"/>
    <bpmn:group id="Group_1" categoryValueRef="CatVal_1"/>
  </bpmn:process>`,
  [
    shape('Group_1', 40, 30, 400, 200),
    shape('Task_G1', 80, 100, 100, 80),
    shape('Task_G2', 280, 100, 100, 80),
    edge('Flow_G1', [
      [180, 140],
      [280, 140]
    ])
  ].join('\n')
);

export const Group = {
  args: {
    xml: group
  }
};
