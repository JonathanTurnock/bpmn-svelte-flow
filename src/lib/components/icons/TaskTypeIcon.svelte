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
      <circle cx="10" cy="10" r="3" fill="none" stroke={stroke} stroke-width="1.4" />
      {#each Array.from({ length: 8 }) as _, i}
        <line
          x1={10 + 4.4 * Math.cos((i * Math.PI) / 4)}
          y1={10 + 4.4 * Math.sin((i * Math.PI) / 4)}
          x2={10 + 6.6 * Math.cos((i * Math.PI) / 4)}
          y2={10 + 6.6 * Math.sin((i * Math.PI) / 4)}
          stroke={stroke}
          stroke-width="1.6"
        />
      {/each}
    {:else if kind === 'script'}
      <path d="M 6,3.5 C 3.5,5 3.5,6.5 6,8 C 8.5,9.5 8.5,11 6,12.5 C 3.5,14 3.5,15.5 6,16.5 L 14,16.5 C 16.5,15 16.5,13.5 14,12 C 11.5,10.5 11.5,9 14,7.5 C 16.5,6 16.5,4.5 14,3.5 Z" fill="none" stroke={stroke} stroke-width="1.3" />
      {#each [6.2, 9.2, 12.2] as y}
        <line x1="7" y1={y} x2="13" y2={y} stroke={stroke} stroke-width="1.2" />
      {/each}
    {:else if kind === 'manual'}
      <path d="M 3,9 C 3,7.5 4,6.5 5.5,6.5 L 9,6.5 L 7.5,4.5 C 7,3.7 8,2.8 8.8,3.5 L 12.5,6.5 L 15.5,6.5 C 16.5,6.5 17,7.2 17,8 C 17,8.8 16.5,9.3 15.5,9.3 L 16,9.3 C 17,9.3 17.4,10 17.4,10.7 C 17.4,11.5 16.8,12 16,12 C 16.8,12.2 17.2,12.7 17,13.5 C 16.9,14.2 16.3,14.5 15.5,14.5 C 16,14.8 16.2,15.4 16,16 C 15.8,16.7 15.2,17 14.4,17 L 7,17 C 4.5,17 3,15.5 3,13 Z" fill="none" stroke={stroke} stroke-width="1.2" />
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
