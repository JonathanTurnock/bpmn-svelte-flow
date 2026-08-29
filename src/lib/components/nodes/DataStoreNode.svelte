<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ExternalLabel from './ExternalLabel.svelte';
  import NodeHandles from './NodeHandles.svelte';

  // Data store: cylinder.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
  const stroke = 'var(--bpmn-stroke, #334155)';
</script>

<div class="bpmn-data-store" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  <svg viewBox="0 0 50 50" width="100%" height="100%" preserveAspectRatio="none">
    <path
      d="M 4,10 C 4,5.5 13.4,2 25,2 C 36.6,2 46,5.5 46,10 L 46,40 C 46,44.5 36.6,48 25,48 C 13.4,48 4,44.5 4,40 Z"
      fill="var(--bpmn-fill, #ffffff)"
      stroke={stroke}
      stroke-width="1.6"
    />
    <path d="M 4,10 C 4,14.5 13.4,18 25,18 C 36.6,18 46,14.5 46,10" fill="none" stroke={stroke} stroke-width="1.6" />
    <path d="M 4,15 C 4,19.5 13.4,23 25,23 C 36.6,23 46,19.5 46,15" fill="none" stroke={stroke} stroke-width="1.2" />
    <path d="M 4,20 C 4,24.5 13.4,28 25,28 C 36.6,28 46,24.5 46,20" fill="none" stroke={stroke} stroke-width="1.2" />
  </svg>
  <ExternalLabel label={d.label} labelBounds={d.labelBounds} width={d.width} height={d.height} />
  <NodeHandles />
</div>

<style>
  .bpmn-data-store {
    position: relative;
  }
  .bpmn-data-store.selected svg path:first-child {
    stroke: var(--bpmn-selected, #2563eb);
  }
</style>
