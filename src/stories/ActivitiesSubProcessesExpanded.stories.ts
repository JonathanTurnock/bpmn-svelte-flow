import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Activities/Sub-Processes Expanded',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

// Four expanded containers, each isExpanded on its BPMNShape DI. Children are
// plain plane elements with absolute DI coordinates inside the parent bounds
// -- BpmnDiagram renders a flat node list positioned in absolute canvas
// space, with z-index (computed by the frozen transform) stacking containers
// beneath their contents, so no parent/child nesting is needed here.

const xml = bpmnDefinitions(
  `  <bpmn:process id="Process_SubProcessesExpanded" isExecutable="false">
    <bpmn:subProcess id="Embedded_1" name="Embedded Sub-Process">
      <bpmn:startEvent id="Embedded_Start" name="Start">
        <bpmn:outgoing>Embedded_Flow1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:task id="Embedded_Task" name="Do Work">
        <bpmn:incoming>Embedded_Flow1</bpmn:incoming>
        <bpmn:outgoing>Embedded_Flow2</bpmn:outgoing>
      </bpmn:task>
      <bpmn:endEvent id="Embedded_End" name="End">
        <bpmn:incoming>Embedded_Flow2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="Embedded_Flow1" sourceRef="Embedded_Start" targetRef="Embedded_Task"/>
      <bpmn:sequenceFlow id="Embedded_Flow2" sourceRef="Embedded_Task" targetRef="Embedded_End"/>
    </bpmn:subProcess>
    <bpmn:adHocSubProcess id="AdHoc_1" name="Ad-hoc Sub-Process">
      <bpmn:task id="AdHoc_Task" name="Step"/>
    </bpmn:adHocSubProcess>
    <bpmn:transaction id="Transaction_1" name="Transaction">
      <bpmn:startEvent id="Transaction_Start" name="Start">
        <bpmn:outgoing>Transaction_Flow1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:task id="Transaction_Task" name="Do Work">
        <bpmn:incoming>Transaction_Flow1</bpmn:incoming>
        <bpmn:outgoing>Transaction_Flow2</bpmn:outgoing>
      </bpmn:task>
      <bpmn:endEvent id="Transaction_End" name="End">
        <bpmn:incoming>Transaction_Flow2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="Transaction_Flow1" sourceRef="Transaction_Start" targetRef="Transaction_Task"/>
      <bpmn:sequenceFlow id="Transaction_Flow2" sourceRef="Transaction_Task" targetRef="Transaction_End"/>
    </bpmn:transaction>
    <bpmn:subProcess id="EventSub_1" name="Event Sub-Process" triggeredByEvent="true">
      <bpmn:startEvent id="EventSub_Start" name="Message received">
        <bpmn:messageEventDefinition/>
      </bpmn:startEvent>
    </bpmn:subProcess>
  </bpmn:process>`,
  [
    // Embedded sub-process container + children.
    shape('Embedded_1', 60, 300, 380, 200, { expanded: true }),
    shape('Embedded_Start', 100, 382, 36, 36),
    shape('Embedded_Task', 190, 360, 100, 80),
    shape('Embedded_End', 360, 382, 36, 36),
    edge('Embedded_Flow1', [
      [136, 400],
      [190, 400]
    ]),
    edge('Embedded_Flow2', [
      [290, 400],
      [360, 400]
    ]),

    // Ad-hoc sub-process container + single step (tilde marker at bottom).
    shape('AdHoc_1', 480, 300, 300, 200, { expanded: true }),
    shape('AdHoc_Task', 575, 355, 110, 90),

    // Expanded transaction (double border) container + children.
    shape('Transaction_1', 60, 560, 380, 200, { expanded: true }),
    shape('Transaction_Start', 100, 642, 36, 36),
    shape('Transaction_Task', 190, 620, 100, 80),
    shape('Transaction_End', 360, 642, 36, 36),
    edge('Transaction_Flow1', [
      [136, 660],
      [190, 660]
    ]),
    edge('Transaction_Flow2', [
      [290, 660],
      [360, 660]
    ]),

    // Expanded event sub-process (dotted border) with a message start event.
    shape('EventSub_1', 480, 560, 300, 200, { expanded: true }),
    shape('EventSub_Start', 612, 642, 36, 36)
  ].join('\n')
);

export const AllVariants = {
  args: {
    xml
  }
};
