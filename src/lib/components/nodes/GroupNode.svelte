<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import NodeHandles from './NodeHandles.svelte';

  // bpmn:Group — non-constraining dash-dot rounded rectangle.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
</script>

<div class="bpmn-group" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${d.width} ${d.height}`}>
    <rect
      x="1"
      y="1"
      width={d.width - 2}
      height={d.height - 2}
      rx="10"
      fill="none"
      stroke="var(--bpmn-stroke, #334155)"
      stroke-width="1.4"
      stroke-dasharray="8,3,1,3"
    />
  </svg>
  {#if d.label}
    <div class="bpmn-group-label">{d.label}</div>
  {/if}
  <NodeHandles />
</div>

<style>
  .bpmn-group {
    position: relative;
    pointer-events: none;
  }
  .bpmn-group-label {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--bpmn-font-family, 'Inter', 'Segoe UI', system-ui, sans-serif);
    font-size: 11px;
    color: var(--bpmn-label-color, #334155);
  }
</style>
