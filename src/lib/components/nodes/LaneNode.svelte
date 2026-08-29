<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import NodeHandles from './NodeHandles.svelte';

  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
  const horizontal = $derived(d.isHorizontal !== false);
</script>

<div class="bpmn-lane" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  {#if d.label}
    {#if horizontal}
      <div class="bpmn-lane-band-left"><span class="rotated">{d.label}</span></div>
    {:else}
      <div class="bpmn-lane-band-top"><span>{d.label}</span></div>
    {/if}
  {/if}
  <NodeHandles />
</div>

<style>
  .bpmn-lane {
    position: relative;
    box-sizing: border-box;
    border: 1px solid var(--bpmn-stroke, #22242a);
    background: transparent;
  }
  .bpmn-lane.selected {
    border-color: var(--bpmn-selected, #1a70ef);
  }
  .bpmn-lane-band-left,
  .bpmn-lane-band-top {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 11.5px;
    color: var(--bpmn-label-color, #22242a);
  }
  .bpmn-lane-band-left {
    top: 0;
    left: 0;
    bottom: 0;
    width: 24px;
    border-right: 1px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-lane-band-top {
    top: 0;
    left: 0;
    right: 0;
    height: 24px;
    border-bottom: 1px solid var(--bpmn-stroke, #22242a);
  }
  .rotated {
    transform: rotate(-90deg);
    white-space: nowrap;
  }
</style>
