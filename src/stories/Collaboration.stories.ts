import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Collaboration/Pools & Lanes',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

/* -------------------------------------------------------------------------
 * 1. Two expanded pools, lanes in the first, message flows across.
 * ---------------------------------------------------------------------- */

const twoPools = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="P1" name="Customer" processRef="Proc_1"/>
    <bpmn:participant id="P2" name="Supplier" processRef="Proc_2"/>
    <bpmn:messageFlow id="MF_1" name="order" sourceRef="Task_C1" targetRef="Task_S1"/>
    <bpmn:messageFlow id="MF_2" name="invoice" sourceRef="Task_S2" targetRef="Task_C2"/>
  </bpmn:collaboration>
  <bpmn:process id="Proc_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="L1" name="Sales">
        <bpmn:flowNodeRef>Start_C</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_C1</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="L2" name="Accounting">
        <bpmn:flowNodeRef>Task_C2</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>End_C</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="Start_C"><bpmn:outgoing>SF_C1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:sendTask id="Task_C1" name="Place order">
      <bpmn:incoming>SF_C1</bpmn:incoming><bpmn:outgoing>SF_C2</bpmn:outgoing>
    </bpmn:sendTask>
    <bpmn:receiveTask id="Task_C2" name="Receive invoice">
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
    <bpmn:sendTask id="Task_S2" name="Send invoice">
      <bpmn:incoming>SF_S2</bpmn:incoming><bpmn:outgoing>SF_S3</bpmn:outgoing>
    </bpmn:sendTask>
    <bpmn:endEvent id="End_S"><bpmn:incoming>SF_S3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="SF_S1" sourceRef="Start_S" targetRef="Task_S1"/>
    <bpmn:sequenceFlow id="SF_S2" sourceRef="Task_S1" targetRef="Task_S2"/>
    <bpmn:sequenceFlow id="SF_S3" sourceRef="Task_S2" targetRef="End_S"/>
  </bpmn:process>`,
  [
    shape('P1', 160, 80, 720, 240, { horizontal: true }),
    shape('L1', 190, 80, 690, 120, { horizontal: true }),
    shape('L2', 190, 200, 690, 120, { horizontal: true }),
    shape('P2', 160, 380, 720, 180, { horizontal: true }),
    shape('Start_C', 222, 122, 36, 36),
    shape('Task_C1', 300, 100, 100, 80),
    shape('Task_C2', 470, 220, 100, 80),
    shape('End_C', 650, 242, 36, 36),
    shape('Start_S', 222, 452, 36, 36),
    shape('Task_S1', 300, 430, 100, 80),
    shape('Task_S2', 470, 430, 100, 80),
    shape('End_S', 650, 452, 36, 36),
    edge('SF_C1', [
      [258, 140],
      [300, 140]
    ]),
    edge('SF_C2', [
      [400, 140],
      [435, 140],
      [435, 260],
      [470, 260]
    ]),
    edge('SF_C3', [
      [570, 260],
      [650, 260]
    ]),
    edge('SF_S1', [
      [258, 470],
      [300, 470]
    ]),
    edge('SF_S2', [
      [400, 470],
      [470, 470]
    ]),
    edge('SF_S3', [
      [570, 470],
      [650, 470]
    ]),
    edge(
      'MF_1',
      [
        [350, 180],
        [350, 430]
      ],
      { label: [356, 336, 40, 14] }
    ),
    edge(
      'MF_2',
      [
        [520, 430],
        [520, 300]
      ],
      { label: [452, 336, 52, 14] }
    )
  ].join('\n')
);

/**
 * Two expanded pools. The customer pool is split into two horizontal lanes
 * (lane bounds start 30px in from the pool's left edge, leaving room for the
 * pool's own rotated title band). Message flows connect tasks across pools.
 */
export const TwoPoolsWithLanes = {
  args: { xml: twoPools }
};

/* -------------------------------------------------------------------------
 * 2. Black-box participant (no processRef).
 * ---------------------------------------------------------------------- */

const blackBox = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="P1" name="Retailer" processRef="Proc_1"/>
    <bpmn:participant id="P2" name="Payment provider"/>
    <bpmn:messageFlow id="MF_1" name="authorization request" sourceRef="Task_1" targetRef="P2"/>
    <bpmn:messageFlow id="MF_2" name="authorization result" sourceRef="P2" targetRef="Task_2"/>
  </bpmn:collaboration>
  <bpmn:process id="Proc_1" isExecutable="false">
    <bpmn:startEvent id="Start_1"><bpmn:outgoing>SF_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:serviceTask id="Task_1" name="Authorize payment">
      <bpmn:incoming>SF_1</bpmn:incoming><bpmn:outgoing>SF_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:task id="Task_2" name="Confirm order">
      <bpmn:incoming>SF_2</bpmn:incoming><bpmn:outgoing>SF_3</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End_1"><bpmn:incoming>SF_3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="SF_1" sourceRef="Start_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="SF_2" sourceRef="Task_1" targetRef="Task_2"/>
    <bpmn:sequenceFlow id="SF_3" sourceRef="Task_2" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('P1', 160, 80, 640, 200, { horizontal: true }),
    shape('P2', 160, 400, 640, 70, { horizontal: true }),
    shape('Start_1', 212, 162, 36, 36),
    shape('Task_1', 290, 140, 100, 80),
    shape('Task_2', 470, 140, 100, 80),
    shape('End_1', 650, 162, 36, 36),
    edge('SF_1', [
      [248, 180],
      [290, 180]
    ]),
    edge('SF_2', [
      [390, 180],
      [470, 180]
    ]),
    edge('SF_3', [
      [570, 180],
      [650, 180]
    ]),
    edge(
      'MF_1',
      [
        [340, 220],
        [340, 400]
      ],
      { label: [200, 296, 128, 14] }
    ),
    edge(
      'MF_2',
      [
        [520, 400],
        [520, 330],
        [640, 330],
        [640, 220]
      ],
      { label: [560, 306, 120, 14] }
    )
  ].join('\n')
);

/**
 * A participant without a `processRef` renders as a black-box pool: no title
 * band, no lanes, the name centered in the shape. Message flows may attach
 * directly to it — `MF_2` leaves the pool, bends twice and enters a task from
 * below, so the hollow circle and arrowhead are checked on both a downward and
 * an upward vertical segment.
 */
export const BlackBoxPool = {
  args: { xml: blackBox }
};

/* -------------------------------------------------------------------------
 * 3. Vertical pools (isHorizontal="false").
 * ---------------------------------------------------------------------- */

const verticalPools = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="P1" name="Loan office" processRef="Proc_1"/>
    <bpmn:participant id="P2" name="Credit bureau"/>
    <bpmn:messageFlow id="MF_1" name="score request" sourceRef="Task_2" targetRef="P2"/>
  </bpmn:collaboration>
  <bpmn:process id="Proc_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="L1" name="Intake">
        <bpmn:flowNodeRef>Start_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_1</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="L2" name="Underwriting">
        <bpmn:flowNodeRef>Task_2</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>End_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="Start_1"><bpmn:outgoing>SF_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="Collect application">
      <bpmn:incoming>SF_1</bpmn:incoming><bpmn:outgoing>SF_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="Task_2" name="Score applicant">
      <bpmn:incoming>SF_2</bpmn:incoming><bpmn:outgoing>SF_3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_1"><bpmn:incoming>SF_3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="SF_1" sourceRef="Start_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="SF_2" sourceRef="Task_1" targetRef="Task_2"/>
    <bpmn:sequenceFlow id="SF_3" sourceRef="Task_2" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('P1', 200, 100, 220, 460, { horizontal: false }),
    shape('L1', 200, 130, 110, 430, { horizontal: false }),
    shape('L2', 310, 130, 110, 430, { horizontal: false }),
    shape('P2', 500, 100, 130, 460, { horizontal: false }),
    shape('Start_1', 237, 180, 36, 36),
    shape('Task_1', 205, 255, 100, 80),
    shape('Task_2', 315, 385, 100, 80),
    shape('End_1', 347, 500, 36, 36),
    edge('SF_1', [
      [255, 216],
      [255, 255]
    ]),
    edge('SF_2', [
      [305, 295],
      [365, 295],
      [365, 385]
    ]),
    edge('SF_3', [
      [365, 465],
      [365, 500]
    ]),
    edge(
      'MF_1',
      [
        [415, 425],
        [500, 425]
      ],
      { label: [420, 400, 80, 14] }
    )
  ].join('\n')
);

/**
 * Vertical pools (`isHorizontal="false"`): the title band runs along the top
 * of the pool instead of down its left edge, and lanes are vertical columns
 * whose bounds start 30px below the pool's top edge.
 */
export const VerticalPools = {
  args: { xml: verticalPools }
};

/* -------------------------------------------------------------------------
 * 4. Multi-instance participant.
 * ---------------------------------------------------------------------- */

const multiInstance = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="P1" name="Buyer" processRef="Proc_1"/>
    <bpmn:participant id="P2" name="Supplier">
      <bpmn:participantMultiplicity maximum="3"/>
    </bpmn:participant>
    <bpmn:messageFlow id="MF_1" name="request for quote" sourceRef="Task_1" targetRef="P2"/>
    <bpmn:messageFlow id="MF_2" name="quote" sourceRef="P2" targetRef="Task_2"/>
  </bpmn:collaboration>
  <bpmn:process id="Proc_1" isExecutable="false">
    <bpmn:startEvent id="Start_1"><bpmn:outgoing>SF_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:sendTask id="Task_1" name="Request quotes">
      <bpmn:incoming>SF_1</bpmn:incoming><bpmn:outgoing>SF_2</bpmn:outgoing>
    </bpmn:sendTask>
    <bpmn:receiveTask id="Task_2" name="Collect quotes">
      <bpmn:incoming>SF_2</bpmn:incoming><bpmn:outgoing>SF_3</bpmn:outgoing>
    </bpmn:receiveTask>
    <bpmn:endEvent id="End_1"><bpmn:incoming>SF_3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="SF_1" sourceRef="Start_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="SF_2" sourceRef="Task_1" targetRef="Task_2"/>
    <bpmn:sequenceFlow id="SF_3" sourceRef="Task_2" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('P1', 160, 80, 640, 200, { horizontal: true }),
    shape('P2', 160, 400, 640, 90, { horizontal: true }),
    shape('Start_1', 212, 162, 36, 36),
    shape('Task_1', 290, 140, 100, 80),
    shape('Task_2', 470, 140, 100, 80),
    shape('End_1', 650, 162, 36, 36),
    edge('SF_1', [
      [248, 180],
      [290, 180]
    ]),
    edge('SF_2', [
      [390, 180],
      [470, 180]
    ]),
    edge('SF_3', [
      [570, 180],
      [650, 180]
    ]),
    edge(
      'MF_1',
      [
        [340, 220],
        [340, 400]
      ],
      { label: [212, 296, 116, 14] }
    ),
    edge(
      'MF_2',
      [
        [520, 400],
        [520, 220]
      ],
      { label: [528, 296, 44, 14] }
    )
  ].join('\n')
);

/**
 * `<bpmn:participantMultiplicity maximum="3"/>` marks the supplier pool as a
 * multi-instance participant: three vertical bars at the bottom-center of the
 * pool.
 */
export const MultiInstanceParticipant = {
  args: { xml: multiInstance }
};

/* -------------------------------------------------------------------------
 * 5. Nested lanes (childLaneSet).
 * ---------------------------------------------------------------------- */

const nestedLanes = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="P1" name="Service desk" processRef="Proc_1"/>
  </bpmn:collaboration>
  <bpmn:process id="Proc_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="L1" name="Operations">
        <bpmn:childLaneSet id="LaneSet_2">
          <bpmn:lane id="L1a" name="Support">
            <bpmn:flowNodeRef>Start_1</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>Task_1</bpmn:flowNodeRef>
          </bpmn:lane>
          <bpmn:lane id="L1b" name="Engineering">
            <bpmn:flowNodeRef>Task_2</bpmn:flowNodeRef>
          </bpmn:lane>
        </bpmn:childLaneSet>
      </bpmn:lane>
      <bpmn:lane id="L2" name="Management">
        <bpmn:flowNodeRef>End_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="Start_1"><bpmn:outgoing>SF_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="Triage ticket">
      <bpmn:incoming>SF_1</bpmn:incoming><bpmn:outgoing>SF_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_2" name="Fix defect">
      <bpmn:incoming>SF_2</bpmn:incoming><bpmn:outgoing>SF_3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_1"><bpmn:incoming>SF_3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="SF_1" sourceRef="Start_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="SF_2" sourceRef="Task_1" targetRef="Task_2"/>
    <bpmn:sequenceFlow id="SF_3" sourceRef="Task_2" targetRef="End_1"/>
  </bpmn:process>`,
  [
    shape('P1', 160, 80, 760, 320, { horizontal: true }),
    shape('L1', 190, 80, 730, 240, { horizontal: true }),
    shape('L1a', 220, 80, 700, 120, { horizontal: true }),
    shape('L1b', 220, 200, 700, 120, { horizontal: true }),
    shape('L2', 190, 320, 730, 80, { horizontal: true }),
    shape('Start_1', 252, 122, 36, 36),
    shape('Task_1', 330, 100, 100, 80),
    shape('Task_2', 500, 220, 100, 80),
    shape('End_1', 700, 342, 36, 36),
    edge('SF_1', [
      [288, 140],
      [330, 140]
    ]),
    edge('SF_2', [
      [430, 140],
      [465, 140],
      [465, 260],
      [500, 260]
    ]),
    edge('SF_3', [
      [600, 260],
      [650, 260],
      [650, 360],
      [700, 360]
    ])
  ].join('\n')
);

/**
 * Nested lanes: `L1` ("Operations") carries a `<bpmn:childLaneSet>` with two
 * child lanes. Every lane is an independent DI shape, so the nesting is purely
 * geometric — the child lane bounds start another 30px in from the parent
 * lane's left edge so the two title bands sit side by side.
 */
export const NestedLanes = {
  args: { xml: nestedLanes }
};
