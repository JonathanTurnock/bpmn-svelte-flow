<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ExternalLabel from './ExternalLabel.svelte';
  import NodeHandles from './NodeHandles.svelte';

  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
  const kind = $derived(d.gatewayKind ?? 'exclusive');

  const stroke = 'var(--bpmn-stroke, #22242a)';
</script>

<div class="bpmn-gateway" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  <svg viewBox="0 0 50 50" width="100%" height="100%" preserveAspectRatio="none">
    <path
      d="M 25,2 L 48,25 L 25,48 L 2,25 Z"
      fill="var(--bpmn-fill, #ffffff)"
      stroke={stroke}
      stroke-width="1.6"
      stroke-linejoin="round"
    />
    {#if kind === 'exclusive'}
      <path
        d="M 18,17 L 21.5,17 L 25,22 L 28.5,17 L 32,17 L 27,25 L 32,33 L 28.5,33 L 25,28 L 21.5,33 L 18,33 L 23,25 Z"
        fill={stroke}
        stroke={stroke}
        stroke-width="0.8"
        stroke-linejoin="round"
      />
    {:else if kind === 'parallel'}
      <path
        d="M 23,13 L 27,13 L 27,23 L 37,23 L 37,27 L 27,27 L 27,37 L 23,37 L 23,27 L 13,27 L 13,23 L 23,23 Z"
        fill={stroke}
      />
    {:else if kind === 'inclusive'}
      <circle cx="25" cy="25" r="9" fill="none" stroke={stroke} stroke-width="2.6" />
    {:else if kind === 'complex'}
      <path
        d="M 25,12 L 25,38 M 12,25 L 38,25 M 16,16 L 34,34 M 34,16 L 16,34"
        stroke={stroke}
        stroke-width="3"
        fill="none"
      />
    {:else}
      <!-- event-based gateway family -->
      <circle cx="25" cy="25" r="11" fill="none" stroke={stroke} stroke-width="1.3" />
      {#if kind === 'event-based'}
        <circle cx="25" cy="25" r="9" fill="none" stroke={stroke} stroke-width="1.3" />
        <path
          d="M 25,19.2 L 30.4,23.2 L 28.3,29.5 L 21.7,29.5 L 19.6,23.2 Z"
          fill="none"
          stroke={stroke}
          stroke-width="1.3"
          stroke-linejoin="round"
        />
      {:else if kind === 'event-based-exclusive'}
        <path
          d="M 25,18.5 L 31,23 L 28.7,30 L 21.3,30 L 19,23 Z"
          fill="none"
          stroke={stroke}
          stroke-width="1.3"
          stroke-linejoin="round"
        />
      {:else if kind === 'event-based-parallel'}
        <path
          d="M 23.4,17.5 L 26.6,17.5 L 26.6,23.4 L 32.5,23.4 L 32.5,26.6 L 26.6,26.6 L 26.6,32.5 L 23.4,32.5 L 23.4,26.6 L 17.5,26.6 L 17.5,23.4 L 23.4,23.4 Z"
          fill="none"
          stroke={stroke}
          stroke-width="1.3"
          stroke-linejoin="round"
        />
      {/if}
    {/if}
  </svg>
  <ExternalLabel label={d.label} labelBounds={d.labelBounds} width={d.width} height={d.height} />
  <NodeHandles />
</div>

<style>
  .bpmn-gateway {
    position: relative;
  }
  .bpmn-gateway.selected svg path:first-child {
    stroke: var(--bpmn-selected, #1a70ef);
  }
</style>
