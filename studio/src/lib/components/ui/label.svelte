<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  let { class: className, children }: { class?: string; children?: Snippet } = $props();
</script>

<span class={cn('text-xs font-medium leading-none text-muted-foreground', className)}>
  {@render children?.()}
</span>
