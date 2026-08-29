import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Collaboration/Choreography',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

/* -------------------------------------------------------------------------
 * A choreography process: tasks, a collapsed sub-choreography and a call
 * choreography, wired with sequence flows.
 * ---------------------------------------------------------------------- */

const choreography = bpmnDefinitions(
  `  <bpmn:choreography id="Choreo_1">
    <bpmn:participant id="P1" name="Customer"/>
    <bpmn:participant id="P2" name="Retailer"/>
    <bpmn:participant id="P3" name="Shipper">
      <bpmn:participantMultiplicity maximum="3"/>
    </bpmn:participant>

    <bpmn:startEvent id="Start_1"><bpmn:outgoing>SF_1</bpmn:outgoing></bpmn:startEvent>

    <bpmn:choreographyTask id="CT1" name="Place order" initiatingParticipantRef="P1">
      <bpmn:incoming>SF_1</bpmn:incoming>
      <bpmn:outgoing>SF_2</bpmn:outgoing>
      <bpmn:participantRef>P1</bpmn:participantRef>
      <bpmn:participantRef>P2</bpmn:participantRef>
    </bpmn:choreographyTask>

    <bpmn:choreographyTask id="CT2" name="Confirm order" initiatingParticipantRef="P2"
        loopType="MultiInstanceParallel">
      <bpmn:incoming>SF_2</bpmn:incoming>
      <bpmn:outgoing>SF_3</bpmn:outgoing>
      <bpmn:participantRef>P2</bpmn:participantRef>
      <bpmn:participantRef>P1</bpmn:participantRef>
    </bpmn:choreographyTask>

    <bpmn:subChoreography id="SC1" name="Arrange delivery" initiatingParticipantRef="P2">
      <bpmn:incoming>SF_3</bpmn:incoming>
      <bpmn:outgoing>SF_4</bpmn:outgoing>
      <bpmn:participantRef>P2</bpmn:participantRef>
      <bpmn:participantRef>P3</bpmn:participantRef>
    </bpmn:subChoreography>

    <bpmn:callChoreography id="CC1" name="Handle payment" initiatingParticipantRef="P1">
      <bpmn:incoming>SF_4</bpmn:incoming>
      <bpmn:outgoing>SF_5</bpmn:outgoing>
      <bpmn:participantRef>P1</bpmn:participantRef>
      <bpmn:participantRef>P2</bpmn:participantRef>
    </bpmn:callChoreography>

    <bpmn:endEvent id="End_1"><bpmn:incoming>SF_5</bpmn:incoming></bpmn:endEvent>

    <bpmn:sequenceFlow id="SF_1" sourceRef="Start_1" targetRef="CT1"/>
    <bpmn:sequenceFlow id="SF_2" sourceRef="CT1" targetRef="CT2"/>
    <bpmn:sequenceFlow id="SF_3" sourceRef="CT2" targetRef="SC1"/>
    <bpmn:sequenceFlow id="SF_4" sourceRef="SC1" targetRef="CC1"/>
    <bpmn:sequenceFlow id="SF_5" sourceRef="CC1" targetRef="End_1"/>
  </bpmn:choreography>`,
  [
    shape('Start_1', 120, 262, 36, 36),
    shape('CT1', 210, 230, 150, 100),
    shape('CT2', 410, 230, 150, 100),
    shape('SC1', 610, 230, 150, 100),
    shape('CC1', 810, 230, 150, 100),
    shape('End_1', 1010, 262, 36, 36),
    edge('SF_1', [
      [156, 280],
      [210, 280]
    ]),
    edge('SF_2', [
      [360, 280],
      [410, 280]
    ]),
    edge('SF_3', [
      [560, 280],
      [610, 280]
    ]),
    edge('SF_4', [
      [760, 280],
      [810, 280]
    ]),
    edge('SF_5', [
      [960, 280],
      [1010, 280]
    ])
  ].join('\n')
);

/**
 * A choreography: each activity carries one band per participant, the
 * initiating participant's band is white and every other band is shaded.
 * `SC1` is a collapsed sub-choreography (a "+" marker in the body) and `CC1`
 * is a call choreography (thick border). The `Shipper` participant declares a
 * `<bpmn:participantMultiplicity/>`, so its band shows the multi-instance bars.
 *
 * NOTE: band rendering depends on `BpmnNodeData.participants` being populated
 * by the transform; see the workstream report for the `participantRef` /
 * `participantRefs` naming mismatch in `src/lib/parser/transform.ts`.
 */
