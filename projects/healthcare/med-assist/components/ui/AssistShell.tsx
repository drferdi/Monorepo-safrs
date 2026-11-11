import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface AssistShellProps {
  children: ReactNode;
  className?: string;
  cardClassName?: string;
  fillCardHeight?: boolean;
}

export function AssistShell({
  children,
  className,
  cardClassName,
  fillCardHeight = true,
}: AssistShellProps): JSX.Element {
  return (
    <div
      className={cn(
        'sidepanel-shell assist-shell assist-shell--powered px-4 pb-4 pt-2 flex flex-col gap-4 overflow-y-auto min-h-[100dvh]',
        className
      )}
    >
      <div className={cn('sentra-card flex flex-col', fillCardHeight && 'h-full', cardClassName)}>
        {children}
      </div>
    </div>
  );
}
