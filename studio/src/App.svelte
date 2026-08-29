<script lang="ts">
  import { studio } from './lib/studio.svelte.js';
  import { registerWebMcp } from './lib/webmcp.js';
  import Toolbar from './lib/components/Toolbar.svelte';
  import Canvas from './lib/components/Canvas.svelte';
  import InspectorPanel from './lib/components/InspectorPanel.svelte';
  import RunPanel from './lib/components/RunPanel.svelte';
  import TestsPanel from './lib/components/TestsPanel.svelte';
  import IssuesPanel from './lib/components/IssuesPanel.svelte';
  import XmlPanel from './lib/components/XmlPanel.svelte';
  import Badge from './lib/components/ui/badge.svelte';
  import { cn } from './lib/utils.js';

  let ready = $state(false);
  let mcp = $state<{ api: string; tools: number } | null>(null);
  let tab = $state<'inspector' | 'run' | 'tests' | 'issues' | 'xml'>('inspector');

  $effect(() => {
    studio.boot().then(() => {
      ready = true;
      mcp = registerWebMcp();
    });
  });

  // A canvas selection pulls the inspector forward.
  $effect(() => {
    if (studio.selectedId) tab = 'inspector';
  });

  const TABS = [
    ['inspector', 'Inspector'],
    ['run', 'Run'],
    ['tests', 'Tests'],
    ['issues', 'Issues'],
    ['xml', 'XML']
  ] as const;

  const issueCount = $derived(studio.issues.filter((i) => i.severity === 'warning').length);
</script>

<div class="flex h-full flex-col">
  <Toolbar />
  <div class="flex min-h-0 flex-1">
    <main class="min-w-0 flex-1 border-r">
      {#if ready}
        <Canvas />
      {:else}
        <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      {/if}
    </main>
    <aside class="flex w-[400px] shrink-0 flex-col">
      <nav class="flex gap-1 border-b bg-card px-2 py-1.5">
        {#each TABS as [id, label] (id)}
          <button
            type="button"
            class={cn(
              'rounded-md px-2.5 py-1 text-sm transition-colors',
              tab === id
                ? 'bg-secondary font-medium text-secondary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            data-testid={`tab-${id}`}
            onclick={() => (tab = id)}
          >
            {label}
            {#if id === 'issues' && issueCount}
              <Badge variant="destructive" class="ml-1 px-1.5 py-0">{issueCount}</Badge>
            {/if}
          </button>
        {/each}
      </nav>
      <div class="min-h-0 flex-1">
        {#if tab === 'inspector'}
          <InspectorPanel />
        {:else if tab === 'run'}
          <RunPanel />
        {:else if tab === 'tests'}
          <TestsPanel />
        {:else if tab === 'issues'}
          <IssuesPanel />
        {:else}
          <XmlPanel />
        {/if}
      </div>
      <footer class="border-t bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
        {#if mcp}
          WebMCP: {mcp.tools} tools via {mcp.api}
        {/if}
      </footer>
    </aside>
  </div>
</div>
