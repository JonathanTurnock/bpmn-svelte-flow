<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import NodeHandles from './NodeHandles.svelte';

  // bpmn:Lane — a horizontal (or vertical) subdivision of a pool. The lane
  // shares the pool's title-band width so nested bands line up.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
  const horizontal = $derived(d.isHorizontal !== false);

  const titleStyle = $derived(
    horizontal
      ? `width: ${Math.max(d.height - 12, 20)}px;`
      : `max-width: ${Math.max(d.width - 12, 20)}px;`
  );
</script>

<div class="bpmn-lane" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  {#if d.label}
    {#if horizontal}
      <div class="bpmn-lane-band bpmn-lane-band-left">
        <span class="bpmn-lane-title rotated" style={titleStyle}>{d.label}</span>
      </div>
    {:else}
      <div class="bpmn-lane-band bpmn-lane-band-top">
        <span class="bpmn-lane-title" style={titleStyle}>{d.label}</span>
      </div>
    {/if}
  {/if}
  <NodeHandles />
</div>

<style>
  .bpmn-lane {
    position: relative;
    box-sizing: border-box;
    border: 1.2px solid var(--bpmn-stroke, #22242a);
    background: transparent;
  }
  .bpmn-lane.selected {
    border-color: var(--bpmn-selected, #1a70ef);
  }
  .bpmn-lane-band {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: var(--bpmn-lane-band-fill, transparent);
  }
  .bpmn-lane-band-left {
    top: 0;
    left: 0;
    bottom: 0;
    width: 30px;
    border-right: 1.2px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-lane-band-top {
    top: 0;
    left: 0;
    right: 0;
    height: 30px;
    border-bottom: 1.2px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-lane-title {
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 11.5px;
    line-height: 1.2;
    color: var(--bpmn-label-color, #22242a);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    pointer-events: none;
  }
  .bpmn-lane-title.rotated {
    transform: rotate(-90deg);
  }
</style>
