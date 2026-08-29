<script lang="ts">
  import { CircleCheck } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
</script>

<div class="flex h-full flex-col gap-3 overflow-y-auto p-4" data-testid="issues-panel">
  {#if !studio.issues.length}
    <div class="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <CircleCheck class="size-8 text-success/60" />
      <p class="text-sm font-medium">No findings</p>
      <p class="text-sm text-muted-foreground">The model validates clean.</p>
    </div>
  {:else}
    {#each studio.issues as issue, i (i)}
      <button
        type="button"
        class="flex items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
        onclick={() => (studio.selectedId = issue.elementId)}
      >
        <Badge variant={issue.severity === 'warning' ? 'destructive' : 'secondary'}>
          {issue.severity}
        </Badge>
        <span class="text-sm">
          <span class="font-mono text-xs text-muted-foreground">{issue.elementId}</span><br />
          {issue.message}
        </span>
      </button>
    {/each}
  {/if}
</div>
