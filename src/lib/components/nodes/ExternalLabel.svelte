<script lang="ts">
  import type { Bounds } from '../../types.js';

  // Renders the external label of a shape (events, gateways, data elements).
  // Placement follows the DI label bounds when present, otherwise the label
  // is centered below the shape.
  let {
    label,
    labelBounds,
    width,
    height
  }: {
    label?: string;
    labelBounds?: Bounds;
    width: number;
    height: number;
  } = $props();

  const style = $derived.by(() => {
    if (labelBounds) {
      return `left: ${labelBounds.x}px; top: ${labelBounds.y}px; width: ${Math.max(labelBounds.width, 20)}px;`;
    }
    return `left: ${width / 2 - 60}px; top: ${height + 4}px; width: 120px; text-align: center;`;
  });
</script>

{#if label}
  <div class="bpmn-external-label" {style}>{label}</div>
{/if}

<style>
  .bpmn-external-label {
    position: absolute;
    font-family: var(--bpmn-font-family, 'Inter', 'Segoe UI', system-ui, sans-serif);
    font-size: 11px;
    line-height: 1.2;
    color: var(--bpmn-label-color, #334155);
    pointer-events: none;
    white-space: pre-line;
    text-align: center;
  }
</style>
