<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ActivityMarkers from '../icons/ActivityMarkers.svelte';
  import NodeHandles from './NodeHandles.svelte';
  import TransactionInner from './TransactionInner.svelte';

  // Expanded sub-process / transaction / ad-hoc / event sub-process container.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
</script>

<div
  class="bpmn-subprocess"
  class:selected
  class:call={d.isCall}
  class:transaction={d.isTransaction}
  class:event-sub={d.triggeredByEvent}
  style={`width: ${d.width}px; height: ${d.height}px;`}
>
  {#if d.isTransaction}
    <TransactionInner />
  {/if}
  {#if d.label}
    <div class="bpmn-subprocess-label">{d.label}</div>
  {/if}
  <ActivityMarkers markers={d.markers} />
  <NodeHandles />
</div>

<style>
  .bpmn-subprocess {
    position: relative;
    box-sizing: border-box;
    background: var(--bpmn-container-fill, #ffffff);
    border: 1.4px solid var(--bpmn-stroke, #334155);
    border-radius: 12px;
  }
  .bpmn-subprocess.call {
    border-width: 3.5px;
  }
  .bpmn-subprocess.event-sub {
    border-width: 1.2px;
    border-style: dotted;
  }
  .bpmn-subprocess.selected {
    border-color: var(--bpmn-selected, #2563eb);
  }
  .bpmn-subprocess-label {
    position: absolute;
    top: 4px;
    left: 8px;
    font-family: var(--bpmn-font-family, 'Inter', 'Segoe UI', system-ui, sans-serif);
    font-size: 11.5px;
    color: var(--bpmn-label-color, #334155);
  }
</style>
