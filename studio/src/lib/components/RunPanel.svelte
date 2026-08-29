<script lang="ts">
  import { Play, StepForward, RotateCcw } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';

  let scenarioName = $state('');

  const scenarios = $derived.by(() => {
    void studio.modelVersion;
    return studio.graph ? studio.scenarios() : [];
  });

  const run = $derived.by(() => {
    void studio.runVersion;
    return studio.runState();
  });

  $effect(() => {
    if (scenarios.length && !scenarios.some((s) => s.name === scenarioName)) {
      scenarioName = scenarios[0].name;
    }
  });

  const opts = () => (scenarioName ? { scenario: scenarioName } : {});
</script>

<div class="flex h-full flex-col gap-3 overflow-y-auto p-3" data-testid="run-panel">
  <div class="grid gap-1">
    <Label>Scenario (bsf:scenario)</Label>
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
    <Button size="sm" onclick={() => studio.runToEnd(opts())} data-testid="run-button">
      <Play /> Run
    </Button>
    <Button size="sm" variant="secondary" onclick={() => (studio.engine ? studio.stepRun() : (studio.startRun(opts()), undefined))}>
      <StepForward /> Step
    </Button>
    <Button size="sm" variant="ghost" onclick={() => studio.resetRun()}>
      <RotateCcw /> Reset
    </Button>
  </div>

  {#if run}
    <Separator />
    <div class="flex items-center gap-2 text-sm">
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
      <div class="grid gap-1">
        <Label>End-event payloads</Label>
        {#each run.results as r, i (i)}
          <div class="rounded-md border bg-card p-2">
            <div class="mb-1 text-xs font-medium">{r.name || r.endId}</div>
            <pre class="max-h-48 overflow-auto font-mono text-[11px] leading-snug">{JSON.stringify(
                r.payload,
                null,
                2
              )}</pre>
          </div>
        {/each}
      </div>
    {/if}

    <div class="grid min-h-0 flex-1 gap-1">
      <Label>Trace</Label>
      <div class="min-h-0 flex-1 overflow-auto rounded-md border bg-card p-2 font-mono text-[11px] leading-relaxed">
        {#each run.trace as entry, i (i)}
          <div>
            <span class="text-muted-foreground">{entry.action}</span>
            <button
              type="button"
              class="cursor-pointer hover:underline"
              onclick={() => (studio.selectedId = entry.id ?? null)}>{entry.name || entry.id}</button
            >
            {#if entry.detail}<span class="text-muted-foreground"> — {entry.detail}</span>{/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
