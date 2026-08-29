/**
 * Scripted walkthroughs of the messaging flow. Each step activates diagram
 * elements, shows the business logic behind them, and applies that logic's
 * transformation to the payload — so a dev can watch a request become a
 * delivered message hop by hop.
 */

export interface Step {
  /** Elements lit as "active" for this step (task/event ids). */
  elements: string[];
  /** Sequence flow ids traversed entering this step. */
  edges?: string[];
  title: string;
  /** What the platform is doing here, in one or two sentences. */
  note: string;
  /** The business logic behind the node — real rules, shown verbatim. */
  logic: string;
  logicLabel: string;
  /** Payload transformation applied by this step. */
  apply?: (payload: any) => any;
}

export interface Scenario {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  steps: Step[];
}

const SANITISE_LOGIC = `// security-filters/redact.ts — applied to every inbound body field
const FILTERS = [
  { name: 'pan',  // card numbers (13-16 digits, spaces/dashes allowed)
    pattern: /\\b(?:\\d[ -]?){12}(?:\\d[ -]?){1,3}\\d\\b/g,
    replace: (m) => '•••• •••• •••• ' + m.replace(/\\D/g, '').slice(-4) },
  { name: 'cvv',
    pattern: /\\b[Cc][Vv][Vv2]*\\s*:?\\s*\\d{3,4}\\b/g,
    replace: () => 'CVV: •••' },
  { name: 'iban',
    pattern: /\\b[A-Z]{2}\\d{2}[A-Z0-9]{11,30}\\b/g,
    replace: (m) => m.slice(0, 4) + '…' + m.slice(-4) }
];
// every hit is recorded to security.redactions for the audit trail`;

const CEDAR_LOGIC = `// policy/chat.cedar — evaluated by the Cedar engine
permit (
  principal,
  action == Action::"SendMessage",
  resource
) when {
  principal in resource.members &&
  !principal.muted
};

forbid (
  principal,
  action == Action::"SendMessage",
  resource
) when { principal.muted == true };

// entities: principal = User::senderId, resource = Chat::chatId
// request context: { redactions: security.redactions.length }`;

const GATEWAY_LOGIC = `// routing on the Cedar decision
if (payload.policy.decision === 'ALLOW') -> "allow" -> Save message
else                                     -> "deny"  -> 403 rejected`;

const SAVE_LOGIC = `// POST https://internal.messages-api/v1/messages
// body: sanitised message + policy audit reference
// response 201 -> { messageId, persistedAt }
// the Messages API owns durability; it emits to Kinesis after commit`;

const KINESIS_LOGIC = `// consumer: messaging-fanout (KCL, stream: chat-messages-v1)
// partitionKey = chatId  → per-chat ordering guaranteed
// The HTTP request context is GONE here — this is a new execution
// context that starts from the stream record alone.`;

const JOIN_LOGIC = `// join stream record with the original request context
// context was cached at ingress: PUT request-context/{messageId} (TTL 15m)
const ctx = await contextCache.get(record.data.messageId);
const message = { ...record.data, ...ctx };   // record wins on conflict`;

const PARTICIPANTS_LOGIC = `// GET https://internal.chats-api/v1/chats/{chatId}/participants
// each participant carries a resolved delivery preference:
//   deliveryMethod: 'kafka'   → downstream internal consumers
//   deliveryMethod: 'webhook' → external endpoint registered per tenant
// sender is excluded from fan-out`;

const METHOD_LOGIC = `// per participant (multi-instance):
switch (participant.deliveryMethod) {
  case 'kafka':   -> "kafka"   branch
  case 'webhook': -> "webhook" branch
}`;

const KAFKA_LOGIC = `// producer config: acks=all, idempotence=on
producer.send({
  topic: 'chat-message-deliveries',
  key: participant.id,             // per-recipient ordering
  value: { messageId, chatId, recipientId: participant.id, text }
});`;

const WEBHOOK_LOGIC = `// per-tenant registered endpoint, signed payload
POST https://hooks.customer-b.example/chat-events
X-Acme-Signature: hmac-sha256(body, tenantSecret)
retry: exponential backoff ×5 → dead-letter on exhaustion`;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const basePayload = {
  request: {
    method: 'POST',
    path: '/v1/chats/chat_8231/messages',
    requestId: 'req_01HTX4',
    body: {
      senderId: 'usr_1042',
      text: 'Paying with card 4111 1111 1111 1111, CVV: 737 — ok?',
      sentAt: '2026-08-29T10:14:03Z'
    }
  }
};

function sanitise(p: any) {
  const next = clone(p);
  next.request.body.text = 'Paying with card •••• •••• •••• 1111, CVV: ••• — ok?';
  next.security = {
    redactions: [
      { filter: 'pan', count: 1 },
      { filter: 'cvv', count: 1 }
    ]
  };
  return next;
}

