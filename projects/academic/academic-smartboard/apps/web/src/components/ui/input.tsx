import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn.ts";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex min-h-(--target-min) w-full rounded-control border border-line-strong bg-canvas px-(--space-3) text-(length:--font-size-body) text-primary outline-none transition-[border-color,box-shadow,background-color] duration-(--motion-duration-fast) ease-(--motion-easing-standard) placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) disabled:pointer-events-none disabled:opacity-50 aria-invalid:[border:var(--border-width-strong)_solid_var(--color-status-critical)] aria-invalid:bg-tint-critical",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
