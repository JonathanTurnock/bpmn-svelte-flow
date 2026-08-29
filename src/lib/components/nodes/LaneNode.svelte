<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import NodeHandles from './NodeHandles.svelte';
  import TitleBand from './TitleBand.svelte';

  // bpmn:Lane — a horizontal (or vertical) subdivision of a pool. The lane
  // shares the pool's title-band width so nested bands line up.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
  const horizontal = $derived(d.isHorizontal !== false);
</script>

<div class="bpmn-lane" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  <TitleBand
    label={d.label}
    {horizontal}
    width={d.width}
    height={d.height}
    borderWidth={1.2}
    {selected}
  />
  <NodeHandles />
</div>

<style>
  .bpmn-lane {
    position: relative;
    box-sizing: border-box;
    border: 1px solid var(--bpmn-lane-border, #cbd5e1);
    background: transparent;
  }
  .bpmn-lane.selected {
    border-color: var(--bpmn-selected, #2563eb);
  }
</style>