function evaluatePolicy(p: any, decision: 'ALLOW' | 'DENY', policy: string, reason: string) {
  const next = clone(p);
  next.policy = { decision, determiningPolicy: policy, reason };
  return next;
}

function save(p: any) {
  const next = clone(p);
  next.messagesApi = { status: 201, messageId: 'msg_5f2e9c', persistedAt: '2026-08-29T10:14:03.221Z' };
  return next;
}

function kinesis(p: any) {
  // async boundary: the payload becomes the stream record — the HTTP
  // context is intentionally dropped to make the hand-off visible.
  return {
    kinesisRecord: {
      stream: 'chat-messages-v1',
      partitionKey: 'chat_8231',
      sequenceNumber: '49590338271490256608559692538361571095921575989136588898',
      data: { messageId: p.messagesApi.messageId, chatId: 'chat_8231', senderId: 'usr_1042' }
    }
  };
}

function join(p: any) {
  const next = clone(p);
  next.message = {
    messageId: next.kinesisRecord.data.messageId,
    chatId: next.kinesisRecord.data.chatId,
    senderId: next.kinesisRecord.data.senderId,
    text: 'Paying with card •••• •••• •••• 1111, CVV: ••• — ok?',
    security: { redactions: [{ filter: 'pan', count: 1 }, { filter: 'cvv', count: 1 }] },
    sentAt: '2026-08-29T10:14:03Z'
  };
  return next;
}

function participants(p: any) {
  const next = clone(p);
  next.participants = [
    { id: 'usr_2001', displayName: 'Ana', deliveryMethod: 'kafka' },
    { id: 'usr_2002', displayName: 'Ben (Customer-B CRM)', deliveryMethod: 'webhook' }
  ];
  return next;
}

function kafkaDelivery(p: any) {
  const next = clone(p);
  next.deliveries = [
    ...(next.deliveries ?? []),
    {
      channel: 'kafka',
      recipient: 'usr_2001',
      topic: 'chat-message-deliveries',
      key: 'usr_2001',
      value: { messageId: 'msg_5f2e9c', chatId: 'chat_8231', recipientId: 'usr_2001' }
    }
  ];
  return next;
}

function webhookDelivery(p: any) {
  const next = clone(p);
  next.deliveries = [
    ...(next.deliveries ?? []),
    {
      channel: 'webhook',
      recipient: 'usr_2002',
      url: 'https://hooks.customer-b.example/chat-events',
      status: 202,
      signature: 'sha256=9f2c…e1'
    }
  ];
  return next;
}

