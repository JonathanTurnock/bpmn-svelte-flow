<script lang="ts">
  import { studio } from './lib/studio.svelte.js';
  import { registerWebMcp } from './lib/webmcp.js';
  import Toolbar from './lib/components/Toolbar.svelte';
  import LeftPanel from './lib/components/panels/LeftPanel.svelte';
  import Canvas from './lib/components/Canvas.svelte';
  import InspectorPanel from './lib/components/panels/InspectorPanel.svelte';
  import RunPanel from './lib/components/panels/RunPanel.svelte';
  import TestsPanel from './lib/components/panels/TestsPanel.svelte';
  import IssuesPanel from './lib/components/panels/IssuesPanel.svelte';
  import XmlPanel from './lib/components/panels/XmlPanel.svelte';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';

  let ready = $state(false);
  let mcp = $state<{ api: string; tools: number } | null>(null);
  let tab = $state('run');
  let leftOpen = $state(true);
  let rightOpen = $state(true);
  let bottomOpen = $state(true);

  $effect(() => {
    studio.boot().then(() => {
      ready = true;
      mcp = registerWebMcp();
    });
  });

  // The console tabs: execution and diagnostics, where width helps.
  const TABS = [
    ['run', 'Run'],
    ['tests', 'Tests'],
    ['issues', 'Issues'],
    ['xml', 'XML']
  ] as const;

  const issueCount = $derived(studio.issues.filter((i) => i.severity === 'warning').length);
</script>

<div class="flex h-full flex-col">
  <Toolbar bind:leftOpen bind:rightOpen bind:bottomOpen />
  <div class="flex min-h-0 flex-1">
    {#if leftOpen}
      <aside class="w-60 shrink-0 border-r">
        <LeftPanel />
      </aside>
    {/if}
    <main class="min-w-0 flex-1">
      {#if ready}
        <Canvas />
      {:else}
        <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      {/if}
    </main>
    {#if rightOpen}
      <aside class="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l">
        <InspectorPanel />
      </aside>
    {/if}
  </div>

  <section class="shrink-0 border-t">
    <Tabs.Root bind:value={tab} class="gap-0">
      <div class="flex items-center border-b px-3 pt-1.5 pb-1">
        <Tabs.List variant="line">
          {#each TABS as [id, label] (id)}
            <Tabs.Trigger
              value={id}
              data-testid={`tab-${id}`}
              onclick={() => (bottomOpen = true)}
            >
              {label}
              {#if id === 'issues' && issueCount}
                <Badge variant="destructive">{issueCount}</Badge>
              {/if}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
        <span class="ml-auto text-xs text-muted-foreground">
          {#if mcp}
            WebMCP · {mcp.tools} tools via <span class="font-mono">{mcp.api}</span>
          {/if}
        </span>
      </div>
      {#if bottomOpen}
        <div class="h-[320px]">
          <Tabs.Content value="run" class="h-full"><RunPanel /></Tabs.Content>
          <Tabs.Content value="tests" class="h-full overflow-y-auto"><TestsPanel /></Tabs.Content>
          <Tabs.Content value="issues" class="h-full overflow-y-auto"><IssuesPanel /></Tabs.Content>
          <Tabs.Content value="xml" class="h-full"><XmlPanel /></Tabs.Content>
        </div>
      {/if}
    </Tabs.Root>
  </section>
</div>
