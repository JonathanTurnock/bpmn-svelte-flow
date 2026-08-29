<script lang="ts">
  // Small glyph in the top-left corner of an activity marking its task type.
  let { taskType }: { taskType?: string } = $props();

  const stroke = 'var(--bpmn-stroke, #22242a)';

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
      <path d="M 6,3.5 C 3.5,5 3.5,6.5 6,8 C 8.5,9.5 8.5,11 6,12.5 C 3.5,14 3.5,15.5 6,16.5 L 14,16.5 C 16.5,15 16.5,13.5 14,12 C 11.5,10.5 11.5,9 14,7.5 C 16.5,6 16.5,4.5 14,3.5 Z" fill="none" stroke={stroke} stroke-width="1.3" />
      {#each [6.2, 9.2, 12.2] as y}
        <line x1="7" y1={y} x2="13" y2={y} stroke={stroke} stroke-width="1.2" />
      {/each}
    {:else if kind === 'manual'}
      <!-- Stylized hand: a palm with a hooked thumb, and four fingers as
           stepped bars extending to the right (bpmn.io "manual task" glyph). -->
      <path d="M 3,12.5 C 3,9.5 3,7 4.6,5.8 C 5.4,5.2 6.3,5.6 6.3,6.6 L 6.3,10.5 L 9,10.5" fill="none" stroke={stroke} stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 6.3,10.9 C 6.3,15.1 8.3,17 11.3,17 L 14.5,17 C 16.2,17 17.2,15.9 17.2,14.6" fill="none" stroke={stroke} stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="9" y="3.3" width="7" height="2.3" rx="1.15" fill="none" stroke={stroke} stroke-width="1.1" />
      <rect x="9" y="6" width="8" height="2.3" rx="1.15" fill="none" stroke={stroke} stroke-width="1.1" />
      <rect x="9" y="8.7" width="8" height="2.3" rx="1.15" fill="none" stroke={stroke} stroke-width="1.1" />
      <rect x="9" y="11.4" width="6.8" height="2.3" rx="1.15" fill="none" stroke={stroke} stroke-width="1.1" />
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
