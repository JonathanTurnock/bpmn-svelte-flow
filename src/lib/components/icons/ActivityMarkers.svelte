<script lang="ts">
  import type { ActivityMarker } from '../../types.js';

  // Row of marker glyphs at the bottom-center of an activity
  // (loop, multi-instance, compensation, ad-hoc, collapsed sub-process).
  let { markers = [] }: { markers?: ActivityMarker[] } = $props();

  const stroke = 'var(--bpmn-stroke, #334155)';
</script>

{#if markers.length > 0}
  <div class="bpmn-activity-markers">
    {#each markers as marker}
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
        {#if marker === 'sub-process'}
          <rect x="1" y="1" width="12" height="12" rx="1.5" fill="none" stroke={stroke} stroke-width="1.3" />
          <line x1="7" y1="3.5" x2="7" y2="10.5" stroke={stroke} stroke-width="1.3" />
          <line x1="3.5" y1="7" x2="10.5" y2="7" stroke={stroke} stroke-width="1.3" />
        {:else if marker === 'loop'}
          <path d="M 7,1.8 A 5.2,5.2 0 1 0 12.2,7" fill="none" stroke={stroke} stroke-width="1.4" />
          <path d="M 7,1.8 L 9.5,0.8 M 7,1.8 L 8,4.3" fill="none" stroke={stroke} stroke-width="1.2" />
        {:else if marker === 'parallel-mi'}
          {#each [3, 7, 11] as x}
            <line x1={x} y1="1.5" x2={x} y2="12.5" stroke={stroke} stroke-width="1.8" />
          {/each}
        {:else if marker === 'sequential-mi'}
          {#each [3, 7, 11] as y}
            <line x1="1.5" y1={y} x2="12.5" y2={y} stroke={stroke} stroke-width="1.8" />
          {/each}
        {:else if marker === 'compensation'}
          <path d="M 6.5,2.5 L 6.5,11.5 L 1.5,7 Z M 12.5,2.5 L 12.5,11.5 L 7.5,7 Z" fill="none" stroke={stroke} stroke-width="1.2" stroke-linejoin="round" />
        {:else if marker === 'ad-hoc'}
          <path d="M 1.5,8.5 C 3.2,5 5.2,5 7,7 C 8.8,9 10.8,9 12.5,5.5" fill="none" stroke={stroke} stroke-width="1.6" />
        {/if}
      </svg>
    {/each}
  </div>
{/if}

<style>
  .bpmn-activity-markers {
    position: absolute;
    bottom: 5px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 3px;
    pointer-events: none;
  }
</style>
