<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  let {
    value = $bindable(''),
    class: className,
    ...rest
  }: HTMLInputAttributes & { value?: string } = $props();
</script>

<input
  bind:value
  class={cn(
    'flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
    className
  )}
  {...rest}
/>
