<script lang="ts">
  import { Background, BackgroundVariant, Controls, MiniMap, SvelteFlow } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { parseBpmn } from '../parser/parse.js';
  import { bpmnToFlow } from '../parser/transform.js';
  import type { BpmnFlowEdge, BpmnFlowNode } from '../types.js';
  import { bpmnEdgeTypes, bpmnNodeTypes } from './registry.js';

  let {
    xml,
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
    /** BPMN 2.0 XML document to render. */
    xml: string;
    /** Optional id of the BPMNDiagram to render (defaults to the first). */
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
    const currentXml = xml;
    const currentDiagramId = diagramId;
    let cancelled = false;

    (async () => {
      try {
        const { definitions, warnings: parseWarnings } = await parseBpmn(currentXml);
        if (cancelled) return;
        const graph = bpmnToFlow(definitions, { diagramId: currentDiagramId });
        nodes = graph.nodes;
        edges = graph.edges;
        parseError = undefined;
        onload?.({
          nodes: graph.nodes,
          edges: graph.edges,
          warnings: [...parseWarnings, ...graph.warnings]
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
  .bpmn-diagram :global(.bpmn-hidden-handle) {
    opacity: 0;
    pointer-events: none;
    width: 1px;
    height: 1px;
    min-width: 0;
    min-height: 0;
    border: none;
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
