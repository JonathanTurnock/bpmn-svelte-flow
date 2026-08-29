<script lang="ts">
  // Glyph for a BPMN event definition, drawn inside a 36x36 viewBox.
  // `filled` renders the solid variant used by throw events.
  let {
    definition,
    filled = false,
    parallelMultiple = false
  }: { definition?: string; filled?: boolean; parallelMultiple?: boolean } = $props();

  const stroke = 'var(--bpmn-stroke, #22242a)';
  const fill = $derived(filled ? 'var(--bpmn-stroke, #22242a)' : 'none');
  const contrast = $derived(filled ? 'var(--bpmn-fill, #ffffff)' : 'var(--bpmn-stroke, #22242a)');

  const kind = $derived.by(() => {
    if (parallelMultiple) return 'parallel-multiple';
    switch (definition) {
      case 'bpmn:MessageEventDefinition':
        return 'message';
      case 'bpmn:TimerEventDefinition':
        return 'timer';
      case 'bpmn:SignalEventDefinition':
        return 'signal';
      case 'bpmn:ErrorEventDefinition':
        return 'error';
      case 'bpmn:EscalationEventDefinition':
        return 'escalation';
      case 'bpmn:CompensateEventDefinition':
        return 'compensate';
      case 'bpmn:ConditionalEventDefinition':
        return 'conditional';
      case 'bpmn:LinkEventDefinition':
        return 'link';
      case 'bpmn:TerminateEventDefinition':
        return 'terminate';
      case 'bpmn:CancelEventDefinition':
        return 'cancel';
      case 'multiple':
        return 'multiple';
      default:
        return undefined;
    }
  });
</script>

{#if kind}
  <svg class="bpmn-event-icon" viewBox="0 0 36 36" width="100%" height="100%" aria-hidden="true">
    {#if kind === 'message'}
      <rect x="9" y="12" width="18" height="12.5" rx="1" fill={filled ? stroke : 'none'} stroke={stroke} stroke-width="1.6" />
      <path d="M 9.5,13 L 18,19 L 26.5,13" fill="none" stroke={contrast} stroke-width="1.6" />
    {:else if kind === 'timer'}
      <circle cx="18" cy="18" r="9.5" fill="none" stroke={stroke} stroke-width="1.6" />
      {#each Array.from({ length: 12 }) as _, i}
        <line
          x1={18 + 8 * Math.cos((i * Math.PI) / 6)}
          y1={18 + 8 * Math.sin((i * Math.PI) / 6)}
          x2={18 + 9.5 * Math.cos((i * Math.PI) / 6)}
          y2={18 + 9.5 * Math.sin((i * Math.PI) / 6)}
          stroke={stroke}
          stroke-width="1.2"
        />
      {/each}
      <path d="M 18,12.5 L 18,18 L 22.5,20.5" fill="none" stroke={stroke} stroke-width="1.6" stroke-linecap="round" />
    {:else if kind === 'signal'}
      <path d="M 18,9.8 L 27,25 L 9,25 Z" fill={fill} stroke={stroke} stroke-width="1.6" stroke-linejoin="round" />
    {:else if kind === 'error'}
      <path d="M 10.5,25.5 L 15.2,11 L 20.4,20.6 L 25.5,10.5 L 20.8,25 L 15.6,15.4 Z" fill={fill} stroke={stroke} stroke-width="1.4" stroke-linejoin="round" />
    {:else if kind === 'escalation'}
      <path d="M 18,9.5 L 25.5,25.5 L 18,18.5 L 10.5,25.5 Z" fill={fill} stroke={stroke} stroke-width="1.5" stroke-linejoin="round" />
    {:else if kind === 'compensate'}
      <path d="M 17.5,11 L 17.5,25 L 9.5,18 Z M 26,11 L 26,25 L 18,18 Z" fill={fill} stroke={stroke} stroke-width="1.4" stroke-linejoin="round" />
    {:else if kind === 'conditional'}
      <rect x="10.5" y="9.5" width="15" height="17" fill="none" stroke={stroke} stroke-width="1.5" />
      {#each [13, 16.5, 20, 23.5] as y}
        <line x1="12.5" y1={y} x2="23.5" y2={y} stroke={stroke} stroke-width="1.4" />
      {/each}
    {:else if kind === 'link'}
      <path d="M 10,15 L 19,15 L 19,11 L 27,18 L 19,25 L 19,21 L 10,21 Z" fill={fill} stroke={stroke} stroke-width="1.5" stroke-linejoin="round" />
    {:else if kind === 'terminate'}
      <circle cx="18" cy="18" r="8.5" fill={stroke} stroke={stroke} />
    {:else if kind === 'cancel'}
      <path d="M 11.5,14 L 14,11.5 L 18,15.5 L 22,11.5 L 24.5,14 L 20.5,18 L 24.5,22 L 22,24.5 L 18,20.5 L 14,24.5 L 11.5,22 L 15.5,18 Z" fill={fill} stroke={stroke} stroke-width="1.4" stroke-linejoin="round" />
    {:else if kind === 'multiple'}
      <path d="M 18,9.5 L 26.8,16 L 23.4,26 L 12.6,26 L 9.2,16 Z" fill={fill} stroke={stroke} stroke-width="1.5" stroke-linejoin="round" />
    {:else if kind === 'parallel-multiple'}
      <path d="M 15.5,10 L 20.5,10 L 20.5,15.5 L 26,15.5 L 26,20.5 L 20.5,20.5 L 20.5,26 L 15.5,26 L 15.5,20.5 L 10,20.5 L 10,15.5 L 15.5,15.5 Z" fill="none" stroke={stroke} stroke-width="1.5" stroke-linejoin="round" />
    {/if}
  </svg>
{/if}

<style>
  .bpmn-event-icon {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
</style>
