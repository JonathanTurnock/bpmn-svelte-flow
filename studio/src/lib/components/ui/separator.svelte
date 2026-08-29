<script lang="ts">
  import { cn } from '../../utils.js';

  let { class: className }: { class?: string } = $props();
</script>

<div role="separator" class={cn('h-px w-full shrink-0 bg-border', className)}></div>
