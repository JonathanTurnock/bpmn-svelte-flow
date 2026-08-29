<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import NodeHandles from './NodeHandles.svelte';
  import TitleBand from './TitleBand.svelte';

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
  class:blackbox={d.isEmptyPool}
  style={`width: ${d.width}px; height: ${d.height}px;`}
>
  {#if d.isEmptyPool}
    <div class="bpmn-pool-blackbox-label"><span>{d.label ?? ''}</span></div>
  {:else}
    <TitleBand label={d.label} {horizontal} width={d.width} height={d.height} bold {selected} />
  {/if}
  {#if d.participantMultiplicity}
    <svg
      class="bpmn-pool-multiplicity"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      {#each [3, 8, 13] as x}
        <line
          x1={x}
          y1="1.5"
          x2={x}
          y2="14.5"
          stroke="var(--bpmn-stroke, #334155)"
          stroke-width="2"
        />
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
    border: 1.4px solid var(--bpmn-pool-border, #94a3b8);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: var(--bpmn-node-shadow, 0 1px 2px rgb(15 23 42 / 0.06), 0 2px 8px rgb(15 23 42 / 0.05));
  }
  .bpmn-pool.selected {
    border-color: var(--bpmn-selected, #2563eb);
  }
  .bpmn-pool-blackbox-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    box-sizing: border-box;
    font-family: var(--bpmn-font-family, 'Inter', 'Segoe UI', system-ui, sans-serif);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    color: var(--bpmn-label-color, #334155);
    pointer-events: none;
  }
  .bpmn-pool-multiplicity {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }
</style>
