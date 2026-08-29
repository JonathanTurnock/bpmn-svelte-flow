<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import EventDefinitionIcon from '../icons/EventDefinitionIcon.svelte';
  import ExternalLabel from './ExternalLabel.svelte';
  import NodeHandles from './NodeHandles.svelte';

  // Renders every BPMN 2.0 event shape.
  //
  // Ring geometry (BPMN 2.0 §10.4.1 / bpmn.io house style):
  //   start ...................... single thin circle
  //   end ........................ single THICK circle
  //   intermediate catch/throw ... double thin circle
  //   boundary ................... double thin circle
  //   non-interrupting ........... every ring dashed
  //
  // Glyph fill: catch events use outline glyphs, throw events (intermediate
  // throw + end) use filled glyphs — see EventDefinitionIcon.
  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);

  const kind = $derived(d.eventKind ?? 'start');
  const isEnd = $derived(kind === 'end');
  const isDoubleRing = $derived(
    kind === 'intermediate-throw' || kind === 'intermediate-catch' || kind === 'boundary'
  );
  const isThrow = $derived(kind === 'intermediate-throw' || kind === 'end');
  /** Non-interrupting event sub-process start / boundary event → dashed rings. */
  const nonInterrupting = $derived(d.interrupting === false);
  const dash = $derived(nonInterrupting ? '6,4' : undefined);

  const definitions = $derived(d.eventDefinitions ?? []);
  /** Two or more event definitions ⇒ the multiple / parallel-multiple marker. */
  const isMultiple = $derived(definitions.length > 1);
  const isParallelMultiple = $derived(isMultiple && d.parallelMultiple === true);
  const definition = $derived(isMultiple ? 'multiple' : definitions[0]);

  // Outer radius is chosen so that circle + half the stroke exactly fills the
  // 36×36 viewBox, matching the DI bounds of the event.
  const outerRadius = $derived(isEnd ? 16 : isDoubleRing ? 17.25 : 17);
  const outerWidth = $derived(isEnd ? 4 : isDoubleRing ? 1.5 : 2);
</script>

<div
  class="bpmn-event bpmn-event-{kind}"
  class:selected
  class:non-interrupting={nonInterrupting}
  style={`width: ${d.width}px; height: ${d.height}px;`}
>
  <svg viewBox="0 0 36 36" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
    <circle
      class="bpmn-event-ring outer"
      cx="18"
      cy="18"
      r={outerRadius}
      fill="var(--bpmn-fill, #ffffff)"
      stroke="var(--bpmn-stroke, #334155)"
      stroke-width={outerWidth}
      stroke-dasharray={dash}
    />
    {#if isDoubleRing}
      <circle
        class="bpmn-event-ring inner"
        cx="18"
        cy="18"
        r="14.25"
        fill="none"
        stroke="var(--bpmn-stroke, #334155)"
        stroke-width="1.5"
        stroke-dasharray={dash}
      />
    {/if}
  </svg>
  <EventDefinitionIcon {definition} filled={isThrow} parallelMultiple={isParallelMultiple} />
  <ExternalLabel label={d.label} labelBounds={d.labelBounds} width={d.width} height={d.height} />
  <NodeHandles />
</div>

<style>
  .bpmn-event {
    position: relative;
  }
  .bpmn-event.selected .bpmn-event-ring {
    stroke: var(--bpmn-selected, #2563eb);
  }
</style>
