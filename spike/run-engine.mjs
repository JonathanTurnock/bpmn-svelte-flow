// Empirical spike: run the Dryrun artifact in bpmn-engine (a third-party
// Node.js BPMN 2.0 workflow engine) and report what happens.
// Usage: node spike/run-engine.mjs <file.bpmn> <happy|denied>
import { Engine } from 'bpmn-engine';
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'spike/messaging-flow.bpmn';
const scenario = process.argv[3] ?? 'happy';

const payloads = {
  happy: {
    senderId: 'usr_1042',
    chatId: 'chat_8231',
    text: 'Paying with card 4111 1111 1111 1111, CVV: 737 — ok?',
    muted: false
  },
  denied: {
    senderId: 'usr_6660',
    chatId: 'chat_8231',
    text: 'hey — card 4111 1111 1111 1111',
    muted: true
  }
};

const engine = new Engine({
  name: 'messaging-poc',
  source: readFileSync(file, 'utf8'),
  variables: payloads[scenario],
  // Real-engine binding: implementations for the tasks the PoC mocked.
  services: {
    evaluatePolicy(ctx, next) {
      const v = ctx.environment.variables;
      v.policy = v.muted
        ? { decision: 'DENY', determiningPolicy: 'forbid-muted-senders' }
        : { decision: 'ALLOW', determiningPolicy: 'permit-chat-members' };
      next();
    },
    saveMessage(ctx, next) {
      ctx.environment.variables.messagesApi = { status: 201, messageId: 'msg_5f2e9c' };
      next();
    },
    fetchParticipants(ctx, next) {
      ctx.environment.variables.participants = [
        { id: 'usr_2001', deliveryMethod: 'kafka' },
        { id: 'usr_2002', deliveryMethod: 'webhook' }
      ];
      next();
    },
    publishKafka(ctx, next) {
      const v = ctx.environment.variables;
      v.deliveries = (v.deliveries || []).concat({ channel: 'kafka', recipient: v.participant?.id });
      next();
    },
    callWebhook(ctx, next) {
      const v = ctx.environment.variables;
      v.deliveries = (v.deliveries || []).concat({ channel: 'webhook', recipient: v.participant?.id });
      next();
    }
  }
});

const trail = [];

engine.broker.subscribeTmp(
  'event',
  'activity.#',
  (routingKey, msg) => {
    if (routingKey === 'activity.start' || routingKey === 'activity.end' || routingKey === 'activity.error') {
      trail.push(`${routingKey}  ${msg.content.id}`);
    }
  },
  { noAck: true }
);

const listener = {
  emit(eventName, api) {
    if (eventName === 'activity.wait') {
      // Message events: the outside world must deliver the message.
      // Simulate the API gateway / Kinesis doing so.
      trail.push(`activity.wait  ${api.id} → signalling`);
      setTimeout(() => api.signal({}), 5);
    }
  }
};

try {
  const execution = await engine.execute({ listener });
  await engine.waitFor('end');
  const env = await engine.getState();
  console.log('=== ENGINE COMPLETED ===');
  console.log('trail:');
  for (const t of trail) console.log('  ' + t);
  const vars = execution.environment.output && Object.keys(execution.environment.output).length
    ? execution.environment.output
    : execution.environment.variables;
  console.log('final variables:', JSON.stringify(vars, null, 2));
} catch (err) {
  console.log('=== ENGINE FAILED ===');
  console.log('error:', err.message);
  console.log('trail so far:');
  for (const t of trail) console.log('  ' + t);
  process.exit(1);
}
