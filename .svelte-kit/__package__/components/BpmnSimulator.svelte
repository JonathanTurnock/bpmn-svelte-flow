<script lang="ts">
  import { Background, BackgroundVariant, Controls, SvelteFlow, ViewportPortal } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { parseBpmn } from '../parser/parse.js';
  import { bpmnToFlow } from '../parser/transform.js';
  import { BpmnSimulation, type SimulationLogEntry } from '../simulation/engine.js';
  import { runWorkflowTests, type BpmnTestResult } from '../simulation/testing.js';
  import type { BpmnFlowEdge, BpmnFlowNode, BpmnWorkflowTest, Point } from '../types.js';
  import { bpmnEdgeTypes, bpmnNodeTypes } from './registry.js';

  let {
    xml,
    scripts = {},
    payload = {},
    height = '100%',
    width = '100%',
    stepDelay = 900
  }: {
    /** BPMN 2.0 XML document to simulate. */
    xml: string;
    /** Initial JavaScript attachments, keyed by element id. */
    scripts?: Record<string, string>;
    /** Initial payload injected at start events. */
    payload?: Record<string, unknown>;
    height?: string;
    width?: string;
    /** Milliseconds between steps while playing. */
    stepDelay?: number;
  } = $props();

  let baseNodes = $state.raw<BpmnFlowNode[]>([]);
  let baseEdges = $state.raw<BpmnFlowEdge[]>([]);
  let nodes = $state.raw<BpmnFlowNode[]>([]);
  let edges = $state.raw<BpmnFlowEdge[]>([]);
  let sim: BpmnSimulation | undefined;
  let parseError = $state<string | undefined>(undefined);

  let selectedId = $state<string | undefined>(undefined);
  let scriptDraft = $state('');
  let payloadText = $state('{}');
  let payloadError = $state<string | undefined>(undefined);
  let logEntries = $state<SimulationLogEntry[]>([]);
  let finished = $state(false);
  let stepCount = $state(0);
  let playing = $state(false);
  let workflowTests = $state.raw<BpmnWorkflowTest[]>([]);
  let testResults = $state<BpmnTestResult[] | undefined>(undefined);
  let dots = $state<Array<{ id: number; x: number; y: number }>>([]);
  let playTimer: ReturnType<typeof setTimeout> | undefined;
  let raf: number | undefined;

  const selectedNode = $derived(baseNodes.find((n) => n.id === selectedId));

  $effect(() => {
    const currentXml = xml;
    let cancelled = false;
    (async () => {
      try {
        const { definitions } = await parseBpmn(currentXml);
        if (cancelled) return;
        const graph = bpmnToFlow(definitions);
        baseNodes = graph.nodes;
        baseEdges = graph.edges;
        workflowTests = graph.tests;
        testResults = undefined;
        sim = new BpmnSimulation(graph, { scripts, payload });
        payloadText = JSON.stringify(payload, null, 2);
        parseError = undefined;
        refresh();
      } catch (err) {
        if (cancelled) return;
        parseError = err instanceof Error ? err.message : String(err);
      }
    })();
    return () => {
      cancelled = true;
      stopPlaying();
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  });

  function nodeCenter(id: string): Point {
    const n = baseNodes.find((x) => x.id === id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.position.x + (n.width ?? 0) / 2, y: n.position.y + (n.height ?? 0) / 2 };
  }

  /** Re-applies simulation state onto the flow graph and side panel. */
  function refresh(): void {
    if (!sim) return;
    const st = sim.state;
    nodes = baseNodes.map((n) => ({
      ...n,
      class: st.active.has(n.id) ? 'sim-active' : st.visited.has(n.id) ? 'sim-visited' : undefined
    }));
    edges = baseEdges.map((e) => ({
      ...e,
      class: st.traversedEdges.has(e.id) ? 'sim-traversed' : undefined
    }));
    logEntries = [...st.log].reverse();
    finished = st.finished;
    stepCount = st.stepCount;
    dots = st.tokens.map((t) => ({ id: t.id, ...nodeCenter(t.at) }));
  }

  function pointAtFraction(points: Point[], f: number): Point {
    if (points.length === 0) return { x: 0, y: 0 };
    if (points.length === 1 || f <= 0) return points[0];
    const lengths: number[] = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      lengths.push(l);
      total += l;
    }
    let remaining = Math.min(f, 1) * total;
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i] && lengths[i] > 0) {
        const t = remaining / lengths[i];
        return {
          x: points[i].x + (points[i + 1].x - points[i].x) * t,
          y: points[i].y + (points[i + 1].y - points[i].y) * t
        };
      }
      remaining -= lengths[i];
    }
    return points[points.length - 1];
  }

  /** Animates token dots along the edges traversed by the last step. */
  function animateStep(onDone?: () => void): void {
    if (!sim) return;
    const traversals = sim.lastTraversals;
    const st = sim.state;
    const duration = Math.min(600, stepDelay * 0.7);
    const paths = new Map<number, Point[]>();
    for (const tr of traversals) {
      const edge = baseEdges.find((e) => e.id === tr.edgeId);
      const pts = edge?.data?.waypoints ?? [nodeCenter(tr.from), nodeCenter(tr.to)];
      paths.set(tr.tokenId, pts);
    }
    const startTime = performance.now();
    const tick = (now: number) => {
      const f = Math.min(1, (now - startTime) / duration);
      const moving = [...paths.entries()].map(([id, pts]) => ({ id, ...pointAtFraction(pts, f) }));
      const idle = st.tokens
        .filter((t) => !paths.has(t.id))
        .map((t) => ({ id: t.id, ...nodeCenter(t.at) }));
      dots = [...moving, ...idle];
      if (f < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        dots = st.tokens.map((t) => ({ id: t.id, ...nodeCenter(t.at) }));
        onDone?.();
      }
    };
    raf = requestAnimationFrame(tick);
  }

  function doStep(onDone?: () => void): void {
    if (!sim || sim.state.finished) return;
    sim.step();
    refresh();
    animateStep(onDone);
  }

  function play(): void {
    if (!sim || sim.state.finished) return;
    playing = true;
    const loop = () => {
      if (!playing || !sim || sim.state.finished) {
        playing = false;
        return;
      }
      doStep(() => {
        playTimer = setTimeout(loop, Math.max(50, stepDelay - 600));
      });
    };
    loop();
  }

  function stopPlaying(): void {
    playing = false;
    if (playTimer) clearTimeout(playTimer);
  }

  function reset(): void {
    stopPlaying();
    if (!sim) return;
    try {
      sim.setInitialPayload(JSON.parse(payloadText || '{}'));
      payloadError = undefined;
    } catch (err) {
      payloadError = err instanceof Error ? err.message : String(err);
      return;
    }
    sim.reset();
    refresh();
  }

  function selectNode(id: string): void {
    selectedId = id;
    scriptDraft = sim?.getScript(id) ?? '';
  }

  function saveScript(): void {
    if (!sim || !selectedId) return;
    sim.setScript(selectedId, scriptDraft);
  }

  /** Runs the tests embedded in the workflow file (with any script edits applied). */
  function runTests(): void {
    if (!sim) return;
    testResults = runWorkflowTests({ nodes: baseNodes, edges: baseEdges }, workflowTests, {
      scripts: sim.allScripts
    });
  }

  const scriptPlaceholder = $derived.by(() => {
    const el = selectedNode?.data.element ?? '';
    if (el.includes('Gateway')) {
      return 'Return the id or label of the outgoing flow, e.g.\n\nreturn payload.amount > 100 ? "Flow_big" : "Flow_small";';
    }
    return 'Read or change the payload, e.g.\n\npayload.total = payload.qty * payload.price;\n// throw new Error("boom") → error boundary';
  });
