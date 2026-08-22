import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn.ts";

// Treatment C — hard ledge (docs/design-system/reference/06-button-lab.html,
// EXC-01 recommendation): a solid offset slab, no blur, that disappears as
// the control travels onto it on press. `--color-action-ledge` sits under a
// filled button, `--color-action-ledge-ghost` under an outlined one.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-[background-color,color,border-color,translate,box-shadow] duration-(--motion-duration-fast) ease-(--motion-easing-standard) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:[translate:0_0]",
  {
    variants: {
      variant: {
        default:
          "bg-action text-action-text shadow-[var(--button-ledge)_var(--button-ledge)_0_0_var(--color-action-ledge)] hover:bg-action-hover active:shadow-none active:[translate:var(--button-ledge)_var(--button-ledge)]",
        outline:
          "border border-line-strong bg-canvas text-primary shadow-[var(--button-ledge)_var(--button-ledge)_0_0_var(--color-action-ledge-ghost)] hover:bg-surface active:shadow-none active:[translate:var(--button-ledge)_var(--button-ledge)]",
        ghost: "bg-transparent text-primary hover:bg-surface",
      },
      size: {
        default:
          "min-h-(--target-min) px-(--space-4) text-(length:--font-size-body)",
        sm: "min-h-(--target-min) px-(--space-3) text-(length:--font-size-body-compact)",
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
