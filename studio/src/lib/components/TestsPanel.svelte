<script lang="ts">
  import { FlaskConical, Plus } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import type { TestResult } from '@bsf/engine';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import CodeEditor from './CodeEditor.svelte';

  let results = $state.raw<TestResult[] | null>(null);
  let adding = $state(false);
  let newName = $state('');
  let newPayload = $state('{}');
  let newScript = $state("assert(state.finished);");

  const tests = $derived.by(() => {
    void studio.modelVersion;
    return studio.graph ? studio.tests() : [];
  });

  $effect(() => {
    void studio.modelVersion;
    results = null; // stale after any model change
  });

  function runAll() {
    results = studio.runAllTests();
  }

  async function addTest() {
    await studio.mutate(() =>
      studio.addTest({ name: newName || `test ${tests.length + 1}`, payload: newPayload, script: newScript })
    );
    adding = false;
    newName = '';
    newPayload = '{}';
    newScript = 'assert(state.finished);';
  }
</script>

<div class="flex h-full flex-col gap-3 overflow-y-auto p-3" data-testid="tests-panel">
  <div class="flex items-center gap-2">
    <Button size="sm" onclick={runAll} data-testid="run-tests-button">
      <FlaskConical /> Run tests
    </Button>
    <Button size="sm" variant="outline" onclick={() => (adding = !adding)}>
      <Plus /> New test
    </Button>
    {#if results}
      <Badge variant={results.every((r) => r.ok) ? 'success' : 'destructive'}>
        {results.filter((r) => r.ok).length}/{results.length} passed
      </Badge>
    {/if}
  </div>

  {#if adding}
    <div class="grid gap-2 rounded-md border bg-card p-2">
      <Label>Name</Label>
      <Input bind:value={newName} placeholder="what this test asserts" />
      <Label>Payload (JSON)</Label>
      <CodeEditor bind:value={newPayload} language="json" minHeight="50px" />
      <Label>Assertions — state, payloads, payload, assert</Label>
      <CodeEditor bind:value={newScript} minHeight="80px" />
      <div class="flex gap-2">
        <Button size="sm" onclick={addTest}>Add bsf:test</Button>
        <Button size="sm" variant="ghost" onclick={() => (adding = false)}>Cancel</Button>
      </div>
    </div>
    <Separator />
  {/if}

  <div class="grid gap-2" data-testid="test-results">
    {#each tests as t (t.name)}
      {@const result = results?.find((r) => r.name === t.name)}
      <div class="rounded-md border bg-card p-2">
        <div class="flex items-center gap-2">
          {#if result}
            <Badge variant={result.ok ? 'success' : 'destructive'}>{result.ok ? 'pass' : 'fail'}</Badge>
          {:else}
            <Badge variant="outline">not run</Badge>
          {/if}
          <span class="text-sm">{t.name}</span>
        </div>
        {#if result && !result.ok}
          <p class="mt-1 text-xs text-destructive">{result.error}</p>
        {/if}
        <pre class="mt-1 overflow-x-auto font-mono text-[11px] text-muted-foreground">{t.body}</pre>
      </div>
    {:else}
      <p class="text-sm text-muted-foreground">
        No bsf:test blocks in this file yet — add one here or via the add_test tool.
      </p>
    {/each}
  </div>
</div>
