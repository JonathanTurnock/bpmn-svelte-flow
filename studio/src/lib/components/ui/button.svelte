<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const buttonVariants = tv({
    base: 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90'
      },
      size: {
        default: 'h-8 px-3 py-1.5',
        sm: 'h-7 rounded-md px-2 text-xs',
        icon: 'h-8 w-8'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  });

  export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
  export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  let {
    variant = 'default',
    size = 'default',
    class: className,
    children,
    ...rest
  }: HTMLButtonAttributes & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children?: Snippet;
  } = $props();
</script>

<button type="button" class={cn(buttonVariants({ variant, size }), className)} {...rest}>
  {@render children?.()}
</button>
