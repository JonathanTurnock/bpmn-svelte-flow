<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ExternalLabel from './ExternalLabel.svelte';
  import NodeHandles from './NodeHandles.svelte';

  // bpmn:Conversation / bpmn:SubConversation / bpmn:CallConversation — drawn as
  // a hexagon. Call conversations get a thick border; sub-conversations get a
  // collapsed "+" marker at the bottom edge. The hexagon is built from the
  // node's real pixel size so the stroke stays uniform at any aspect ratio.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);

  const strokeWidth = $derived(d.isCall ? 4 : 1.6);
  const isCollapsed = $derived((d.markers ?? []).includes('sub-process'));

  const hexPoints = $derived.by(() => {
    const w = d.width;
    const h = d.height;
    const s = strokeWidth / 2;
    const inset = Math.min(w * 0.22, h / 2 - s) + s;
    return [
      [s, h / 2],
      [inset, s],
      [w - inset, s],
      [w - s, h / 2],
      [w - inset, h - s],
      [inset, h - s]
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(' ');
  });
</script>

<div class="bpmn-conversation" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  <svg width={d.width} height={d.height} viewBox={`0 0 ${d.width} ${d.height}`} aria-hidden="true">
    <polygon
      points={hexPoints}
      fill="var(--bpmn-fill, #ffffff)"
      stroke={selected ? 'var(--bpmn-selected, #1a70ef)' : 'var(--bpmn-stroke, #22242a)'}
      stroke-width={strokeWidth}
      stroke-linejoin="round"
    />
    {#if isCollapsed}
      <g transform={`translate(${d.width / 2 - 7}, ${d.height - 19})`}>
        <rect
          x="1"
          y="1"
          width="12"
          height="12"
          rx="1.5"
          fill="none"
          stroke="var(--bpmn-stroke, #22242a)"
          stroke-width="1.4"
        />
        <line x1="7" y1="3.5" x2="7" y2="10.5" stroke="var(--bpmn-stroke, #22242a)" stroke-width="1.4" />
        <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="var(--bpmn-stroke, #22242a)" stroke-width="1.4" />
      </g>
    {/if}
  </svg>

  {#if d.labelBounds}
    <ExternalLabel label={d.label} labelBounds={d.labelBounds} width={d.width} height={d.height} />
  {:else if d.label}
    <div class="bpmn-conversation-label" style={`padding-bottom: ${isCollapsed ? 16 : 0}px;`}>
      <span>{d.label}</span>
    </div>
  {/if}
  <NodeHandles />
</div>

<style>
  .bpmn-conversation {
    position: relative;
  }
  .bpmn-conversation svg {
    display: block;
  }
  .bpmn-conversation-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding-left: 14%;
    padding-right: 14%;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 11.5px;
    line-height: 1.2;
    text-align: center;
    color: var(--bpmn-label-color, #22242a);
    pointer-events: none;
  }
</style>
