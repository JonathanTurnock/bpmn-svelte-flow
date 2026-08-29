<script lang="ts">
  import { Play, StepForward, RotateCcw } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
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
    <Button size="sm" onclick={() => studio.runToEnd(opts())} data-testid="run-button">
      <Play /> Run
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

    <div class="grid min-h-0 flex-1 gap-2">
      <Label>Trace</Label>
      <div class="min-h-0 flex-1 overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
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
