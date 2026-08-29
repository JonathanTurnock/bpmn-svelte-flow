<script lang="ts">
  // Glyph for a BPMN event definition, drawn inside a 36x36 viewBox that is
  // stretched over the event circle.
  //
  // Rendering rules (BPMN 2.0 §10.4.3 + bpmn.io house style):
  //   * catch events (start / intermediate catch / boundary) use OUTLINE glyphs
  //   * throw events (intermediate throw / end) use FILLED glyphs
  //   * the parallel-multiple plus is NEVER filled, even on a throw event
  //   * terminate is always a solid disc
  //   * timer / conditional only ever occur on catch events, so they stay
  //     unfilled regardless of `filled`
  let {
    definition,
    filled = false,
    parallelMultiple = false
  }: { definition?: string; filled?: boolean; parallelMultiple?: boolean } = $props();

  const stroke = 'var(--bpmn-stroke, #22242a)';
  /** Solid body colour for throw variants. */
  const body = $derived(filled ? stroke : 'none');
  /** Colour that has to stay readable on top of a filled body. */
  const contrast = $derived(filled ? 'var(--bpmn-fill, #ffffff)' : stroke);

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

  /** Clock-face tick marks, 12 evenly spaced, drawn inside the dial. */
  const timerTicks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return {
      x1: 18 + 7.6 * cos,
      y1: 18 + 7.6 * sin,
      x2: 18 + 9.6 * cos,
      y2: 18 + 9.6 * sin
    };
  });
</script>

{#if kind}
  <svg
    class="bpmn-event-icon"
    viewBox="0 0 36 36"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    {#if kind === 'message'}
      <!-- envelope: body + folded flap -->
      <rect
        x="8.6"
        y="11.6"
        width="18.8"
        height="13.4"
        fill={body}
        stroke={stroke}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path
        d="M 8.6,11.6 L 18,18.9 L 27.4,11.6"
        fill="none"
        stroke={contrast}
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    {:else if kind === 'timer'}
      <!-- clock dial, 12 ticks, hour + minute hand -->
      <circle cx="18" cy="18" r="9.6" fill="none" stroke={stroke} stroke-width="1.6" />
      {#each timerTicks as t}
        <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={stroke} stroke-width="1.1" />
      {/each}
      <path
        d="M 18,18 L 18,11.4 M 18,18 L 22.6,20.6"
        fill="none"
        stroke={stroke}
        stroke-width="1.6"
        stroke-linecap="round"
      />
    {:else if kind === 'signal'}
      <!-- equilateral triangle, apex up -->
      <path
        d="M 18,8.4 L 27.5,25 L 8.5,25 Z"
        fill={body}
        stroke={stroke}
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    {:else if kind === 'error'}
      <!-- lightning bolt: down-left tail, up-right head -->
      <path
        d="M 9.8,25.8 L 15.3,10.6 L 20.2,19.4 L 26.2,10.2 L 20.7,25.4 L 15.8,16.6 Z"
        fill={body}
        stroke={stroke}
        stroke-width="1.4"
        stroke-linejoin="round"
      />
    {:else if kind === 'escalation'}
      <!-- upward arrowhead with a notched base -->
      <path
        d="M 18,8 L 25.6,26 L 18,19.6 L 10.4,26 Z"
        fill={body}
        stroke={stroke}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    {:else if kind === 'compensate'}
      <!-- double "rewind" triangles pointing left -->
      <path
        d="M 17.6,10.6 L 17.6,25.4 L 9.4,18 Z M 26.4,10.6 L 26.4,25.4 L 18.2,18 Z"
        fill={body}
        stroke={stroke}
        stroke-width="1.4"
        stroke-linejoin="round"
      />
    {:else if kind === 'conditional'}
      <!-- ruled page (conditional only ever occurs as a catch event) -->
      <rect x="10.8" y="9" width="14.4" height="18" fill="none" stroke={stroke} stroke-width="1.5" />
      {#each [12.9, 16.3, 19.7, 23.1] as y}
        <line x1="12.9" y1={y} x2="23.1" y2={y} stroke={stroke} stroke-width="1.4" />
      {/each}
    {:else if kind === 'link'}
      <!-- rightward block arrow -->
      <path
        d="M 9.4,15 L 18.6,15 L 18.6,10.8 L 26.8,18 L 18.6,25.2 L 18.6,21 L 9.4,21 Z"
        fill={body}
        stroke={stroke}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    {:else if kind === 'terminate'}
      <!-- always a solid disc -->
      <circle cx="18" cy="18" r="8.6" fill={stroke} stroke={stroke} stroke-width="1" />
    {:else if kind === 'cancel'}
      <!-- 45°-rotated cross -->
      <path
        d="M 18,21.68 L 13.33,26.34 L 9.66,22.67 L 14.32,18 L 9.66,13.33 L 13.33,9.66 L 18,14.32
           L 22.67,9.66 L 26.34,13.33 L 21.68,18 L 26.34,22.67 L 22.67,26.34 Z"
        fill={body}
        stroke={stroke}
        stroke-width="1.4"
        stroke-linejoin="round"
      />
    {:else if kind === 'multiple'}
      <!-- regular pentagon, apex up -->
      <path
        d="M 18,8.8 L 26.75,15.16 L 23.41,25.44 L 12.59,25.44 L 9.25,15.16 Z"
        fill={body}
        stroke={stroke}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    {:else if kind === 'parallel-multiple'}
      <!-- plus sign; per spec this glyph is never filled -->
      <path
        d="M 20.7,20.7 L 20.7,27 L 15.3,27 L 15.3,20.7 L 9,20.7 L 9,15.3 L 15.3,15.3 L 15.3,9
           L 20.7,9 L 20.7,15.3 L 27,15.3 L 27,20.7 Z"
        fill="none"
        stroke={stroke}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    {/if}
  </svg>
{/if}

<style>
  .bpmn-event-icon {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
  }
</style>
