import BpmnSimulator from '../lib/components/BpmnSimulator.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Simulation/Token Simulation',
  component: BpmnSimulator,
  args: {
    height: '100vh'
  }
};

// ---------------------------------------------------------------------------
// Payload-driven routing through an exclusive gateway. The gateway's
// JavaScript attachment inspects the payload and picks the outgoing flow.
// ---------------------------------------------------------------------------
const approvalXml = bpmnDefinitions(
  `  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Claim received">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:businessRuleTask id="Task_Score" name="Score claim">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:businessRuleTask>
    <bpmn:exclusiveGateway id="Gw_Amount" name="Large claim?" default="Flow_auto">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_auto</bpmn:outgoing>
      <bpmn:outgoing>Flow_manual</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Task_Auto" name="Auto-approve">
      <bpmn:incoming>Flow_auto</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_Manual" name="Manual review">
      <bpmn:incoming>Flow_manual</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gw_Merge">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:endEvent id="End_1" name="Claim settled">
      <bpmn:incoming>Flow_5</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_Score"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Score" targetRef="Gw_Amount"/>
    <bpmn:sequenceFlow id="Flow_auto" name="small" sourceRef="Gw_Amount" targetRef="Task_Auto"/>
    <bpmn:sequenceFlow id="Flow_manual" name="large" sourceRef="Gw_Amount" targetRef="Task_Manual"/>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_Auto" targetRef="Gw_Merge"/>
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_Manual" targetRef="Gw_Merge"/>
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Gw_Merge" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('Start_1', 152, 202, 36, 36),
    shape('Task_Score', 240, 180, 100, 80),
    shape('Gw_Amount', 395, 195, 50, 50, { label: [385, 168, 70, 14] }),
    shape('Task_Auto', 500, 120, 100, 80),
    shape('Task_Manual', 500, 280, 100, 80),
    shape('Gw_Merge', 655, 195, 50, 50),
    shape('End_1', 760, 202, 36, 36),
    edge('Flow_1', [
      [188, 220],
      [240, 220]
    ]),
    edge('Flow_2', [
      [340, 220],
      [395, 220]
    ]),
    edge('Flow_auto', [
      [420, 195],
      [420, 160],
      [500, 160]
    ]),
    edge('Flow_manual', [
      [420, 245],
      [420, 320],
      [500, 320]
    ]),
    edge('Flow_3', [
      [600, 160],
      [680, 160],
      [680, 195]
    ]),
    edge('Flow_4', [
      [600, 320],
      [680, 320],
      [680, 245]
    ]),
    edge('Flow_5', [
      [705, 220],
      [760, 220]
    ])
  ].join('\n')
);

// ---------------------------------------------------------------------------
// Fully executable workflow file: the node code blocks AND the tests are
// embedded in the BPMN XML itself via bsf:script / bsf:test extension
// elements — nothing is passed in from the outside.
// ---------------------------------------------------------------------------
const executableXml = bpmnDefinitions(
  `  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:extensionElements>
      <bsf:test name="large claims go to manual review" payload='{"amount": 5200}'>
        assert(state.visited.has('Task_Manual'), 'manual review should run');
        assert(!state.visited.has('Task_Auto'), 'auto-approval must be skipped');
        assert.equal(payload.approvedBy, 'supervisor');
        assert(state.finished, 'workflow should complete');
      </bsf:test>
      <bsf:test name="small claims auto-approve" payload='{"amount": 120}'>
        assert(state.visited.has('Task_Auto'), 'auto-approval should run');
        assert(!state.visited.has('Task_Manual'), 'no manual review needed');
        assert.equal(payload.risk, 'low');
      </bsf:test>
      <bsf:test name="every run settles the claim" payload='{"amount": 1}'>
        assert.equal(payloads.length, 1, 'exactly one token reaches an end event');
        assert(state.visited.has('End_1'));
      </bsf:test>
    </bpmn:extensionElements>
    <bpmn:startEvent id="Start_1" name="Claim received">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:businessRuleTask id="Task_Score" name="Score claim">
      <bpmn:extensionElements>
        <bsf:script>payload.risk = payload.amount > 1000 ? "high" : "low";</bsf:script>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:businessRuleTask>
    <bpmn:exclusiveGateway id="Gw_Amount" name="Large claim?" default="Flow_auto">
      <bpmn:extensionElements>
        <bsf:script>return payload.risk === "high" ? "Flow_manual" : "Flow_auto";</bsf:script>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_auto</bpmn:outgoing>
      <bpmn:outgoing>Flow_manual</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Task_Auto" name="Auto-approve">
      <bpmn:extensionElements>
        <bsf:script>payload.approvedBy = "system";</bsf:script>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_auto</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_Manual" name="Manual review">
      <bpmn:extensionElements>
        <bsf:script>payload.approvedBy = "supervisor";</bsf:script>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_manual</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gw_Merge">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:endEvent id="End_1" name="Claim settled">
      <bpmn:incoming>Flow_5</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_Score"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Score" targetRef="Gw_Amount"/>
    <bpmn:sequenceFlow id="Flow_auto" name="small" sourceRef="Gw_Amount" targetRef="Task_Auto"/>
    <bpmn:sequenceFlow id="Flow_manual" name="large" sourceRef="Gw_Amount" targetRef="Task_Manual"/>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_Auto" targetRef="Gw_Merge"/>
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_Manual" targetRef="Gw_Merge"/>
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Gw_Merge" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('Start_1', 152, 202, 36, 36),
    shape('Task_Score', 240, 180, 100, 80),
    shape('Gw_Amount', 395, 195, 50, 50, { label: [385, 168, 70, 14] }),
    shape('Task_Auto', 500, 120, 100, 80),
    shape('Task_Manual', 500, 280, 100, 80),
    shape('Gw_Merge', 655, 195, 50, 50),
    shape('End_1', 760, 202, 36, 36),
    edge('Flow_1', [
      [188, 220],
      [240, 220]
    ]),
    edge('Flow_2', [
      [340, 220],
      [395, 220]
    ]),
    edge('Flow_auto', [
      [420, 195],
      [420, 160],
      [500, 160]
    ]),
    edge('Flow_manual', [
      [420, 245],
      [420, 320],
      [500, 320]
    ]),
    edge('Flow_3', [
      [600, 160],
      [680, 160],
      [680, 195]
    ]),
    edge('Flow_4', [
      [600, 320],
      [680, 320],
      [680, 245]
    ]),
    edge('Flow_5', [
      [705, 220],
      [760, 220]
    ])
  ].join('\n')
);

