<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import EventDefinitionIcon from '../icons/EventDefinitionIcon.svelte';
  import ExternalLabel from './ExternalLabel.svelte';
  import NodeHandles from './NodeHandles.svelte';

  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);

  const kind = $derived(d.eventKind ?? 'start');
  const isEnd = $derived(kind === 'end');
  const isIntermediate = $derived(
    kind === 'intermediate-throw' || kind === 'intermediate-catch' || kind === 'boundary'
  );
  const isThrow = $derived(kind === 'intermediate-throw' || kind === 'end');
  const nonInterrupting = $derived(d.interrupting === false);

  const definitions = $derived(d.eventDefinitions ?? []);
  const definition = $derived(
    definitions.length > 1 ? 'multiple' : definitions[0]
  );
</script>

<div
  class="bpmn-event bpmn-event-{kind}"
  class:selected
  style={`width: ${d.width}px; height: ${d.height}px;`}
>
  <svg viewBox="0 0 36 36" width="100%" height="100%" preserveAspectRatio="none">
    <circle
      cx="18"
      cy="18"
      r="17"
      fill="var(--bpmn-fill, #ffffff)"
      stroke="var(--bpmn-stroke, #22242a)"
      stroke-width={isEnd ? 3.2 : 1.6}
      stroke-dasharray={nonInterrupting ? '4,3' : undefined}
    />
    {#if isIntermediate}
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke="var(--bpmn-stroke, #22242a)"
        stroke-width="1.3"
        stroke-dasharray={nonInterrupting ? '4,3' : undefined}
      />
    {/if}
  </svg>
  <EventDefinitionIcon
    {definition}
    filled={isThrow}
    parallelMultiple={d.parallelMultiple && definitions.length > 1}
  />
  <ExternalLabel label={d.label} labelBounds={d.labelBounds} width={d.width} height={d.height} />
  <NodeHandles />
</div>

<style>
  .bpmn-event {
    position: relative;
  }
  .bpmn-event.selected svg circle:first-child {
    stroke: var(--bpmn-selected, #1a70ef);
  }
</style>
