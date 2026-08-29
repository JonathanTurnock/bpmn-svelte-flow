<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ActivityMarkers from '../icons/ActivityMarkers.svelte';
  import NodeHandles from './NodeHandles.svelte';

  // Choreography task / sub-choreography: rounded rect with participant bands.
  // The initiating participant band is white; the others are shaded.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);

  const participants = $derived(d.participants ?? []);
  // Initiating participant on top, remaining participants at the bottom.
  const top = $derived(participants.find((p) => p.initiating) ?? participants[0]);
  const bottom = $derived(participants.filter((p) => p !== top));
</script>

<div
  class="bpmn-choreography"
  class:selected
  class:call={d.isCall}
  style={`width: ${d.width}px; height: ${d.height}px;`}
>
  {#if top}
    <div class="bpmn-choreo-band top" class:initiating={top.initiating}>{top.name ?? ''}</div>
  {/if}
  <div class="bpmn-choreo-body">
    {#if d.label}<span>{d.label}</span>{/if}
  </div>
  {#each bottom as p}
    <div class="bpmn-choreo-band bottom" class:initiating={p.initiating}>{p.name ?? ''}</div>
  {/each}
  <ActivityMarkers markers={d.markers} />
  <NodeHandles />
</div>

<style>
  .bpmn-choreography {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: var(--bpmn-fill, #ffffff);
    border: 1.6px solid var(--bpmn-stroke, #22242a);
    border-radius: 10px;
    overflow: hidden;
  }
  .bpmn-choreography.call {
    border-width: 3.4px;
  }
  .bpmn-choreography.selected {
    border-color: var(--bpmn-selected, #1a70ef);
  }
  .bpmn-choreo-band {
    flex: 0 0 auto;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 11px;
    color: var(--bpmn-label-color, #22242a);
    background: var(--bpmn-choreo-band-fill, #d5d9e0);
  }
  .bpmn-choreo-band.initiating {
    background: var(--bpmn-fill, #ffffff);
  }
  .bpmn-choreo-band.top {
    border-bottom: 1.4px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-choreo-band.bottom {
    border-top: 1.4px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-choreo-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 11.5px;
    color: var(--bpmn-label-color, #22242a);
    padding: 2px 6px 10px;
  }
</style>
