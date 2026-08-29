<script lang="ts">
  import { studio } from '../studio.svelte.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
</script>

<div class="flex h-full flex-col gap-2 overflow-y-auto p-3" data-testid="issues-panel">
  {#if !studio.issues.length}
    <p class="text-sm text-muted-foreground">No findings — the model is clean.</p>
  {:else}
    {#each studio.issues as issue, i (i)}
      <button
        type="button"
        class="flex items-start gap-2 rounded-md border bg-card p-2 text-left hover:bg-accent"
        onclick={() => (studio.selectedId = issue.elementId)}
      >
        <Badge variant={issue.severity === 'warning' ? 'destructive' : 'secondary'}>
          {issue.severity}
        </Badge>
        <span class="text-xs">
          <span class="font-mono">{issue.elementId}</span> — {issue.message}
        </span>
      </button>
    {/each}
  {/if}
</div>