export const scenarios: Scenario[] = [
  {
    id: 'happy',
    name: 'Happy path — message delivered',
    payload: basePayload,
    steps: [
      {
        elements: ['Start_Request'],
        title: 'API request received',
        note: 'A chat member POSTs a message. Note the raw card number and CVV in the body — this is what the platform must never persist or forward.',
        logicLabel: 'Ingress contract',
        logic: `POST /v1/chats/{chatId}/messages\nauth: Bearer token → senderId\nbody: { senderId, text, sentAt }`
      },
      {
        elements: ['Task_Sanitise'],
        edges: ['F1'],
        title: 'Sanitise payload',
        note: 'Regex security filters run over every inbound field. The PAN and CVV are redacted in place and each hit is recorded for audit.',
        logicLabel: 'Security filters (regex)',
        logic: SANITISE_LOGIC,
        apply: sanitise
      },
      {
        elements: ['Task_Policy'],
        edges: ['F2'],
        title: 'Evaluate Cedar policy',
        note: 'The Cedar engine authorises the (already sanitised) request: is this sender a member of the chat, and are they allowed to post?',
        logicLabel: 'Cedar policy',
        logic: CEDAR_LOGIC,
        apply: (p) =>
          evaluatePolicy(p, 'ALLOW', 'permit-chat-members', 'usr_1042 ∈ chat_8231.members ∧ ¬muted')
      },
      {
        elements: ['GW_Allowed'],
        edges: ['F3'],
        title: 'Allowed?',
        note: 'Pure routing on the policy decision — no new logic lives here.',
        logicLabel: 'Routing',
        logic: GATEWAY_LOGIC
      },
      {
        elements: ['Task_Save'],
        edges: ['F_Allow'],
        title: 'Save message',
        note: 'The sanitised, authorised message is persisted via the Messages API, which commits and then emits the record to Kinesis.',
        logicLabel: 'Messages API',
        logic: SAVE_LOGIC,
        apply: save
      },
      {
        elements: ['Catch_Kinesis'],
        edges: ['F5'],
        title: 'Kinesis record arrives',
        note: 'ASYNC BOUNDARY. The HTTP request has already returned 201. Everything from here runs in the stream consumer — watch the payload shrink to just the record.',
        logicLabel: 'Stream consumer',
        logic: KINESIS_LOGIC,
        apply: kinesis
      },
      {
        elements: ['Task_Join'],
        edges: ['F6'],
        title: 'Join with original request context',
        note: 'The record only carries ids. The consumer re-hydrates the sanitised text and audit trail from the ingress context cache.',
        logicLabel: 'Join semantics',
        logic: JOIN_LOGIC,
        apply: join
      },
      {
        elements: ['Task_Participants'],
        edges: ['F7'],
        title: 'Fetch chat participants',
        note: 'Everyone in the chat except the sender, each with a resolved delivery preference.',
        logicLabel: 'Chats API',
        logic: PARTICIPANTS_LOGIC,
        apply: participants
      },
      {
        elements: ['Sub_Deliver', 'Sub_Start', 'GW_Method'],
        edges: ['F8', 'FS1'],
        title: 'Deliver to each participant',
        note: 'The delivery sub-process runs once per participant (multi-instance). Ana routes to Kafka; Ben’s CRM integration routes to a webhook.',
        logicLabel: 'Delivery routing',
        logic: METHOD_LOGIC
      },
      {
        elements: ['Task_Kafka'],
        edges: ['F_K'],
        title: 'Publish Kafka message (usr_2001)',
        note: 'Internal consumers get a keyed Kafka record — per-recipient ordering via the message key.',
        logicLabel: 'Kafka producer',
        logic: KAFKA_LOGIC,
        apply: kafkaDelivery
      },
      {
        elements: ['Task_Webhook'],
        edges: ['F_W'],
        title: 'Call webhook endpoint (usr_2002)',
        note: 'External tenants get a signed webhook with retry + dead-letter semantics.',
        logicLabel: 'Webhook delivery',
        logic: WEBHOOK_LOGIC,
        apply: webhookDelivery
      },
      {
        elements: ['End_Kafka', 'End_Webhook'],
        edges: ['F_K2', 'F_W2'],
        title: 'Per-participant deliveries complete',
        note: 'Both instances of the delivery sub-process have finished.',
        logicLabel: 'Multi-instance join',
        logic: '// the MI sub-process completes when every participant instance completes'
      },
      {
        elements: ['End_Done'],
        edges: ['F9'],
        title: 'All deliveries dispatched',
        note: 'End of flow. Final payload = the full delivery manifest: what was sent, to whom, over which channel.',
        logicLabel: 'Done',
        logic: '// deliveries[] is the contract this flow guarantees downstream'
      }
    ]
  },
  {
    id: 'denied',
    name: 'Policy denied — muted sender',
    payload: (() => {
      const p = clone(basePayload);
      (p.request.body as any).senderId = 'usr_6660';
      (p.request.body as any).text = 'hey — card 4111 1111 1111 1111';
      return p;
    })(),
    steps: [
      {
        elements: ['Start_Request'],
        title: 'API request received',
        note: 'Same ingress contract — but this sender has been muted by a moderator.',
        logicLabel: 'Ingress contract',
        logic: `POST /v1/chats/{chatId}/messages\nauth: Bearer token → senderId\nbody: { senderId, text, sentAt }`
      },
      {
        elements: ['Task_Sanitise'],
        edges: ['F1'],
        title: 'Sanitise payload',
        note: 'Sanitisation runs BEFORE policy — even rejected messages must never carry raw PANs into logs or audit trails.',
        logicLabel: 'Security filters (regex)',
        logic: SANITISE_LOGIC,
        apply: (p) => {
          const next = clone(p);
          next.request.body.text = 'hey — card •••• •••• •••• 1111';
          next.security = { redactions: [{ filter: 'pan', count: 1 }] };
          return next;
        }
      },
      {
        elements: ['Task_Policy'],
        edges: ['F2'],
        title: 'Evaluate Cedar policy',
        note: 'The forbid rule fires: the sender is muted. Cedar forbid always overrides permit.',
        logicLabel: 'Cedar policy',
        logic: CEDAR_LOGIC,
        apply: (p) => evaluatePolicy(p, 'DENY', 'forbid-muted-senders', 'usr_6660.muted == true'),
      },
      {
        elements: ['GW_Allowed'],
        edges: ['F3'],
        title: 'Allowed?',
        note: 'Decision is DENY — route to rejection.',
        logicLabel: 'Routing',
        logic: GATEWAY_LOGIC
      },
      {
        elements: ['End_Rejected'],
        edges: ['F_Deny'],
        title: '403 rejected',
        note: 'The API returns 403 with the policy reason. Nothing is persisted; nothing reaches the stream.',
        logicLabel: 'Rejection contract',
        logic: `HTTP 403\n{ "error": "policy_denied",\n  "policy": "forbid-muted-senders",\n  "reason": "sender is muted in this chat" }`,
        apply: (p) => {
          const next = clone(p);
          next.response = { status: 403, error: 'policy_denied', policy: 'forbid-muted-senders' };
          return next;
        }
      }
    ]
  }
];
