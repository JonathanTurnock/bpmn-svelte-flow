<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ActivityMarkers from '../icons/ActivityMarkers.svelte';
  import ExternalLabel from './ExternalLabel.svelte';
  import NodeHandles from './NodeHandles.svelte';

  // Conversation / sub-conversation / call conversation: hexagon.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
</script>

<div class="bpmn-conversation" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  <svg viewBox="0 0 50 44" width="100%" height="100%" preserveAspectRatio="none">
    <path
      d="M 12.5,2 L 37.5,2 L 48,22 L 37.5,42 L 12.5,42 L 2,22 Z"
      fill="var(--bpmn-fill, #ffffff)"
      stroke="var(--bpmn-stroke, #22242a)"
      stroke-width={d.isCall ? 3.4 : 1.6}
      stroke-linejoin="round"
    />
  </svg>
  <ActivityMarkers markers={d.markers} />
  <ExternalLabel label={d.label} labelBounds={d.labelBounds} width={d.width} height={d.height} />
  <NodeHandles />
</div>

<style>
  .bpmn-conversation {
    position: relative;
  }
  .bpmn-conversation.selected svg path {
    stroke: var(--bpmn-selected, #1a70ef);
  }
</style>
