<script lang="ts">
  import { Background, BackgroundVariant, Controls, SvelteFlow } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { bpmnNodeTypes, bpmnEdgeTypes } from '$bsf/components/registry.js';
  import '$bsf/styles.css';
  import type { BpmnFlowEdge, BpmnFlowNode } from '$bsf/types.js';
  import { studio } from '../studio.svelte.js';

  const FIXED = new Set(['bpmn:Participant', 'bpmn:Lane']);

  let nodes = $state.raw<BpmnFlowNode[]>([]);
  let edges = $state.raw<BpmnFlowEdge[]>([]);

  // Rebuild the flow graph whenever the model, the run, or selection change.
  $effect(() => {
    void studio.modelVersion;
    void studio.runVersion;
    const selected = studio.selectedId;
    const graph = studio.graph;
    if (!graph) {
      nodes = [];
      edges = [];
      return;
    }
    // During timeline playback the current frame is the source of truth;
    // otherwise (instant runs, agent-driven runs) the live engine state is.
    const frame = studio.frames.length ? studio.frames[studio.frameIndex] : null;
    const engine = studio.engine;
    const visited = frame?.visited ?? engine?.state.visited ?? new Set<string>();
    const traversed = frame?.traversed ?? engine?.state.traversedEdges ?? new Set<string>();
    const active = new Set(frame?.active ?? (engine?.liveTokens() ?? []).map((t) => t.at.id));
    nodes = graph.nodes.map((n) => ({
      ...n,
      draggable: !FIXED.has(n.data.element),
      class: [
        visited.has(n.id) ? 'bsf-visited' : '',
        active.has(n.id) ? 'bsf-active' : '',
        selected === n.id ? 'bsf-selected' : ''
      ]
        .filter(Boolean)
        .join(' ')
    }));
    const tokens = studio.tokenEdges;
    // Token travel time tracks the playback pace (900ms per beat at 1x).
    const tokenDur = Math.min(1.2, Math.max(0.2, 0.5 / studio.speed));
    edges = graph.edges.map((e) => ({
      ...e,
      class: traversed.has(e.id) ? 'bsf-traversed' : '',
      data: { ...e.data!, token: tokens[e.id], tokenDur }
    }));
  });

  function ondragstop({ nodes: dragged }: { targetNode: BpmnFlowNode | null; nodes: BpmnFlowNode[] }) {
    const moves = dragged.map((n) => ({ id: n.id, x: Math.round(n.position.x), y: Math.round(n.position.y) }));
    if (!moves.length) return;
    void studio.mutate(() => {
      for (const m of moves) studio.moveShape(m.id, m.x, m.y);
    });
  }
</script>

<div class="h-full w-full" data-testid="canvas">
  {#key studio.docVersion}
  <SvelteFlow
    bind:nodes
    bind:edges
    nodeTypes={bpmnNodeTypes}
    edgeTypes={bpmnEdgeTypes}
    fitView
    fitViewOptions={{ padding: 0.12 }}
    minZoom={0.1}
    nodesConnectable={false}
    zoomOnDoubleClick={false}
    proOptions={{ hideAttribution: true }}
    onnodeclick={({ node }) => (studio.selectedId = node.id)}
    onedgeclick={({ edge }) => (studio.selectedId = edge.id)}
    onpaneclick={() => (studio.selectedId = null)}
    onnodedragstop={ondragstop}
  >
    <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
    <Controls showLock={false} />
  </SvelteFlow>
  {/key}
</div>
