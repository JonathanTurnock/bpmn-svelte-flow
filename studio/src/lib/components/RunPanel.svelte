<script lang="ts">
  import { Play, FastForward, StepForward, RotateCcw } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';

  let scenarioName = $state('');
  let inspected = $state<number | null>(null);

  const scenarios = $derived.by(() => {
    void studio.modelVersion;
    return studio.graph ? studio.scenarios() : [];
  });

  const run = $derived.by(() => {
    void studio.runVersion;
    return studio.runState();
  });

  // A new run invalidates whichever data point was open.
  $effect(() => {
    void studio.runVersion;
    inspected = null;
  });

  /** Trace annotated with per-step data-point diffs (vs the previous snapshot). */
  const trace = $derived.by(() => {
    if (!run) return [];
    let previous: Record<string, unknown> = {};
    return run.trace.map((entry, index) => {
      let changes: Array<{ kind: '+' | '~' | '-'; key: string }> = [];
      if (entry.payload) {
        const current = entry.payload;
        for (const key of Object.keys(current)) {
          if (!(key in previous)) changes.push({ kind: '+', key });
          else if (JSON.stringify(previous[key]) !== JSON.stringify(current[key]))
            changes.push({ kind: '~', key });
        }
        for (const key of Object.keys(previous)) {
          if (!(key in current)) changes.push({ kind: '-', key });
        }
        previous = current;
      }
      return { ...entry, index, changes };
    });
  });

  const inspectedEntry = $derived(
    inspected !== null ? trace.find((e) => e.index === inspected && e.payload) : undefined
  );

  $effect(() => {
    if (scenarios.length && !scenarios.some((s) => s.name === scenarioName)) {
      scenarioName = scenarios[0].name;
    }
  });

  const opts = () => (scenarioName ? { scenario: scenarioName } : {});
</script>

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

  <div class="flex gap-2">
    <Button
      size="sm"
      onclick={() => (studio.playing ? studio.finishRun() : studio.playRun(opts()))}
      data-testid="run-button"
    >
      {#if studio.playing}
        <FastForward /> Skip
      {:else}
        <Play /> Run
      {/if}
    </Button>
    <Button
      size="sm"
      variant="secondary"
      onclick={() => (studio.engine ? studio.stepRun() : (studio.startRun(opts()), undefined))}
    >
      <StepForward /> Step
    </Button>
    <Button size="sm" variant="ghost" onclick={() => studio.resetRun()}>
      <RotateCcw /> Reset
    </Button>
  </div>

  {#if run}
    <Separator />
    <div class="flex items-center gap-2">
      {#if run.finished}
        <Badge variant={run.errors.length ? 'destructive' : 'success'}>
          {run.errors.length ? 'failed' : 'completed'}
        </Badge>
      {:else}
        <Badge variant="secondary">running</Badge>
      {/if}
      <span class="text-xs text-muted-foreground">{run.steps} steps · {run.scenario}</span>
    </div>

    {#each run.errors as err (err)}
      <p class="text-xs text-destructive">{err}</p>
    {/each}

    {#if run.results.length}
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

    {#if inspectedEntry}
      <Card.Root size="sm">
        <Card.Header>
          <Card.Title>Data point</Card.Title>
          <Card.Description>
            payload after “{inspectedEntry.name || inspectedEntry.id}” ({inspectedEntry.action})
          </Card.Description>
          <Card.Action>
            <Button size="sm" variant="ghost" onclick={() => (inspected = null)}>Close</Button>
          </Card.Action>
        </Card.Header>
        <Card.Content>
          <pre class="max-h-56 overflow-auto font-mono text-xs leading-snug">{JSON.stringify(
              inspectedEntry.payload,
              null,
              2
            )}</pre>
        </Card.Content>
      </Card.Root>
    {/if}

    <div class="grid min-h-0 flex-1 gap-2">
      <Label>Trace</Label>
      <div class="min-h-0 flex-1 overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
        {#each trace as entry (entry.index)}
          <div class="flex flex-wrap items-baseline gap-x-1.5">
            <span class="text-muted-foreground">{entry.action}</span>
            <button
              type="button"
              class="cursor-pointer hover:underline"
              class:font-semibold={inspected === entry.index}
              onclick={() => {
                studio.selectedId = entry.id ?? null;
                if (entry.payload) inspected = inspected === entry.index ? null : entry.index;
              }}>{entry.name || entry.id}</button
            >
            {#if entry.detail}<span class="text-muted-foreground">— {entry.detail}</span>{/if}
            {#each entry.changes as change (change.kind + change.key)}
              <span
                class="rounded px-1 text-[10px] font-medium"
                class:bg-success={change.kind === '+'}
                class:text-white={change.kind === '+'}
                class:bg-secondary={change.kind === '~'}
                class:text-secondary-foreground={change.kind === '~'}
                class:bg-destructive={change.kind === '-'}
                class:text-destructive-foreground={change.kind === '-'}
                >{change.kind}{change.key}</span
              >
            {/each}
          </div>
        {/each}
      </div>
      <p class="text-xs text-muted-foreground">
        Chips mark payload changes at that step — click a step to see its full data point.
      </p>
    </div>
  {/if}
</div>
