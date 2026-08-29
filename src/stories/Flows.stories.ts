import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Connecting Objects/Flows',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

/**
 * Like `edge()` from the shared helpers, but also emits a `<bpmndi:BPMNLabel>`
 * so the edge label is positioned from the diagram interchange instead of the
 * polyline midpoint.
 */
function labelledEdge(
  element: string,
  waypoints: Array<[number, number]>,
  label: [number, number, number, number]
): string {
  const points = waypoints.map(([x, y]) => `        <di:waypoint x="${x}" y="${y}"/>`).join('\n');
  return `      <bpmndi:BPMNEdge id="${element}_di" bpmnElement="${element}">
${points}
        <bpmndi:BPMNLabel><dc:Bounds x="${label[0]}" y="${label[1]}" width="${label[2]}" height="${label[3]}"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>`;
}

/* -------------------------------------------------------------------------
 * Sequence flows: plain, conditional (diamond at source), default (slash).
 * ---------------------------------------------------------------------- */

const sequenceFlows = bpmnDefinitions(
  `  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Order placed">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_A" name="Check stock" default="Flow_def">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_cond</bpmn:outgoing>
      <bpmn:outgoing>Flow_def</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_B" name="Reserve item">
      <bpmn:incoming>Flow_cond</bpmn:incoming>
      <bpmn:outgoing>Flow_b</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_C" name="Create backorder">
      <bpmn:incoming>Flow_def</bpmn:incoming>
      <bpmn:outgoing>Flow_c</bpmn:outgoing>
    </bpmn:task>
    <bpmn:exclusiveGateway id="Gateway_1" name="Ready?" default="Flow_gdef">
      <bpmn:incoming>Flow_b</bpmn:incoming>
      <bpmn:incoming>Flow_c</bpmn:incoming>
      <bpmn:outgoing>Flow_ok</bpmn:outgoing>
      <bpmn:outgoing>Flow_gdef</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:endEvent id="End_1" name="Shipped">
      <bpmn:incoming>Flow_ok</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_2" name="Waiting">
      <bpmn:incoming>Flow_gdef</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_A"/>
    <bpmn:sequenceFlow id="Flow_cond" name="in stock" sourceRef="Task_A" targetRef="Task_B">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${stock &gt; 0}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_def" name="otherwise" sourceRef="Task_A" targetRef="Task_C"/>
    <bpmn:sequenceFlow id="Flow_b" sourceRef="Task_B" targetRef="Gateway_1"/>
    <bpmn:sequenceFlow id="Flow_c" sourceRef="Task_C" targetRef="Gateway_1"/>
    <bpmn:sequenceFlow id="Flow_ok" name="ready" sourceRef="Gateway_1" targetRef="End_1"/>
    <bpmn:sequenceFlow id="Flow_gdef" name="else" sourceRef="Gateway_1" targetRef="End_2"/>
  </bpmn:process>`,
  [
    shape('Start_1', 150, 258, 36, 36, { label: [116, 300, 104, 14] }),
    shape('Task_A', 240, 236, 100, 80),
    shape('Task_B', 440, 140, 100, 80),
    shape('Task_C', 440, 340, 100, 80),
    shape('Gateway_1', 620, 251, 50, 50, { label: [603, 306, 84, 14] }),
    shape('End_1', 760, 170, 36, 36, { label: [736, 212, 84, 14] }),
    shape('End_2', 760, 350, 36, 36, { label: [736, 392, 84, 14] }),
    edge('Flow_1', [
      [186, 276],
      [240, 276]
    ]),
    labelledEdge(
      'Flow_cond',
      [
        [340, 256],
        [390, 256],
        [390, 180],
        [440, 180]
      ],
      [350, 228, 62, 14]
    ),
    labelledEdge(
      'Flow_def',
      [
        [340, 296],
        [390, 296],
        [390, 380],
        [440, 380]
      ],
      [350, 302, 62, 14]
    ),
    edge('Flow_b', [
      [540, 180],
      [580, 180],
      [580, 276],
      [620, 276]
    ]),
    edge('Flow_c', [
      [540, 380],
      [580, 380],
      [580, 276],
      [620, 276]
    ]),
    labelledEdge(
      'Flow_ok',
      [
        [645, 251],
        [645, 188],
        [760, 188]
      ],
      [668, 164, 40, 14]
    ),
    labelledEdge(
      'Flow_gdef',
      [
        [645, 301],
        [645, 368],
        [760, 368]
      ],
      [668, 344, 40, 14]
    )
  ].join('\n')
);

/**
 * Plain sequence flows (solid line + filled arrowhead), a conditional flow
 * (hollow diamond at the source task) and two default flows (slash tick near
 * the source — one from a task, one from a gateway). Every branch is bent, so
 * the rounded corners are visible too.
 */
