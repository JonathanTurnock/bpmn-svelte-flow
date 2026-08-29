<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import ActivityMarkers from '../icons/ActivityMarkers.svelte';
  import TaskTypeIcon from '../icons/TaskTypeIcon.svelte';
  import NodeHandles from './NodeHandles.svelte';
  import TransactionInner from './TransactionInner.svelte';

  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);

  // collapsed event sub-process: thin dotted outline
  const isEventSub = $derived(!!d.triggeredByEvent);
</script>

<div
  class="bpmn-task"
  class:selected
  class:call={d.isCall}
  class:transaction={d.isTransaction}
  class:event-sub={isEventSub}
  style={`width: ${d.width}px; height: ${d.height}px;`}
>
  {#if d.isTransaction}
    <TransactionInner />
  {/if}
  <TaskTypeIcon taskType={d.taskType} />
  {#if d.label}
    <div class="bpmn-task-label">{d.label}</div>
  {/if}
  <ActivityMarkers markers={d.markers} />
  <NodeHandles />
</div>

<style>
  .bpmn-task {
    position: relative;
    box-sizing: border-box;
    background: var(--bpmn-fill, #ffffff);
    border: 1.6px solid var(--bpmn-stroke, #22242a);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bpmn-task.call {
    border-width: 3.5px;
  }
  .bpmn-task.event-sub {
    border-width: 1px;
    border-style: dotted;
  }
  .bpmn-task.selected {
    border-color: var(--bpmn-selected, #1a70ef);
  }
  .bpmn-task-label {
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 11.5px;
    line-height: 1.25;
    color: var(--bpmn-label-color, #22242a);
    text-align: center;
    padding: 4px 6px;
    overflow-wrap: break-word;
    max-width: 100%;
  }
</style>