export const ExecutableWorkflowFile = {
  args: {
    xml: executableXml,
    payload: { amount: 5200 }
  }
};

export const PayloadRouting = {
  args: {
    xml: approvalXml,
    payload: { amount: 5200, claimant: 'J. Doe' },
    scripts: {
      Task_Score: 'payload.risk = payload.amount > 1000 ? "high" : "low";',
      Gw_Amount: 'return payload.risk === "high" ? "Flow_manual" : "Flow_auto";',
      Task_Manual: 'payload.approvedBy = "supervisor";'
    }
  }
};

// ---------------------------------------------------------------------------
// Parallel fork/join: one token splits into three branches which each stamp
// the payload, then merge at the joining parallel gateway.
// ---------------------------------------------------------------------------
const parallelXml = bpmnDefinitions(
  `  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Order placed">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:parallelGateway id="Gw_Fork">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_a</bpmn:outgoing>
      <bpmn:outgoing>Flow_b</bpmn:outgoing>
      <bpmn:outgoing>Flow_c</bpmn:outgoing>
    </bpmn:parallelGateway>
    <bpmn:serviceTask id="Task_Stock" name="Reserve stock">
      <bpmn:incoming>Flow_a</bpmn:incoming>
      <bpmn:outgoing>Flow_a2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:serviceTask id="Task_Payment" name="Charge payment">
      <bpmn:incoming>Flow_b</bpmn:incoming>
      <bpmn:outgoing>Flow_b2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:serviceTask id="Task_Label" name="Print label">
      <bpmn:incoming>Flow_c</bpmn:incoming>
      <bpmn:outgoing>Flow_c2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:parallelGateway id="Gw_Join">
      <bpmn:incoming>Flow_a2</bpmn:incoming>
      <bpmn:incoming>Flow_b2</bpmn:incoming>
      <bpmn:incoming>Flow_c2</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:parallelGateway>
    <bpmn:endEvent id="End_1" name="Order ready">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Gw_Fork"/>
    <bpmn:sequenceFlow id="Flow_a" sourceRef="Gw_Fork" targetRef="Task_Stock"/>
    <bpmn:sequenceFlow id="Flow_b" sourceRef="Gw_Fork" targetRef="Task_Payment"/>
    <bpmn:sequenceFlow id="Flow_c" sourceRef="Gw_Fork" targetRef="Task_Label"/>
    <bpmn:sequenceFlow id="Flow_a2" sourceRef="Task_Stock" targetRef="Gw_Join"/>
    <bpmn:sequenceFlow id="Flow_b2" sourceRef="Task_Payment" targetRef="Gw_Join"/>
    <bpmn:sequenceFlow id="Flow_c2" sourceRef="Task_Label" targetRef="Gw_Join"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Gw_Join" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('Start_1', 152, 232, 36, 36),
    shape('Gw_Fork', 250, 225, 50, 50),
    shape('Task_Stock', 380, 100, 100, 80),
    shape('Task_Payment', 380, 210, 100, 80),
    shape('Task_Label', 380, 320, 100, 80),
    shape('Gw_Join', 560, 225, 50, 50),
    shape('End_1', 670, 232, 36, 36),
    edge('Flow_1', [
      [188, 250],
      [250, 250]
    ]),
    edge('Flow_a', [
      [275, 225],
      [275, 140],
      [380, 140]
    ]),
    edge('Flow_b', [
      [300, 250],
      [380, 250]
    ]),
    edge('Flow_c', [
      [275, 275],
      [275, 360],
      [380, 360]
    ]),
    edge('Flow_a2', [
      [480, 140],
      [585, 140],
      [585, 225]
    ]),
    edge('Flow_b2', [
      [480, 250],
      [560, 250]
    ]),
    edge('Flow_c2', [
      [480, 360],
      [585, 360],
      [585, 275]
    ]),
    edge('Flow_2', [
      [610, 250],
      [670, 250]
    ])
  ].join('\n')
);

export const ParallelForkJoin = {
  args: {
    xml: parallelXml,
    payload: { orderId: 'A-1042' },
    scripts: {
      Task_Stock: 'payload.stockReserved = true;',
      Task_Payment: 'payload.paid = true;',
      Task_Label: 'payload.labelId = "LBL-77";'
    }
  }
};

// ---------------------------------------------------------------------------
// Error boundary: the task's script throws for bad payloads, routing the
// token to the attached error boundary event.
// ---------------------------------------------------------------------------
const boundaryXml = bpmnDefinitions(
  `  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Payment requested">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_Charge" name="Charge card">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:boundaryEvent id="Bound_Err" name="Declined" attachedToRef="Task_Charge">
      <bpmn:outgoing>Flow_err</bpmn:outgoing>
      <bpmn:errorEventDefinition id="ErrDef_1"/>
    </bpmn:boundaryEvent>
    <bpmn:endEvent id="End_Ok" name="Paid">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:userTask id="Task_Retry" name="Ask for another card">
      <bpmn:incoming>Flow_err</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_Failed" name="Payment failed">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:errorEventDefinition id="ErrDef_2"/>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_Charge"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Charge" targetRef="End_Ok"/>
    <bpmn:sequenceFlow id="Flow_err" sourceRef="Bound_Err" targetRef="Task_Retry"/>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_Retry" targetRef="End_Failed"/>
  </bpmn:process>`,
  [
    shape('Start_1', 152, 182, 36, 36),
    shape('Task_Charge', 260, 160, 100, 80),
    shape('Bound_Err', 292, 222, 36, 36, { label: [246, 262, 60, 14] }),
    shape('End_Ok', 440, 182, 36, 36),
    shape('Task_Retry', 400, 300, 100, 80),
    shape('End_Failed', 570, 322, 36, 36),
    edge('Flow_1', [
      [188, 200],
      [260, 200]
    ]),
    edge('Flow_2', [
      [360, 200],
      [440, 200]
    ]),
    edge('Flow_err', [
      [310, 258],
      [310, 340],
      [400, 340]
    ]),
    edge('Flow_3', [
      [500, 340],
      [570, 340]
    ])
  ].join('\n')
);

export const ErrorBoundary = {
  args: {
    xml: boundaryXml,
    payload: { cardValid: false, amount: 49.9 },
    scripts: {
      Task_Charge:
        'if (!payload.cardValid) throw new Error("card declined");\npayload.charged = true;'
    }
  }
};
