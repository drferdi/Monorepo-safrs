import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn.ts";

// Treatment C — hard ledge (docs/design-system/reference/06-button-lab.html,
// EXC-01 recommendation): a solid offset slab, no blur, that disappears as
// the control travels onto it on press. `--color-action-ledge` sits under a
// filled button, `--color-action-ledge-ghost` under an outlined one.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-(--radius-control) font-(--font-weight-medium) transition-[background-color,color,border-color,translate,box-shadow] duration-(--motion-duration-fast) ease-(--motion-easing-standard) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:[translate:0_0]",
  {
    variants: {
      variant: {
        default:
          "bg-(--color-action-primary) text-(--color-action-primary-text) shadow-[var(--button-ledge)_var(--button-ledge)_0_0_var(--color-action-ledge)] hover:bg-(--color-action-primary-hover) active:shadow-none active:[translate:var(--button-ledge)_var(--button-ledge)]",
        outline:
          "border border-(--color-border-strong) bg-(--color-background-canvas) text-(--color-text-primary) shadow-[var(--button-ledge)_var(--button-ledge)_0_0_var(--color-action-ledge-ghost)] hover:bg-(--color-background-surface) active:shadow-none active:[translate:var(--button-ledge)_var(--button-ledge)]",
        ghost:
          "bg-transparent text-(--color-text-primary) hover:bg-(--color-background-surface)",
      },
      size: {
        default:
          "min-h-(--target-min) px-(--space-4) text-[length:var(--font-size-body)]",
        sm: "min-h-(--target-min) px-(--space-3) text-[length:var(--font-size-body-compact)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
