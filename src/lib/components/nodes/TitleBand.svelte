<script lang="ts">
  // Title band shared by pools and lanes: a strip on the left (horizontal
  // containers, rotated title) or along the top (vertical containers).
  let {
    label,
    horizontal,
    width,
    height,
    bandSize = 30,
    borderWidth = 1.6,
    bold = false,
    selected = false
  }: {
    label?: string;
    horizontal: boolean;
    /** The container's outer size — the title is clamped to its extent. */
    width: number;
    height: number;
    bandSize?: number;
    borderWidth?: number;
    bold?: boolean;
    selected?: boolean;
  } = $props();

  // The title span is laid out unrotated, so its inline size has to be the
  // container's *height* for a horizontal band. Clamping keeps long names
  // ellipsing instead of spilling past the container.
  const titleStyle = $derived(
    horizontal
      ? `width: ${Math.max(height - 12, 20)}px;`
      : `max-width: ${Math.max(width - 12, 20)}px;`
  );
  const borderColor = $derived(
    selected ? 'var(--bpmn-selected, #2563eb)' : 'var(--bpmn-lane-border, #cbd5e1)'
  );
</script>

{#if label}
  {#if horizontal}
    <div
      class="bpmn-title-band left"
      style={`width: ${bandSize}px; border-right: ${borderWidth}px solid ${borderColor};`}
    >
      <span class="bpmn-title rotated" class:bold style={titleStyle}>{label}</span>
    </div>
  {:else}
    <div
      class="bpmn-title-band top"
      style={`height: ${bandSize}px; border-bottom: ${borderWidth}px solid ${borderColor};`}
    >
      <span class="bpmn-title" class:bold style={titleStyle}>{label}</span>
    </div>
  {/if}
{/if}

<style>
  .bpmn-title-band {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: var(--bpmn-pool-band-fill, #f1f5f9);
  }
  .bpmn-title-band.left {
    top: 0;
    left: 0;
    bottom: 0;
  }
  .bpmn-title-band.top {
    top: 0;
    left: 0;
    right: 0;
  }
  .bpmn-title {
    /* The band is narrower than the (unrotated) title box — never let flex
       shrink it, or the text ellipses at the band width instead of the
       container's extent. */
    flex: 0 0 auto;
    font-family: var(--bpmn-font-family, 'Inter', 'Segoe UI', system-ui, sans-serif);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1.2;
    color: var(--bpmn-muted-color, #64748b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    pointer-events: none;
  }
  .bpmn-title.bold {
    font-size: 12px;
    font-weight: 600;
    color: var(--bpmn-label-color, #334155);
  }
  .bpmn-title.rotated {
    transform: rotate(-90deg);
  }
</style>
