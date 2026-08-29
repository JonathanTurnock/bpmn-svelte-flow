// Run a BSF artifact, unmodified, in bpmn-engine through the generic
// binding-pass adapter from @bsf/engine — see
// packages/engine/src/bpmn-engine-adapter.mjs for what the adapter maps.
// Usage: bun spike/run-engine-adapted.mjs <file.bpmn> <happy|denied>
import { readFileSync } from 'node:fs';
import { runInBpmnEngine } from '@bsf/engine/adapter';

const file = process.argv[2] ?? 'packages/engine/test/fixtures/messaging-flow.bpmn';
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

const result = await runInBpmnEngine(readFileSync(file, 'utf8'), payloads[scenario]);

if (result.completed) {
  console.log('=== ENGINE COMPLETED ===');
  console.log('trail:');
  for (const t of result.trail) console.log(`  activity.${t.event}  ${t.id}`);
  console.log('final variables:', JSON.stringify(result.variables, null, 2));
} else {
  console.log('=== ENGINE FAILED ===');
  console.log('error:', result.error);
  for (const t of result.trail) console.log(`  activity.${t.event}  ${t.id}`);
  process.exit(1);
}
