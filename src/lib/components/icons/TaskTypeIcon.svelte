<script lang="ts">
  // Small glyph in the top-left corner of an activity marking its task type.
  let { taskType }: { taskType?: string } = $props();

  const stroke = 'var(--bpmn-stroke, #334155)';

  const kind = $derived.by(() => {
    switch (taskType) {
      case 'bpmn:UserTask':
        return 'user';
      case 'bpmn:ServiceTask':
        return 'service';
      case 'bpmn:ScriptTask':
        return 'script';
      case 'bpmn:ManualTask':
        return 'manual';
      case 'bpmn:SendTask':
        return 'send';
      case 'bpmn:ReceiveTask':
        return 'receive';
      case 'bpmn:BusinessRuleTask':
        return 'business-rule';
      default:
        return undefined;
    }
  });
</script>

{#if kind}
  <svg class="bpmn-task-icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    {#if kind === 'user'}
      <circle cx="10" cy="6.5" r="3.4" fill="none" stroke={stroke} stroke-width="1.4" />
      <path d="M 3.5,17.5 C 3.5,12.8 6.4,11 10,11 C 13.6,11 16.5,12.8 16.5,17.5" fill="none" stroke={stroke} stroke-width="1.4" />
    {:else if kind === 'service'}
      <!-- bpmn.io-style pair of offset gears: a smaller one upper-left, a
           larger one lower-right, each a ring of short teeth around a body
           circle with a hollow hub. -->
      {#each [
        { cx: 6.6, cy: 6.8, body: 2.5, tooth: 1.3, hub: 0.9, count: 6 },
        { cx: 13.2, cy: 13, body: 3.4, tooth: 1.5, hub: 1.2, count: 6 }
      ] as g}
        <circle cx={g.cx} cy={g.cy} r={g.body} fill="none" stroke={stroke} stroke-width="1.2" />
        <circle cx={g.cx} cy={g.cy} r={g.hub} fill="none" stroke={stroke} stroke-width="1" />
        {#each Array.from({ length: g.count }) as _, i}
          <rect
            x={g.cx - g.tooth / 2}
            y={g.cy - g.body - g.tooth}
            width={g.tooth}
            height={g.tooth}
            fill={stroke}
            transform={`rotate(${(360 / g.count) * i} ${g.cx} ${g.cy})`}
          />
        {/each}
      {/each}
    {:else if kind === 'script'}
      <!-- Page with a folded corner, plus a scripted (wavy) line of text
           under two straight lines -- reads as a document/script glyph. -->
      <path d="M 4,3 L 12.5,3 L 16.5,7 L 16.5,17 L 4,17 Z" fill="none" stroke={stroke} stroke-width="1.2" stroke-linejoin="round" />
      <path d="M 12.5,3 L 12.5,7 L 16.5,7" fill="none" stroke={stroke} stroke-width="1.1" stroke-linejoin="round" />
      <line x1="6.2" y1="10" x2="14.3" y2="10" stroke={stroke} stroke-width="1.1" />
      <path d="M 6.2,13.2 C 7.2,11.9 8,14.5 9,13.2 C 10,11.9 10.8,14.5 11.8,13.2 C 12.6,12.1 13.4,13.6 14.3,13.2" fill="none" stroke={stroke} stroke-width="1.1" stroke-linecap="round" />
    {:else if kind === 'manual'}
      <!-- Stylized open hand: four splayed fingers over a palm, with a
           thumb hooking out to the side -- reads clearly as "manual" work. -->
      <rect x="3.5" y="10.5" width="10" height="6.2" rx="2.4" fill="none" stroke={stroke} stroke-width="1.2" stroke-linejoin="round" />
      <rect x="4.2" y="4.3" width="1.7" height="6.6" rx="0.85" fill="none" stroke={stroke} stroke-width="1.1" />
      <rect x="6.5" y="3" width="1.7" height="7.9" rx="0.85" fill="none" stroke={stroke} stroke-width="1.1" />
      <rect x="8.8" y="3.6" width="1.7" height="7.3" rx="0.85" fill="none" stroke={stroke} stroke-width="1.1" />
      <rect x="11.1" y="5.2" width="1.7" height="5.7" rx="0.85" fill="none" stroke={stroke} stroke-width="1.1" />
      <rect x="1" y="10.2" width="1.7" height="4.6" rx="0.85" fill="none" stroke={stroke} stroke-width="1.1" transform="rotate(-42 1.85 12.5)" />
    {:else if kind === 'send'}
      <rect x="2.5" y="5" width="15" height="10" rx="0.8" fill={stroke} />
      <path d="M 3,5.8 L 10,10.6 L 17,5.8" fill="none" stroke="var(--bpmn-fill, #ffffff)" stroke-width="1.4" />
    {:else if kind === 'receive'}
      <rect x="2.5" y="5" width="15" height="10" rx="0.8" fill="none" stroke={stroke} stroke-width="1.3" />
      <path d="M 3,5.8 L 10,10.6 L 17,5.8" fill="none" stroke={stroke} stroke-width="1.3" />
    {:else if kind === 'business-rule'}
      <rect x="2.5" y="4.5" width="15" height="11" fill="none" stroke={stroke} stroke-width="1.3" />
      <line x1="2.5" y1="8" x2="17.5" y2="8" stroke={stroke} stroke-width="1.3" />
      <line x1="2.5" y1="11.75" x2="17.5" y2="11.75" stroke={stroke} stroke-width="1" />
      <line x1="6.5" y1="8" x2="6.5" y2="15.5" stroke={stroke} stroke-width="1" />
      <rect x="2.5" y="4.5" width="15" height="3.5" fill={stroke} opacity="0.25" />
    {/if}
  </svg>
{/if}

<style>
  .bpmn-task-icon {
    position: absolute;
    top: 5px;
    left: 6px;
    pointer-events: none;
  }
</style>
