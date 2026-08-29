<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import NodeHandles from './NodeHandles.svelte';

  // bpmn:Participant — a pool. Horizontal pools show a rotated title band on
  // the left; vertical pools show it along the top. Pools without a process
  // reference render as "black box" pools (name centered, no band).
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
  const horizontal = $derived(d.isHorizontal !== false);
</script>

<div
  class="bpmn-pool"
  class:selected
  class:horizontal
  style={`width: ${d.width}px; height: ${d.height}px;`}
>
  {#if d.isEmptyPool}
    <div class="bpmn-pool-blackbox-label">{d.label ?? ''}</div>
  {:else if horizontal}
    <div class="bpmn-pool-band bpmn-pool-band-left">
      <span class="bpmn-pool-title rotated">{d.label ?? ''}</span>
    </div>
  {:else}
    <div class="bpmn-pool-band bpmn-pool-band-top">
      <span class="bpmn-pool-title">{d.label ?? ''}</span>
    </div>
  {/if}
  {#if d.participantMultiplicity}
    <svg class="bpmn-pool-multiplicity" viewBox="0 0 14 14" width="14" height="14">
      {#each [3, 7, 11] as x}
        <line x1={x} y1="1.5" x2={x} y2="12.5" stroke="var(--bpmn-stroke, #22242a)" stroke-width="1.8" />
      {/each}
    </svg>
  {/if}
  <NodeHandles />
</div>

<style>
  .bpmn-pool {
    position: relative;
    box-sizing: border-box;
    background: var(--bpmn-pool-fill, #ffffff);
    border: 1.6px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-pool.selected {
    border-color: var(--bpmn-selected, #1a70ef);
  }
  .bpmn-pool-band {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bpmn-pool-band-fill, transparent);
  }
  .bpmn-pool-band-left {
    top: 0;
    left: 0;
    bottom: 0;
    width: 30px;
    border-right: 1.6px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-pool-band-top {
    top: 0;
    left: 0;
    right: 0;
    height: 30px;
    border-bottom: 1.6px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-pool-title {
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 12px;
    font-weight: 600;
    color: var(--bpmn-label-color, #22242a);
    white-space: nowrap;
  }
  .bpmn-pool-title.rotated {
    transform: rotate(-90deg);
  }
  .bpmn-pool-blackbox-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 12px;
    font-weight: 600;
    color: var(--bpmn-label-color, #22242a);
  }
  .bpmn-pool-multiplicity {
    position: absolute;
    bottom: 3px;
    left: 50%;
    transform: translateX(-50%);
  }
</style>
