<script lang="ts">
  import { Background, BackgroundVariant, Controls, SvelteFlow, ViewportPortal } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import type { BpmnJsonDocument } from '../parser/json.js';
  import { loadDefinition } from '../parser/load.js';
  import { BpmnSimulation, type SimulationLogEntry } from '../simulation/engine.js';
  import { runWorkflowTests, type BpmnTestResult } from '../simulation/testing.js';
  import type { BpmnFlowEdge, BpmnFlowNode, BpmnWorkflowTest, Point } from '../types.js';
  import { pointAlongPolyline } from '../utils/geometry.js';
  import { bpmnEdgeTypes, bpmnNodeTypes } from './registry.js';
  import SimulatorPanel from './simulation/SimulatorPanel.svelte';

  let {
    xml,
    definition,
    scripts = {},
    payload,
    height = '100%',
    width = '100%',
    stepDelay = 900,
    maxSteps = 500
  }: {
    /**
     * Document to simulate: BPMN 2.0 XML, or a JSON diagram document
     * (string or object) — the format is auto-detected.
     */
    xml?: string;
    /** Alias for `xml` that also accepts a JSON document object. */
    definition?: string | BpmnJsonDocument;
    /** Initial JavaScript attachments, keyed by element id (override file scripts). */
    scripts?: Record<string, string>;
    /** Initial payload injected at start events (overrides the document's own). */
    payload?: Record<string, unknown>;
    height?: string;
    width?: string;
    /** Milliseconds between steps while playing. */
    stepDelay?: number;
    /**
     * Play stops after this many steps, so a diagram whose flows cycle
     * forever cannot run the tab away. Manual stepping stays unbounded.
     */
    maxSteps?: number;
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
    const input = definition ?? xml;
    let cancelled = false;
    (async () => {
      try {
        if (input === undefined) throw new Error('BpmnSimulator needs an `xml` or `definition` prop');
        const graph = await loadDefinition(input);
        if (cancelled) return;
        baseNodes = graph.nodes;
        baseEdges = graph.edges;
        workflowTests = graph.tests;
        testResults = undefined;
        const initialPayload = payload ?? graph.initialPayload ?? {};
        sim = new BpmnSimulation(graph, { scripts, payload: initialPayload });
        payloadText = JSON.stringify(initialPayload, null, 2);
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

  /** Animates token dots along the edges traversed by the last step. */
  function animateStep(onDone?: () => void): void {
    if (!sim) return;
    const st = sim.state;
    const duration = Math.min(600, stepDelay * 0.7);
    const paths = new Map<number, Point[]>();
    for (const tr of sim.lastTraversals) {
      const edge = baseEdges.find((e) => e.id === tr.edgeId);
      const pts = edge?.data?.waypoints ?? [nodeCenter(tr.from), nodeCenter(tr.to)];
      paths.set(tr.tokenId, pts);
    }
    const startTime = performance.now();
    const tick = (now: number) => {
      const f = Math.min(1, (now - startTime) / duration);
      const moving = [...paths.entries()].map(([id, pts]) => ({
        id,
        ...pointAlongPolyline(pts, f)
      }));
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
      if (!playing || !sim || sim.state.finished || sim.state.stepCount >= maxSteps) {
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

    <SimulatorPanel
      {finished}
      {stepCount}
      {playing}
      bind:payloadText
      {payloadError}
      {selectedNode}
      bind:scriptDraft
      {workflowTests}
      {testResults}
      {logEntries}
      onstep={() => doStep()}
      onplay={play}
      onpause={stopPlaying}
      onreset={reset}
      onsavescript={saveScript}
      onruntests={runTests}
    />
  {/if}
</div>

<style>
  .bpmn-simulator {
    position: relative;
    display: flex;
    background: var(--bpmn-canvas-bg, #ffffff);
    font-family: var(--bpmn-font-family, 'Inter', 'Segoe UI', system-ui, sans-serif);
  }
  .bpmn-simulator :global(.svelte-flow) {
    flex: 1;
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

  .bpmn-simulator-error {
    padding: 16px;
    color: #b3261e;
  }
  .bpmn-simulator-error pre {
    white-space: pre-wrap;
    font-size: 12px;
  }
</style>
