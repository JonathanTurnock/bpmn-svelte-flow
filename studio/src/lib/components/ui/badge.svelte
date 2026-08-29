<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const badgeVariants = tv({
    base: 'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        success: 'border-transparent bg-success text-primary-foreground'
      }
    },
    defaultVariants: { variant: 'default' }
  });

  export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  let {
    variant = 'default',
    class: className,
    children
  }: { variant?: BadgeVariant; class?: string; children?: Snippet } = $props();
</script>

<span class={cn(badgeVariants({ variant }), className)}>{@render children?.()}</span>
