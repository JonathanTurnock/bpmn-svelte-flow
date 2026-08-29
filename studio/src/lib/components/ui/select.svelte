<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  let {
    value = $bindable(''),
    class: className,
    children,
    ...rest
  }: HTMLSelectAttributes & { value?: string; children?: Snippet } = $props();
</script>

<select
  bind:value
  class={cn(
    'flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
    className
  )}
  {...rest}
>
  {@render children?.()}
</select>
