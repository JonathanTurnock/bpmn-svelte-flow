<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ExternalLabel from './ExternalLabel.svelte';
  import NodeHandles from './NodeHandles.svelte';

  // Data object / data input / data output: page with a folded corner.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
  const stroke = 'var(--bpmn-stroke, #22242a)';
</script>

<div class="bpmn-data-object" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  <svg viewBox="0 0 36 50" width="100%" height="100%" preserveAspectRatio="none">
    <path
      d="M 2,2 L 26,2 L 34,10 L 34,48 L 2,48 Z"
      fill="var(--bpmn-fill, #ffffff)"
      stroke={stroke}
      stroke-width="1.6"
      stroke-linejoin="round"
    />
    <path d="M 26,2 L 26,10 L 34,10" fill="none" stroke={stroke} stroke-width="1.6" stroke-linejoin="round" />
    {#if d.dataKind === 'input'}
      <path d="M 8,10 L 16,10 L 16,6 L 24,13 L 16,20 L 16,16 L 8,16 Z" fill="none" stroke={stroke} stroke-width="1.4" stroke-linejoin="round" />
    {:else if d.dataKind === 'output'}
      <path d="M 8,10 L 16,10 L 16,6 L 24,13 L 16,20 L 16,16 L 8,16 Z" fill={stroke} stroke={stroke} stroke-width="1.4" stroke-linejoin="round" />
    {/if}
    {#if d.isCollection}
      <g stroke={stroke} stroke-width="1.6">
        <line x1="14" y1="38" x2="14" y2="46" />
        <line x1="18" y1="38" x2="18" y2="46" />
        <line x1="22" y1="38" x2="22" y2="46" />
      </g>
    {/if}
  </svg>
  <ExternalLabel label={d.label} labelBounds={d.labelBounds} width={d.width} height={d.height} />
  <NodeHandles />
</div>

<style>
  .bpmn-data-object {
    position: relative;
  }
  .bpmn-data-object.selected svg path:first-child {
    stroke: var(--bpmn-selected, #1a70ef);
  }
</style>
