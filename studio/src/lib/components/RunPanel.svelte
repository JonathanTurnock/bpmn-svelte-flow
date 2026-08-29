<script lang="ts">
  import {
    ChevronRight,
    CircleAlert,
    CircleCheck,
    CircleDot,
    CirclePlay,
    Code,
    Cog,
    CornerDownRight,
    Layers,
    Mail,
    Merge,
    Pause,
    Play,
    RotateCcw,
    Split,
    StepBack,
    StepForward
  } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';

  let scenarioName = $state('');
  /** Index of the step whose full state is unfolded. */
  let expanded = $state<number | null>(null);
  let traceEl = $state<HTMLElement | undefined>(undefined);

  const SPEEDS = ['0.5', '1', '1.5', '2'];
  let speedStr = $state('1');

  const scenarios = $derived.by(() => {
    void studio.modelVersion;
    return studio.graph ? studio.scenarios() : [];
  });

  const run = $derived.by(() => {
    void studio.runVersion;
    return studio.runState();
  });

  const lastFrame = $derived(studio.frames.length - 1);
  const atEnd = $derived(studio.frames.length > 0 && studio.frameIndex >= lastFrame);
  /** Mid-timeline: the outcome is not revealed yet. */
  const presenting = $derived(studio.frames.length > 0 && !atEnd);

  // A new run folds whichever step was open, and playback keeps the newest
  // steps in view.
  $effect(() => {
    void studio.runVersion;
    expanded = null;
    if (traceEl && studio.frames.length) traceEl.scrollTo({ top: traceEl.scrollHeight });
  });

  const ICONS: Record<string, typeof CircleDot> = {
    started: CirclePlay,
    ended: CircleCheck,
    completed: CircleCheck,
    passed: CircleCheck,
    merged: CircleCheck,
    routed: Split,
    joined: Merge,
    'script ran': Code,
    'mock ran': Cog,
    'sample merged': Mail,
    'message delivered': Mail,
    entered: CornerDownRight,
    'multi-instance': Layers,
    'boundary caught': CircleAlert
  };

  function iconClass(action: string): string {
    if (action === 'ended') return 'text-emerald-600 dark:text-emerald-400';
    if (action === 'boundary caught' || /error/.test(action))
      return 'text-rose-600 dark:text-rose-400';
    return 'text-muted-foreground';
  }

  interface DiffRow {
    key: string;
    kind: 'added' | 'changed' | 'removed' | 'same';
    before?: string;
    after?: string;
  }
  interface TraceStep {
    index: number;
    id?: string;
    name: string;
    action: string;
    caption: string;
    hasData: boolean;
    rows: DiffRow[];
    added: number;
    changed: number;
    removed: number;
  }

  const str = (v: unknown) => JSON.stringify(v) ?? 'undefined';

  /**
   * The run as readable steps: bare "completed" echoes of the previous entry
   * fold away, and every step carries the full payload state at that point,
   * with each key marked added / changed / removed / same versus the state
   * before the step — the transformation, not just the outcome.
   */
  const steps = $derived.by(() => {
    if (!run) return [] as TraceStep[];
    let previous: Record<string, unknown> = {};
    const out: TraceStep[] = [];
    for (let index = 0; index < run.trace.length; index++) {
      const entry = run.trace[index];
      const last = out[out.length - 1];
      if (
        (entry.action === 'completed' || entry.action === 'passed') &&
        !entry.payload &&
        last &&
        last.id === entry.id
      ) {
        continue;
      }
      let rows: DiffRow[];
      let added = 0;
      let changed = 0;
      let removed = 0;
      if (entry.payload) {
        const current = entry.payload;
        rows = [];
        for (const key of Object.keys(current)) {
          const after = str(current[key]);
          if (!(key in previous)) {
            rows.push({ key, kind: 'added', after });
            added += 1;
          } else {
            const before = str(previous[key]);
            if (before !== after) {
              rows.push({ key, kind: 'changed', before, after });
              changed += 1;
            } else {
              rows.push({ key, kind: 'same', after });
            }
          }
        }
        for (const key of Object.keys(previous)) {
          if (!(key in current)) {
            rows.push({ key, kind: 'removed', before: str(previous[key]) });
            removed += 1;
          }
        }
        previous = current;
      } else {
        rows = Object.keys(previous).map((key) => ({
          key,
          kind: 'same' as const,
          after: str(previous[key])
        }));
      }
      out.push({
        index,
        id: entry.id,
        name: entry.name || entry.id || '—',
        action: entry.action,
        caption: entry.detail ? `${entry.action} — ${entry.detail}` : entry.action,
        hasData: !!entry.payload,
        rows,
        added,
        changed,
        removed
      });
    }
    return out;
  });

  /** Steps grouped by playback beat (flat when there is no timeline). */
  const groups = $derived.by(() => {
    const limit = studio.frames.length
      ? (studio.frames[studio.frameIndex]?.logIndex ?? Infinity)
      : Infinity;
    const visible = steps.filter((s) => s.index < limit);
    if (!studio.frames.length) return [{ beat: null as number | null, steps: visible }];
    const out: Array<{ beat: number | null; steps: TraceStep[] }> = [];
    for (let beat = 0; beat <= studio.frameIndex && beat < studio.frames.length; beat++) {
      const from = beat === 0 ? 0 : studio.frames[beat - 1].logIndex;
      const inBeat = visible.filter((s) => s.index >= from && s.index < studio.frames[beat].logIndex);
      if (inBeat.length) out.push({ beat, steps: inBeat });
    }
    return out;
  });

  $effect(() => {
    if (scenarios.length && !scenarios.some((s) => s.name === scenarioName)) {
      scenarioName = scenarios[0].name;
    }
  });

  const opts = () => (scenarioName ? { scenario: scenarioName } : {});

  function onPlayPause() {
    if (studio.playing) studio.pause();
    else if (!studio.frames.length || scenarioName !== studio.runScenarioName)
      studio.playRun(opts());
    else studio.resume();
  }

  /** Move one beat; builds the timeline (paused at the start) on first use. */
  function stepBy(delta: number) {
    if (!studio.frames.length) {
      studio.buildTimeline(opts());
      studio.gotoFrame(0, false);
      return;
    }
    studio.pause();
    studio.gotoFrame(studio.frameIndex + delta, delta === 1);
  }

  function onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable], .cm-editor')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBy(-1);
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="flex h-full flex-col gap-4 overflow-y-auto p-4" data-testid="run-panel">
  <div class="grid gap-2">
    <Label>Scenario</Label>
    <Select.Root type="single" bind:value={scenarioName}>
      <Select.Trigger class="w-full" data-testid="scenario-select">
        {scenarioName || 'no scenarios in this file'}
      </Select.Trigger>
      <Select.Content>
        {#each scenarios as s (s.name)}
          <Select.Item value={s.name} label={s.name} />
        {/each}
      </Select.Content>
    </Select.Root>
    {#if scenarios.find((s) => s.name === scenarioName)?.description}
      <p class="text-xs text-muted-foreground">
        {scenarios.find((s) => s.name === scenarioName)?.description}
      </p>
    {/if}
  </div>

  <div class="flex flex-wrap items-center gap-1.5">
    <Button size="sm" onclick={onPlayPause} data-testid="run-button">
      {#if studio.playing}
        <Pause /> Pause
      {:else}
        <Play /> {studio.frames.length ? 'Play' : 'Run'}
      {/if}
    </Button>
    <Button
      size="sm"
      variant="secondary"
      onclick={() => stepBy(-1)}
      disabled={!studio.frames.length || studio.frameIndex === 0}
      aria-label="Back one step"
      data-testid="step-back"
    >
      <StepBack />
    </Button>
    <Button
      size="sm"
      variant="secondary"
      onclick={() => stepBy(1)}
      disabled={atEnd}
      aria-label="Forward one step"
      data-testid="step-forward"
    >
      <StepForward />
    </Button>
    <Button size="sm" variant="ghost" onclick={() => studio.resetRun()}>
      <RotateCcw /> Reset
    </Button>
  </div>

  {#if studio.frames.length}
    <div class="flex items-center gap-2">
      <input
        type="range"
        class="h-1.5 flex-1 cursor-pointer accent-primary"
        min="0"
        max={lastFrame}
        step="1"
        value={studio.frameIndex}
        oninput={(e) => {
          studio.pause();
          studio.gotoFrame(Number(e.currentTarget.value));
        }}
        aria-label="Playback position"
        data-testid="run-slider"
      />
      <span class="text-xs tabular-nums text-muted-foreground"
        >{studio.frameIndex}/{lastFrame}</span
      >
      <Select.Root
        type="single"
        bind:value={speedStr}
        onValueChange={(v) => studio.setSpeed(parseFloat(v))}
      >
        <Select.Trigger class="h-8 w-[74px] shrink-0" data-testid="speed-select">
          {speedStr}×
        </Select.Trigger>
        <Select.Content>
          {#each SPEEDS as s (s)}
            <Select.Item value={s} label={`${s}×`} />
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <p class="-mt-2 text-xs text-muted-foreground">←/→ step through the run while presenting.</p>
  {/if}

  {#if run}
    <Separator />
    <div class="flex items-center gap-2">
      {#if presenting}
        <Badge variant="secondary">{studio.playing ? 'playing' : 'paused'}</Badge>
      {:else if run.finished}
        <Badge variant={run.errors.length ? 'destructive' : 'success'}>
          {run.errors.length ? 'failed' : 'completed'}
        </Badge>
      {:else}
        <Badge variant="secondary">running</Badge>
      {/if}
      <span class="text-xs text-muted-foreground">{run.steps} steps · {run.scenario}</span>
    </div>

    {#if !presenting}
      {#each run.errors as err (err)}
        <p class="text-xs text-destructive">{err}</p>
      {/each}
    {/if}

    {#if run.results.length && !presenting}
      <div class="grid gap-3">
        {#each run.results as r, i (i)}
          <Card.Root size="sm">
            <Card.Header>
              <Card.Title>{r.name || r.endId}</Card.Title>
              <Card.Description>end-event payload</Card.Description>
            </Card.Header>
            <Card.Content>
              <pre class="max-h-48 overflow-auto font-mono text-xs leading-snug">{JSON.stringify(
                  r.payload,
                  null,
                  2
                )}</pre>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    {/if}

    <div class="grid min-h-0 flex-1 gap-2">
      <Label>Steps</Label>
      <div
        bind:this={traceEl}
        class="min-h-24 flex-1 overflow-y-auto rounded-lg border bg-muted/30"
        data-testid="trace"
      >
        {#each groups as group (group.beat ?? -1)}
          {#if group.beat !== null}
            <button
              type="button"
              class="flex w-full items-center gap-2 px-2.5 pt-2 pb-1 text-left"
              onclick={() => {
                studio.pause();
                studio.gotoFrame(group.beat!);
              }}
              title="Jump the playback to this beat"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase {group.beat ===
                studio.frameIndex
                  ? 'text-primary'
                  : 'text-muted-foreground/70'}">beat {group.beat}</span
              >
              <span class="h-px flex-1 bg-border"></span>
            </button>
          {/if}
          {#each group.steps as s (s.index)}
            {@const Icon = ICONS[s.action] ?? CircleDot}
            <div class={group.beat === studio.frameIndex ? 'bg-accent/40' : ''}>
              <button
                type="button"
                class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-accent/60"
                onclick={() => {
                  studio.selectedId = s.id ?? null;
                  expanded = expanded === s.index ? null : s.index;
                }}
              >
                <Icon class="size-3.5 shrink-0 {iconClass(s.action)}" />
                <span class="min-w-0 flex-1">
                  <span
                    class="block truncate text-[13px] leading-tight"
                    class:font-semibold={studio.selectedId != null && studio.selectedId === s.id}
                    >{s.name}</span
                  >
                  <span class="block truncate text-[11px] leading-tight text-muted-foreground"
                    >{s.caption}</span
                  >
                </span>
                {#if s.added}<span
                    class="shrink-0 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                    >+{s.added}</span
                  >{/if}
                {#if s.changed}<span
                    class="shrink-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                    >~{s.changed}</span
                  >{/if}
                {#if s.removed}<span
                    class="shrink-0 text-[10px] font-semibold text-rose-600 dark:text-rose-400"
                    >−{s.removed}</span
                  >{/if}
                <ChevronRight
                  class="size-3 shrink-0 text-muted-foreground transition-transform {expanded ===
                  s.index
                    ? 'rotate-90'
                    : ''}"
                />
              </button>
              {#if expanded === s.index}
                <div
                  class="mx-2.5 mb-2 rounded-md border bg-background px-2.5 py-1.5 font-mono text-[11px] leading-relaxed"
                  data-testid="step-state"
                >
                  {#if !s.rows.length}
                    <span class="text-muted-foreground">empty payload</span>
                  {/if}
                  {#each s.rows as r (r.key)}
                    <div class="flex gap-1.5">
                      <span
                        class="shrink-0 {r.kind === 'added'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : r.kind === 'changed'
                            ? 'text-amber-700 dark:text-amber-400'
                            : r.kind === 'removed'
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-foreground/70'}">{r.key}</span
                      >
                      {#if r.kind === 'changed'}
                        <span class="truncate text-muted-foreground line-through" title={r.before}
                          >{r.before}</span
                        >
                        <span class="shrink-0 text-muted-foreground">→</span>
                        <span class="truncate text-amber-700 dark:text-amber-400" title={r.after}
                          >{r.after}</span
                        >
                      {:else if r.kind === 'added'}
                        <span class="truncate text-emerald-700 dark:text-emerald-400" title={r.after}
                          >{r.after}</span
                        >
                      {:else if r.kind === 'removed'}
                        <span class="truncate text-rose-700 dark:text-rose-400 line-through" title={r.before}
                          >{r.before}</span
                        >
                      {:else}
                        <span class="truncate text-muted-foreground" title={r.after}>{r.after}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {/each}
      </div>
      <p class="text-xs text-muted-foreground">
        Click a step for the full state at that point — additions, changes and removals are
        colored{studio.frames.length ? '; click a beat label to jump the playback there' : ''}.
      </p>
    </div>
  {/if}
</div>
