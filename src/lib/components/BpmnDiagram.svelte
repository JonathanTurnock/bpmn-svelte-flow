<script lang="ts">
  import { Background, BackgroundVariant, Controls, MiniMap, SvelteFlow } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import type { BpmnJsonDocument } from '../parser/json.js';
  import { loadDefinition } from '../parser/load.js';
  import type { BpmnFlowEdge, BpmnFlowNode } from '../types.js';
  import { bpmnEdgeTypes, bpmnNodeTypes } from './registry.js';

  let {
    xml,
    definition,
    diagramId,
    height = '100%',
    width = '100%',
    background = true,
    controls = true,
    minimap = false,
    interactive = true,
    fitViewPadding = 0.1,
    onload,
    onerror
  }: {
    /**
     * Document to render: BPMN 2.0 XML, or a JSON diagram document
     * (string or object) — the format is auto-detected.
     */
    xml?: string;
    /** Alias for `xml` that also accepts a JSON document object. */
    definition?: string | BpmnJsonDocument;
    /** XML only: id of the BPMNDiagram to render (defaults to the first). */
    diagramId?: string;
    /** CSS height of the canvas container. */
    height?: string;
    /** CSS width of the canvas container. */
    width?: string;
    /** Show the dotted canvas background. */
    background?: boolean;
    /** Show zoom/fit controls. */
    controls?: boolean;
    /** Show a minimap. */
    minimap?: boolean;
    /** Allow panning/zooming/selection. */
    interactive?: boolean;
    /** Padding passed to fitView. */
    fitViewPadding?: number;
    /** Called after a document is parsed and rendered. */
    onload?: (info: { nodes: BpmnFlowNode[]; edges: BpmnFlowEdge[]; warnings: string[] }) => void;
    /** Called when parsing fails. */
    onerror?: (error: Error) => void;
  } = $props();

  let nodes = $state.raw<BpmnFlowNode[]>([]);
  let edges = $state.raw<BpmnFlowEdge[]>([]);
  let parseError = $state<string | undefined>(undefined);

  $effect(() => {
    const input = definition ?? xml;
    const currentDiagramId = diagramId;
    let cancelled = false;

    (async () => {
      try {
        if (input === undefined) throw new Error('BpmnDiagram needs an `xml` or `definition` prop');
        const graph = await loadDefinition(input, { diagramId: currentDiagramId });
        if (cancelled) return;
        nodes = graph.nodes;
        edges = graph.edges;
        parseError = undefined;
        onload?.({
          nodes: graph.nodes,
          edges: graph.edges,
          warnings: graph.warnings
        });
      } catch (err) {
        if (cancelled) return;
        nodes = [];
        edges = [];
        parseError = err instanceof Error ? err.message : String(err);
        onerror?.(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return () => {
      cancelled = true;
    };
  });
</script>

<div class="bpmn-diagram" style={`width: ${width}; height: ${height};`}>
  {#if parseError}
    <div class="bpmn-diagram-error">
      <strong>Failed to parse BPMN document</strong>
      <pre>{parseError}</pre>
    </div>
  {:else}
    <SvelteFlow
      bind:nodes
      bind:edges
      nodeTypes={bpmnNodeTypes}
      edgeTypes={bpmnEdgeTypes}
      fitView
      fitViewOptions={{ padding: fitViewPadding }}
      minZoom={0.1}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={interactive}
      panOnDrag={interactive}
      zoomOnScroll={interactive}
      zoomOnPinch={interactive}
      zoomOnDoubleClick={false}
      preventScrolling={interactive}
      proOptions={{ hideAttribution: true }}
    >
      {#if background}
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      {/if}
      {#if controls}
        <Controls showLock={false} />
      {/if}
      {#if minimap}
        <MiniMap />
      {/if}
    </SvelteFlow>
  {/if}
</div>

<style>
  .bpmn-diagram {
    position: relative;
    background: var(--bpmn-canvas-bg, #ffffff);
  }
  .bpmn-diagram-error {
    padding: 16px;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    color: #b3261e;
  }
  .bpmn-diagram-error pre {
    white-space: pre-wrap;
    font-size: 12px;
  }
</style>
