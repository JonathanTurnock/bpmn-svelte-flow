<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ActivityMarkers from '../icons/ActivityMarkers.svelte';
  import NodeHandles from './NodeHandles.svelte';

  // bpmn:ChoreographyTask / bpmn:SubChoreography / bpmn:CallChoreography —
  // a rounded rectangle with one participant band per participant. The
  // initiating participant's band is white, every other band is shaded.
  // Band order: initiating participant on top, the remaining participants
  // stacked at the bottom in declaration order.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);

  const participants = $derived(d.participants ?? []);
  const top = $derived(participants.find((p) => p.initiating) ?? participants[0]);
  const bottom = $derived(participants.filter((p) => p !== top));
  const bandCount = $derived((top ? 1 : 0) + bottom.length);
  // Keep the bands from eating the whole shape on short nodes.
  const bandHeight = $derived(
    bandCount > 0 ? Math.max(14, Math.min(20, (d.height - 24) / bandCount)) : 0
  );
</script>

<div
  class="bpmn-choreography"
  class:selected
  class:call={d.isCall}
  style={`width: ${d.width}px; height: ${d.height}px;`}
>
  {#if top}
    <div
      class="bpmn-choreo-band top"
      class:initiating={top.initiating}
      style={`height: ${bandHeight}px;`}
    >
      <span class="bpmn-choreo-band-name">{top.name ?? ''}</span>
      {#if top.multiplicity}
        <svg class="bpmn-choreo-multiplicity" viewBox="0 0 14 12" width="12" height="10" aria-hidden="true">
          {#each [2, 7, 12] as x}
            <line x1={x} y1="0.8" x2={x} y2="11.2" stroke="var(--bpmn-stroke, #334155)" stroke-width="1.8" />
          {/each}
        </svg>
      {/if}
    </div>
  {/if}

  <div class="bpmn-choreo-body">
    {#if d.label}<span>{d.label}</span>{/if}
    <ActivityMarkers markers={d.markers} />
  </div>

  {#each bottom as p}
    <div
      class="bpmn-choreo-band bottom"
      class:initiating={p.initiating}
      style={`height: ${bandHeight}px;`}
    >
      <span class="bpmn-choreo-band-name">{p.name ?? ''}</span>
      {#if p.multiplicity}
        <svg class="bpmn-choreo-multiplicity" viewBox="0 0 14 12" width="12" height="10" aria-hidden="true">
          {#each [2, 7, 12] as x}
            <line x1={x} y1="0.8" x2={x} y2="11.2" stroke="var(--bpmn-stroke, #334155)" stroke-width="1.8" />
          {/each}
        </svg>
      {/if}
    </div>
  {/each}

  <NodeHandles />
</div>

<style>
  .bpmn-choreography {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: var(--bpmn-fill, #ffffff);
    border: 1.6px solid var(--bpmn-stroke, #334155);
    border-radius: 10px;
    overflow: hidden;
  }
  .bpmn-choreography.call {
    border-width: 4px;
  }
  .bpmn-choreography.selected {
    border-color: var(--bpmn-selected, #2563eb);
  }
  .bpmn-choreo-band {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
    box-sizing: border-box;
    background: var(--bpmn-choreo-band-fill, #d5d9e0);
  }
  .bpmn-choreo-band.initiating {
    background: var(--bpmn-fill, #ffffff);
  }
  .bpmn-choreo-band.top {
    border-bottom: 1.4px solid var(--bpmn-stroke, #334155);
  }
  .bpmn-choreo-band.bottom {
    border-top: 1.4px solid var(--bpmn-stroke, #334155);
  }
  .bpmn-choreo-band-name {
    font-family: var(--bpmn-font-family, 'Inter', 'Segoe UI', system-ui, sans-serif);
    font-size: 11px;
    line-height: 1.2;
    color: var(--bpmn-label-color, #334155);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bpmn-choreo-multiplicity {
    position: absolute;
    right: 4px;
    bottom: 1px;
  }
  .bpmn-choreo-body {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-family: var(--bpmn-font-family, 'Inter', 'Segoe UI', system-ui, sans-serif);
    font-size: 11.5px;
    line-height: 1.25;
    color: var(--bpmn-label-color, #334155);
    padding: 4px 8px 16px;
    box-sizing: border-box;
    overflow: hidden;
  }
</style>
