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

  // The title span is laid out unrotated, so its inline size has to be the
  // pool's *height* for a horizontal pool. Clamping it there keeps long names
  // from spilling past the pool instead of ellipsing.
  const titleStyle = $derived(
    horizontal
      ? `width: ${Math.max(d.height - 12, 20)}px;`
      : `max-width: ${Math.max(d.width - 12, 20)}px;`
  );
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
  {:else if horizontal}
    <div class="bpmn-pool-band bpmn-pool-band-left">
      <span class="bpmn-pool-title rotated" style={titleStyle}>{d.label ?? ''}</span>
    </div>
  {:else}
    <div class="bpmn-pool-band bpmn-pool-band-top">
      <span class="bpmn-pool-title" style={titleStyle}>{d.label ?? ''}</span>
    </div>
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
          stroke="var(--bpmn-stroke, #22242a)"
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
    overflow: hidden;
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
  .bpmn-pool.selected .bpmn-pool-band-left {
    border-right-color: var(--bpmn-selected, #1a70ef);
  }
  .bpmn-pool.selected .bpmn-pool-band-top {
    border-bottom-color: var(--bpmn-selected, #1a70ef);
  }
  .bpmn-pool-title {
    /* The band is narrower than the (unrotated) title box — never let flex
       shrink it, or the text ellipses at the band width instead of the pool's. */
    flex: 0 0 auto;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--bpmn-label-color, #22242a);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    pointer-events: none;
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
    padding: 4px 10px;
    box-sizing: border-box;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    color: var(--bpmn-label-color, #22242a);
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