export const SequenceFlows = {
  args: { xml: sequenceFlows }
};

/* -------------------------------------------------------------------------
 * Message flows between two pools.
 * ---------------------------------------------------------------------- */

const messageFlows = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="P1" name="Customer" processRef="Proc_1"/>
    <bpmn:participant id="P2" name="Online shop" processRef="Proc_2"/>
    <bpmn:messageFlow id="MF_1" name="order" sourceRef="Task_C1" targetRef="Task_S1"/>
    <bpmn:messageFlow id="MF_2" name="shipment notice" sourceRef="Task_S2" targetRef="Task_C2"/>
  </bpmn:collaboration>
  <bpmn:process id="Proc_1" isExecutable="false">
    <bpmn:startEvent id="Start_C"><bpmn:outgoing>SF_C1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:sendTask id="Task_C1" name="Place order">
      <bpmn:incoming>SF_C1</bpmn:incoming><bpmn:outgoing>SF_C2</bpmn:outgoing>
    </bpmn:sendTask>
    <bpmn:receiveTask id="Task_C2" name="Receive goods">
      <bpmn:incoming>SF_C2</bpmn:incoming><bpmn:outgoing>SF_C3</bpmn:outgoing>
    </bpmn:receiveTask>
    <bpmn:endEvent id="End_C"><bpmn:incoming>SF_C3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="SF_C1" sourceRef="Start_C" targetRef="Task_C1"/>
    <bpmn:sequenceFlow id="SF_C2" sourceRef="Task_C1" targetRef="Task_C2"/>
    <bpmn:sequenceFlow id="SF_C3" sourceRef="Task_C2" targetRef="End_C"/>
  </bpmn:process>
  <bpmn:process id="Proc_2" isExecutable="false">
    <bpmn:startEvent id="Start_S"><bpmn:outgoing>SF_S1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:receiveTask id="Task_S1" name="Receive order">
      <bpmn:incoming>SF_S1</bpmn:incoming><bpmn:outgoing>SF_S2</bpmn:outgoing>
    </bpmn:receiveTask>
    <bpmn:sendTask id="Task_S2" name="Ship goods">
      <bpmn:incoming>SF_S2</bpmn:incoming><bpmn:outgoing>SF_S3</bpmn:outgoing>
    </bpmn:sendTask>
    <bpmn:endEvent id="End_S"><bpmn:incoming>SF_S3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="SF_S1" sourceRef="Start_S" targetRef="Task_S1"/>
    <bpmn:sequenceFlow id="SF_S2" sourceRef="Task_S1" targetRef="Task_S2"/>
    <bpmn:sequenceFlow id="SF_S3" sourceRef="Task_S2" targetRef="End_S"/>
  </bpmn:process>`,
  [
    shape('P1', 140, 80, 720, 160, { horizontal: true }),
    shape('P2', 140, 300, 720, 160, { horizontal: true }),
    shape('Start_C', 192, 142, 36, 36),
    shape('Task_C1', 270, 120, 100, 80),
    shape('Task_C2', 470, 120, 100, 80),
    shape('End_C', 680, 142, 36, 36),
    shape('Start_S', 192, 362, 36, 36),
    shape('Task_S1', 270, 340, 100, 80),
    shape('Task_S2', 470, 340, 100, 80),
    shape('End_S', 680, 362, 36, 36),
    edge('SF_C1', [
      [228, 160],
      [270, 160]
    ]),
    edge('SF_C2', [
      [370, 160],
      [470, 160]
    ]),
    edge('SF_C3', [
      [570, 160],
      [680, 160]
    ]),
    edge('SF_S1', [
      [228, 380],
      [270, 380]
    ]),
    edge('SF_S2', [
      [370, 380],
      [470, 380]
    ]),
    edge('SF_S3', [
      [570, 380],
      [680, 380]
    ]),
    labelledEdge(
      'MF_1',
      [
        [320, 200],
        [320, 340]
      ],
      [326, 256, 40, 14]
    ),
    labelledEdge(
      'MF_2',
      [
        [520, 340],
        [520, 200]
      ],
      [428, 256, 88, 14]
    )
  ].join('\n')
);

/**
 * Message flows: dashed line, hollow circle at the source, hollow arrowhead at
 * the target. `MF_2` runs bottom-to-top so the arrowhead trimming is exercised
 * on a vertical final segment.
 */
export const MessageFlows = {
  args: { xml: messageFlows }
};

/* -------------------------------------------------------------------------
 * Associations (None / One / Both) and data associations.
 * ---------------------------------------------------------------------- */

const associations = bpmnDefinitions(
  `  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:task id="Task_1" name="Handle claim"/>
    <bpmn:task id="Task_2" name="Assess damage">
      <bpmn:dataInputAssociation id="DIA_1">
        <bpmn:sourceRef>Data_1</bpmn:sourceRef>
      </bpmn:dataInputAssociation>
      <bpmn:dataOutputAssociation id="DOA_1">
        <bpmn:targetRef>Data_2</bpmn:targetRef>
      </bpmn:dataOutputAssociation>
    </bpmn:task>
    <bpmn:dataObjectReference id="Data_1" name="Claim form" dataObjectRef="DO_1"/>
    <bpmn:dataObjectReference id="Data_2" name="Damage report" dataObjectRef="DO_2"/>
    <bpmn:dataObject id="DO_1"/>
    <bpmn:dataObject id="DO_2"/>

    <bpmn:textAnnotation id="Ann_1"><bpmn:text>association: None</bpmn:text></bpmn:textAnnotation>
    <bpmn:textAnnotation id="Ann_2"><bpmn:text>association: One</bpmn:text></bpmn:textAnnotation>
    <bpmn:textAnnotation id="Ann_3"><bpmn:text>association: Both</bpmn:text></bpmn:textAnnotation>
    <bpmn:association id="Assoc_1" sourceRef="Task_1" targetRef="Ann_1" associationDirection="None"/>
    <bpmn:association id="Assoc_2" sourceRef="Task_1" targetRef="Ann_2" associationDirection="One"/>
    <bpmn:association id="Assoc_3" sourceRef="Task_1" targetRef="Ann_3" associationDirection="Both"/>
  </bpmn:process>`,
  [
    shape('Task_1', 300, 200, 100, 80),
    shape('Ann_1', 520, 110, 160, 44),
    shape('Ann_2', 520, 218, 160, 44),
    shape('Ann_3', 520, 326, 160, 44),
    shape('Task_2', 300, 440, 100, 80),
    shape('Data_1', 180, 570, 36, 50, { label: [150, 624, 96, 14] }),
    shape('Data_2', 420, 570, 36, 50, { label: [390, 624, 96, 14] }),
    edge('Assoc_1', [
      [400, 220],
      [520, 132]
    ]),
    edge('Assoc_2', [
      [400, 240],
      [520, 240]
    ]),
    edge('Assoc_3', [
      [400, 260],
      [520, 348]
    ]),
    edge('DIA_1', [
      [198, 570],
      [198, 480],
      [300, 480]
    ]),
    edge('DOA_1', [
      [400, 480],
      [438, 480],
      [438, 570]
    ])
  ].join('\n')
);

/**
 * Artifact associations in all three directionalities (`None` — no arrowhead,
 * `One` — a single thin "V", `Both` — a "V" at each end) plus data input /
 * output associations, which always carry a thin "V" at the target.
 */
export const Associations = {
  args: { xml: associations }
};

/* -------------------------------------------------------------------------
 * Heavily bent routing with DI-positioned labels.
 * ---------------------------------------------------------------------- */

const bentFlows = bpmnDefinitions(
  `  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1"><bpmn:outgoing>F1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="Review request">
      <bpmn:incoming>F1</bpmn:incoming><bpmn:incoming>F5</bpmn:incoming><bpmn:outgoing>F2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_2" name="Request changes">
      <bpmn:incoming>F2</bpmn:incoming><bpmn:outgoing>F3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="Task_3" name="Publish">
      <bpmn:incoming>F3</bpmn:incoming><bpmn:outgoing>F4</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_1"><bpmn:incoming>F4</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="F1" sourceRef="Start_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="F2" name="needs work" sourceRef="Task_1" targetRef="Task_2"/>
    <bpmn:sequenceFlow id="F3" name="resubmitted" sourceRef="Task_2" targetRef="Task_3"/>
    <bpmn:sequenceFlow id="F4" sourceRef="Task_3" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('Start_1', 100, 300, 36, 36),
    shape('Task_1', 200, 278, 100, 80),
    shape('Task_2', 200, 118, 100, 80),
    shape('Task_3', 500, 278, 100, 80),
    shape('End_1', 700, 300, 36, 36),
    edge('F1', [
      [136, 318],
      [200, 318]
    ]),
    labelledEdge(
      'F2',
      [
        [300, 298],
        [400, 298],
        [400, 158],
        [300, 158]
      ],
      [408, 214, 68, 14]
    ),
    labelledEdge(
      'F3',
      [
        [300, 138],
        [450, 138],
        [450, 298],
        [500, 298]
      ],
      [458, 196, 76, 14]
    ),
    edge('F4', [
      [600, 318],
      [700, 318]
    ])
  ].join('\n')
);

/**
 * Multi-waypoint routes: every interior corner is rounded, and both labels are
 * placed from `<bpmndi:BPMNLabel>` bounds rather than the polyline midpoint.
 */
export const BentRoutesAndLabels = {
  args: { xml: bentFlows }
};
