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
  import { Badge } from '$lib/components/ui/badge/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';

  let ready = $state(false);
  let mcp = $state<{ api: string; tools: number } | null>(null);
  let tab = $state('inspector');

  $effect(() => {
    studio.boot().then(() => {
      ready = true;
      mcp = registerWebMcp();
    });
  });

  // A canvas click pulls the inspector forward; panel-driven selection
  // (trace steps, issues) highlights on the canvas without switching tabs.
  $effect(() => {
    void studio.inspectRequest;
    if (studio.inspectRequest && studio.selectedId) tab = 'inspector';
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
      <Tabs.Root bind:value={tab} class="flex min-h-0 flex-1 flex-col gap-0">
        <div class="border-b px-3 pt-2 pb-1.5">
          <Tabs.List variant="line" class="w-full">
            {#each TABS as [id, label] (id)}
              <Tabs.Trigger value={id} data-testid={`tab-${id}`}>
                {label}
                {#if id === 'issues' && issueCount}
                  <Badge variant="destructive">{issueCount}</Badge>
                {/if}
              </Tabs.Trigger>
            {/each}
          </Tabs.List>
        </div>
        <Tabs.Content value="inspector" class="min-h-0 flex-1"><InspectorPanel /></Tabs.Content>
        <Tabs.Content value="run" class="min-h-0 flex-1"><RunPanel /></Tabs.Content>
        <Tabs.Content value="tests" class="min-h-0 flex-1"><TestsPanel /></Tabs.Content>
        <Tabs.Content value="issues" class="min-h-0 flex-1"><IssuesPanel /></Tabs.Content>
        <Tabs.Content value="xml" class="min-h-0 flex-1"><XmlPanel /></Tabs.Content>
      </Tabs.Root>
      <footer class="border-t px-4 py-2 text-xs text-muted-foreground">
        {#if mcp}
          WebMCP · {mcp.tools} tools via <span class="font-mono">{mcp.api}</span>
        {/if}
      </footer>
    </aside>
  </div>
</div>