</script>

<div class="bpmn-simulator" style={`width: ${width}; height: ${height};`}>
  {#if parseError}
    <div class="bpmn-simulator-error"><strong>Failed to parse BPMN document</strong><pre>{parseError}</pre></div>
  {:else}
    <SvelteFlow
      bind:nodes
      bind:edges
      nodeTypes={bpmnNodeTypes}
      edgeTypes={bpmnEdgeTypes}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.1}
      nodesDraggable={false}
      nodesConnectable={false}
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: true }}
      onnodeclick={({ node }) => selectNode(node.id)}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      <Controls showLock={false} />
      <ViewportPortal target="front">
        {#each dots as dot (dot.id)}
          <div class="sim-token" style={`left: ${dot.x}px; top: ${dot.y}px;`}>{dot.id}</div>
        {/each}
      </ViewportPortal>
    </SvelteFlow>

    <aside class="sim-panel">
      <section class="sim-controls">
        <button onclick={() => doStep()} disabled={finished || playing}>Step</button>
        {#if playing}
          <button onclick={stopPlaying}>Pause</button>
        {:else}
          <button onclick={play} disabled={finished}>Play</button>
        {/if}
        <button onclick={reset}>Reset</button>
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
            onblur={saveScript}
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
          <button class="sim-run-tests" onclick={runTests}>Run tests ({workflowTests.length})</button>
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
                <code>{JSON.stringify(entry.payload)}</code>
              {/if}
            </li>
          {/each}
        </ol>
      </section>
    </aside>
  {/if}
</div>

<style>
  .bpmn-simulator {
    position: relative;
    display: flex;
    background: var(--bpmn-canvas-bg, #ffffff);
    font-family: var(--bpmn-font-family, Arial, sans-serif);
  }
  .bpmn-simulator :global(.svelte-flow) {
    flex: 1;
  }
  .bpmn-simulator :global(.bpmn-hidden-handle) {
    opacity: 0;
    pointer-events: none;
    width: 1px;
    height: 1px;
    min-width: 0;
    min-height: 0;
    border: none;
  }

  /* simulation highlighting */
  .bpmn-simulator :global(.svelte-flow__node.sim-visited) {
    filter: drop-shadow(0 0 2px var(--bpmn-sim-visited, #94d8bd));
  }
  .bpmn-simulator :global(.svelte-flow__node.sim-active) {
    filter: drop-shadow(0 0 2px var(--bpmn-sim-active, #10b981))
      drop-shadow(0 0 5px var(--bpmn-sim-active, #10b981));
  }
  .bpmn-simulator :global(.svelte-flow__edge.sim-traversed path) {
    stroke: var(--bpmn-sim-active, #10b981) !important;
  }
  .bpmn-simulator :global(.svelte-flow__edge.sim-traversed polygon),
  .bpmn-simulator :global(.svelte-flow__edge.sim-traversed polyline) {
    stroke: var(--bpmn-sim-active, #10b981) !important;
    fill: var(--bpmn-sim-active, #10b981) !important;
  }

  .sim-token {
    position: absolute;
    width: 18px;
    height: 18px;
    margin: -9px 0 0 -9px;
    border-radius: 50%;
    background: var(--bpmn-sim-token, #0ea5e9);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 2px #fff, 0 1px 4px rgba(0, 0, 0, 0.35);
    pointer-events: none;
    z-index: 10;
  }
  .sim-run-tests {
    padding: 4px 12px;
    border: 1px solid #c6cad2;
    border-radius: 5px;
    background: #fff;
    cursor: pointer;
    font-size: 12px;
  }
  .sim-run-tests:hover {
    background: #eef1f5;
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

  .sim-panel {
    width: 300px;
    flex: 0 0 300px;
    border-left: 1px solid #d8dbe1;
    background: #fafbfc;
    color: #22242a;
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
    color: #22242a;
  }
  .sim-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .sim-controls button {
    padding: 4px 12px;
    border: 1px solid #c6cad2;
    border-radius: 5px;
    background: #fff;
    cursor: pointer;
    font-size: 12px;
  }
  .sim-controls button:hover:enabled {
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
  .bpmn-simulator-error {
    padding: 16px;
    color: #b3261e;
  }
  .bpmn-simulator-error pre {
    white-space: pre-wrap;
    font-size: 12px;
  }
</style>
