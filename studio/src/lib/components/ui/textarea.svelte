<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  let {
    value = $bindable(''),
    class: className,
    ...rest
  }: HTMLTextareaAttributes & { value?: string } = $props();
</script>

<textarea
  bind:value
  class={cn(
    'flex min-h-[60px] w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
    className
  )}
  {...rest}
></textarea>
