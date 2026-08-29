<script lang="ts">
  import type { SimulationLogEntry } from '../../simulation/engine.js';
  import type { BpmnTestResult } from '../../simulation/testing.js';
  import type { BpmnFlowNode, BpmnWorkflowTest } from '../../types.js';

  // The simulator's side panel: playback controls, payload editor, per-node
  // JavaScript attachment editor, workflow test runner, and the step log.
  // Purely presentational — all behavior arrives as callbacks.
  let {
    finished,
    stepCount,
    playing,
    payloadText = $bindable(),
    payloadError,
    selectedNode,
    scriptDraft = $bindable(),
    workflowTests,
    testResults,
    logEntries,
    onstep,
    onplay,
    onpause,
    onreset,
    onsavescript,
    onruntests
  }: {
    finished: boolean;
    stepCount: number;
    playing: boolean;
    payloadText: string;
    payloadError?: string;
    selectedNode?: BpmnFlowNode;
    scriptDraft: string;
    workflowTests: BpmnWorkflowTest[];
    testResults?: BpmnTestResult[];
    logEntries: SimulationLogEntry[];
    onstep: () => void;
    onplay: () => void;
    onpause: () => void;
    onreset: () => void;
    onsavescript: () => void;
    onruntests: () => void;
  } = $props();

  /**
   * User scripts can make the payload non-JSON-serialisable (circular refs,
   * BigInt) — structuredClone keeps such values intact, so the log must never
   * assume JSON.stringify succeeds.
   */
  function safeStringify(value: unknown): string {
    const seen = new WeakSet();
    try {
      return (
        JSON.stringify(value, (_key, v) => {
          if (typeof v === 'bigint') return `${v}n`;
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) return '[circular]';
            seen.add(v);
          }
          return v;
        }) ?? String(value)
      );
    } catch {
      return '[unserialisable payload]';
    }
  }

  const scriptPlaceholder = $derived.by(() => {
    const el = selectedNode?.data.element ?? '';
    if (typeof el === 'string' && el.includes('Gateway')) {
      return 'Return the id or label of the outgoing flow, e.g.\n\nreturn payload.amount > 100 ? "Flow_big" : "Flow_small";';
    }
    return 'Read or change the payload, e.g.\n\npayload.total = payload.qty * payload.price;\n// throw new Error("boom") → error boundary';
  });
</script>

<aside class="sim-panel">
  <section class="sim-controls">
    <button onclick={onstep} disabled={finished || playing}>Step</button>
    {#if playing}
      <button onclick={onpause}>Pause</button>
    {:else}
      <button onclick={onplay} disabled={finished}>Play</button>
    {/if}
    <button onclick={onreset}>Reset</button>
    <span class="sim-status">{finished ? `finished · ${stepCount} steps` : `step ${stepCount}`}</span>
  </section>

  <section>
    <h4>Initial payload (JSON)</h4>
    <textarea class="sim-payload" rows="4" bind:value={payloadText} spellcheck="false"></textarea>
    {#if payloadError}<div class="sim-error">{payloadError}</div>{/if}
    <div class="sim-hint">Applied on Reset.</div>
  </section>

  <section>
    <h4>
      JavaScript attachment
      {#if selectedNode}
        <span class="sim-selected">— {selectedNode.data.label ?? selectedNode.id}</span>
      {/if}
    </h4>
    {#if selectedNode}
      <textarea
        class="sim-script"
        rows="6"
        bind:value={scriptDraft}
        onblur={onsavescript}
        placeholder={scriptPlaceholder}
        spellcheck="false"
      ></textarea>
      <div class="sim-hint">Runs with <code>payload</code> and <code>element</code>. Saved on blur.</div>
    {:else}
      <div class="sim-hint">Click a node on the canvas to attach a script.</div>
    {/if}
  </section>

  {#if workflowTests.length > 0}
    <section>
      <h4>Workflow tests</h4>
      <button class="sim-run-tests" onclick={onruntests}>Run tests ({workflowTests.length})</button>
      {#if testResults}
        <ul class="sim-tests">
          {#each testResults as result (result.name)}
            <li class={result.passed ? 'sim-test-pass' : 'sim-test-fail'}>
              <span class="sim-test-mark">{result.passed ? '✓' : '✗'}</span>
              {result.name}
              {#if result.error}<code>{result.error}</code>{/if}
            </li>
          {/each}
        </ul>
      {:else}
        <div class="sim-hint">Defined as JS blocks in the workflow file.</div>
      {/if}
    </section>
  {/if}

  <section class="sim-log-section">
    <h4>Log</h4>
    <ol class="sim-log">
      {#each logEntries.slice(0, 60) as entry, i (logEntries.length - i)}
        <li class={`sim-log-${entry.kind}`}>
          <span class="sim-log-step">{entry.step}</span>
          {entry.elementName ?? entry.elementId} — {entry.message}
          {#if entry.payload !== undefined}
            <code>{safeStringify(entry.payload)}</code>
          {/if}
        </li>
      {/each}
    </ol>
  </section>
</aside>

<style>
  .sim-panel {
    width: 300px;
    flex: 0 0 300px;
    border-left: 1px solid #d8dbe1;
    background: #fafbfc;
    color: #334155;
    overflow-y: auto;
    padding: 10px 12px;
    box-sizing: border-box;
    font-size: 12px;
  }
  .sim-panel h4 {
    margin: 12px 0 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #5b616c;
  }
  .sim-selected {
    text-transform: none;
    letter-spacing: 0;
    color: #334155;
  }
  .sim-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .sim-controls button,
  .sim-run-tests {
    padding: 4px 12px;
    border: 1px solid #c6cad2;
    border-radius: 5px;
    background: #fff;
    cursor: pointer;
    font-size: 12px;
  }
  .sim-controls button:hover:enabled,
  .sim-run-tests:hover {
    background: #eef1f5;
  }
  .sim-controls button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .sim-status {
    margin-left: auto;
    color: #5b616c;
    font-size: 11px;
  }
  .sim-payload,
  .sim-script {
    width: 100%;
    box-sizing: border-box;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    border: 1px solid #c6cad2;
    border-radius: 5px;
    padding: 6px;
    background: #fff;
    resize: vertical;
  }
  .sim-hint {
    margin-top: 3px;
    color: #7a8089;
    font-size: 10.5px;
  }
  .sim-error {
    color: #b3261e;
    font-size: 11px;
    margin-top: 3px;
  }
  .sim-tests {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
  }
  .sim-tests li {
    padding: 3px 0;
    line-height: 1.35;
  }
  .sim-tests code {
    display: block;
    font-size: 10px;
    overflow-wrap: anywhere;
    color: #8a4a44;
  }
  .sim-test-mark {
    display: inline-block;
    min-width: 14px;
    font-weight: 700;
  }
  .sim-test-pass .sim-test-mark {
    color: #0f766e;
  }
  .sim-test-fail {
    color: #b3261e;
  }
  .sim-log {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .sim-log li {
    padding: 3px 0;
    border-bottom: 1px solid #edeff2;
    line-height: 1.35;
  }
  .sim-log code {
    display: block;
    color: #475069;
    font-size: 10px;
    overflow-wrap: anywhere;
  }
  .sim-log-step {
    display: inline-block;
    min-width: 16px;
    color: #9aa0aa;
    font-size: 10px;
  }
  .sim-log-error {
    color: #b3261e;
  }
  .sim-log-end {
    color: #0f766e;
    font-weight: 600;
  }
</style>
