<script lang="ts">
  import { FlaskConical, Plus } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import type { TestResult } from '@bsf/engine';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import CodeEditor from './CodeEditor.svelte';

  let results = $state.raw<TestResult[] | null>(null);
  let adding = $state(false);
  let newName = $state('');
  let newPayload = $state('{}');
  let newScript = $state('assert(state.finished);');

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

<div class="flex h-full flex-col gap-4 overflow-y-auto p-4" data-testid="tests-panel">
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
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title>New test</Card.Title>
        <Card.Description>Saved into the file as a bsf:test extension.</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-3">
        <div class="grid gap-2">
          <Label for="test-name">Name</Label>
          <Input id="test-name" bind:value={newName} placeholder="what this test asserts" />
        </div>
        <div class="grid gap-2">
          <Label>Payload (JSON)</Label>
          <CodeEditor bind:value={newPayload} language="json" minHeight="50px" label="Test payload" />
        </div>
        <div class="grid gap-2">
          <Label>Assertions</Label>
          <CodeEditor bind:value={newScript} minHeight="80px" label="Test assertions" />
          <p class="text-xs text-muted-foreground">
            Runs after a fresh simulation with state, payloads, payload, and assert.
          </p>
        </div>
        <div class="flex gap-2">
          <Button size="sm" onclick={addTest}>Add test</Button>
          <Button size="sm" variant="ghost" onclick={() => (adding = false)}>Cancel</Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <div class="grid gap-3" data-testid="test-results">
    {#each tests as t (t.name)}
      {@const result = results?.find((r) => r.name === t.name)}
      <Card.Root size="sm">
        <Card.Header>
          <Card.Title>{t.name}</Card.Title>
          <Card.Action>
            {#if result}
              <Badge variant={result.ok ? 'success' : 'destructive'}>{result.ok ? 'pass' : 'fail'}</Badge>
            {:else}
              <Badge variant="outline">not run</Badge>
            {/if}
          </Card.Action>
        </Card.Header>
        <Card.Content>
          {#if result && !result.ok}
            <p class="mb-2 text-xs text-destructive">{result.error}</p>
          {/if}
          <pre class="overflow-x-auto font-mono text-xs text-muted-foreground">{t.body}</pre>
        </Card.Content>
      </Card.Root>
    {:else}
      <p class="text-sm text-muted-foreground">
        No tests in this file yet — add one here or via the add_test tool.
      </p>
    {/each}
  </div>
</div>
