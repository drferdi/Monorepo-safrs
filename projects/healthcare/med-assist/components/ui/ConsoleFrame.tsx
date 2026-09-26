import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ConsoleFrameProps {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function ConsoleFrame({ children, ariaLabel, className }: ConsoleFrameProps): JSX.Element {
  return (
    <section
      className={cn('console-frame flex-1 min-h-0 overflow-y-auto p-4 relative', className)}
      aria-label={ariaLabel}
    >
      {children}
    </section>
  );
}
