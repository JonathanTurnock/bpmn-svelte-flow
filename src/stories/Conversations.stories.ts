import BpmnDiagram from '../lib/components/BpmnDiagram.svelte';
import { bpmnDefinitions, edge, shape } from './helpers/bpmn-xml.js';

export default {
  title: 'Collaboration/Conversations',
  component: BpmnDiagram,
  args: {
    height: '100vh'
  }
};

/* -------------------------------------------------------------------------
 * All three conversation node types between two black-box participants.
 * ---------------------------------------------------------------------- */

const conversationTypes = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="P1" name="Customer"/>
    <bpmn:participant id="P2" name="Supplier"/>

    <bpmn:conversation id="Conv_1" name="Order handling">
      <bpmn:participantRef>P1</bpmn:participantRef>
      <bpmn:participantRef>P2</bpmn:participantRef>
    </bpmn:conversation>
    <bpmn:subConversation id="Conv_2" name="Delivery">
      <bpmn:participantRef>P1</bpmn:participantRef>
      <bpmn:participantRef>P2</bpmn:participantRef>
    </bpmn:subConversation>
    <bpmn:callConversation id="Conv_3" name="Invoicing">
      <bpmn:participantRef>P1</bpmn:participantRef>
      <bpmn:participantRef>P2</bpmn:participantRef>
    </bpmn:callConversation>

    <bpmn:conversationLink id="Link_1" sourceRef="P1" targetRef="Conv_1"/>
    <bpmn:conversationLink id="Link_2" sourceRef="Conv_1" targetRef="P2"/>
    <bpmn:conversationLink id="Link_3" sourceRef="P1" targetRef="Conv_2"/>
    <bpmn:conversationLink id="Link_4" sourceRef="Conv_2" targetRef="P2"/>
    <bpmn:conversationLink id="Link_5" sourceRef="P1" targetRef="Conv_3"/>
    <bpmn:conversationLink id="Link_6" sourceRef="Conv_3" targetRef="P2"/>
  </bpmn:collaboration>`,
  [
    shape('P1', 100, 60, 800, 60, { horizontal: true }),
    shape('P2', 100, 460, 800, 60, { horizontal: true }),
    shape('Conv_1', 170, 230, 100, 80),
    shape('Conv_2', 410, 230, 100, 80),
    shape('Conv_3', 650, 230, 100, 80),
    edge('Link_1', [
      [220, 120],
      [220, 230]
    ]),
    edge('Link_2', [
      [220, 310],
      [220, 460]
    ]),
    edge('Link_3', [
      [460, 120],
      [460, 230]
    ]),
    edge('Link_4', [
      [460, 310],
      [460, 460]
    ]),
    edge('Link_5', [
      [700, 120],
      [700, 230]
    ]),
    edge('Link_6', [
      [700, 310],
      [700, 460]
    ])
  ].join('\n')
);

/**
 * The three conversation node types, each linked to both participants with
 * `<bpmn:conversationLink>` (rendered as the spec's double line):
 *
 * - `bpmn:Conversation` — plain hexagon
 * - `bpmn:SubConversation` — hexagon with a collapsed "+" marker
 * - `bpmn:CallConversation` — hexagon with a thick border
 */
export const ConversationTypes = {
  args: { xml: conversationTypes }
};

/* -------------------------------------------------------------------------
 * A conversation diagram with three participants and chained conversations.
 * ---------------------------------------------------------------------- */

const conversationDiagram = bpmnDefinitions(
  `  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="P1" name="Customer"/>
    <bpmn:participant id="P2" name="Retailer"/>
    <bpmn:participant id="P3" name="Carrier"/>

    <bpmn:conversation id="Conv_1" name="Place order">
      <bpmn:participantRef>P1</bpmn:participantRef>
      <bpmn:participantRef>P2</bpmn:participantRef>
    </bpmn:conversation>
    <bpmn:subConversation id="Conv_2" name="Arrange shipment">
      <bpmn:participantRef>P2</bpmn:participantRef>
      <bpmn:participantRef>P3</bpmn:participantRef>
    </bpmn:subConversation>
    <bpmn:callConversation id="Conv_3" name="Settle payment">
      <bpmn:participantRef>P1</bpmn:participantRef>
      <bpmn:participantRef>P2</bpmn:participantRef>
    </bpmn:callConversation>

    <bpmn:conversationLink id="Link_1" sourceRef="P1" targetRef="Conv_1"/>
    <bpmn:conversationLink id="Link_2" sourceRef="Conv_1" targetRef="P2"/>
    <bpmn:conversationLink id="Link_3" sourceRef="P2" targetRef="Conv_2"/>
    <bpmn:conversationLink id="Link_4" sourceRef="Conv_2" targetRef="P3"/>
    <bpmn:conversationLink id="Link_5" sourceRef="P1" targetRef="Conv_3"/>
    <bpmn:conversationLink id="Link_6" sourceRef="Conv_3" targetRef="P2"/>
  </bpmn:collaboration>`,
  [
    shape('P1', 120, 80, 160, 70, { horizontal: true }),
    shape('P2', 480, 80, 160, 70, { horizontal: true }),
    shape('P3', 840, 80, 160, 70, { horizontal: true }),
    shape('Conv_1', 330, 235, 100, 80),
    shape('Conv_2', 690, 235, 100, 80),
    shape('Conv_3', 330, 415, 100, 80),
    edge('Link_1', [
      [200, 150],
      [200, 275],
      [330, 275]
    ]),
    edge('Link_2', [
      [430, 275],
      [560, 275],
      [560, 150]
    ]),
    edge('Link_3', [
      [640, 115],
      [740, 115],
      [740, 235]
    ]),
    edge('Link_4', [
      [790, 275],
      [920, 275],
      [920, 150]
    ]),
    edge('Link_5', [
      [180, 150],
      [180, 455],
      [330, 455]
    ]),
    edge('Link_6', [
      [430, 455],
      [580, 455],
      [580, 150]
    ])
  ].join('\n')
);

/**
 * A conversation diagram: three black-box participants tied together by three
 * conversation nodes. All conversation links are bent, so the rounded corners
 * of the double-line stroke are visible.
 */
export const ConversationDiagram = {
  args: { xml: conversationDiagram }
};