export const ChoreographyProcess = {
  args: { xml: choreography }
};

/* -------------------------------------------------------------------------
 * A three-participant choreography task (two shaded bands at the bottom).
 * ---------------------------------------------------------------------- */

const multiParty = bpmnDefinitions(
  `  <bpmn:choreography id="Choreo_1">
    <bpmn:participant id="P1" name="Buyer"/>
    <bpmn:participant id="P2" name="Broker"/>
    <bpmn:participant id="P3" name="Insurer">
      <bpmn:participantMultiplicity maximum="5"/>
    </bpmn:participant>

    <bpmn:startEvent id="Start_1"><bpmn:outgoing>SF_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:choreographyTask id="CT1" name="Request cover" initiatingParticipantRef="P1">
      <bpmn:incoming>SF_1</bpmn:incoming>
      <bpmn:outgoing>SF_2</bpmn:outgoing>
      <bpmn:participantRef>P1</bpmn:participantRef>
      <bpmn:participantRef>P2</bpmn:participantRef>
      <bpmn:participantRef>P3</bpmn:participantRef>
    </bpmn:choreographyTask>
    <bpmn:exclusiveGateway id="Gw_1" name="Accepted?">
      <bpmn:incoming>SF_2</bpmn:incoming>
      <bpmn:outgoing>SF_3</bpmn:outgoing>
      <bpmn:outgoing>SF_4</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:choreographyTask id="CT2" name="Issue policy" initiatingParticipantRef="P3">
      <bpmn:incoming>SF_3</bpmn:incoming>
      <bpmn:outgoing>SF_5</bpmn:outgoing>
      <bpmn:participantRef>P3</bpmn:participantRef>
      <bpmn:participantRef>P1</bpmn:participantRef>
    </bpmn:choreographyTask>
    <bpmn:choreographyTask id="CT3" name="Decline" initiatingParticipantRef="P2">
      <bpmn:incoming>SF_4</bpmn:incoming>
      <bpmn:outgoing>SF_6</bpmn:outgoing>
      <bpmn:participantRef>P2</bpmn:participantRef>
      <bpmn:participantRef>P1</bpmn:participantRef>
    </bpmn:choreographyTask>
    <bpmn:endEvent id="End_1"><bpmn:incoming>SF_5</bpmn:incoming></bpmn:endEvent>
    <bpmn:endEvent id="End_2"><bpmn:incoming>SF_6</bpmn:incoming></bpmn:endEvent>

    <bpmn:sequenceFlow id="SF_1" sourceRef="Start_1" targetRef="CT1"/>
    <bpmn:sequenceFlow id="SF_2" sourceRef="CT1" targetRef="Gw_1"/>
    <bpmn:sequenceFlow id="SF_3" name="yes" sourceRef="Gw_1" targetRef="CT2"/>
    <bpmn:sequenceFlow id="SF_4" name="no" sourceRef="Gw_1" targetRef="CT3"/>
    <bpmn:sequenceFlow id="SF_5" sourceRef="CT2" targetRef="End_1"/>
    <bpmn:sequenceFlow id="SF_6" sourceRef="CT3" targetRef="End_2"/>
  </bpmn:choreography>`,
  [
    shape('Start_1', 120, 292, 36, 36),
    shape('CT1', 210, 250, 160, 120),
    shape('Gw_1', 430, 285, 50, 50, { label: [490, 296, 86, 14] }),
    shape('CT2', 550, 130, 160, 120),
    shape('CT3', 550, 390, 160, 120),
    shape('End_1', 780, 172, 36, 36),
    shape('End_2', 780, 432, 36, 36),
    edge('SF_1', [
      [156, 310],
      [210, 310]
    ]),
    edge('SF_2', [
      [370, 310],
      [430, 310]
    ]),
    edge('SF_3', [
      [455, 285],
      [455, 190],
      [550, 190]
    ]),
    edge('SF_4', [
      [455, 335],
      [455, 450],
      [550, 450]
    ]),
    edge('SF_5', [
      [710, 190],
      [780, 190]
    ]),
    edge('SF_6', [
      [710, 450],
      [780, 450]
    ])
  ].join('\n')
);

/**
 * A choreography task with three participants: the initiating participant's
 * band sits on top, the two other bands are stacked (and shaded) at the
 * bottom. The insurer is a multi-instance participant.
 */
export const MultiPartyChoreography = {
  args: { xml: multiParty }
};
