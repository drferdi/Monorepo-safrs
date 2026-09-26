import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { SentraBrandSignature } from './SentraBrandSignature';

interface HeaderFrameProps {
  title: string;
  subtitle: string;
  meta?: string;
  align?: 'center' | 'left';
  topLeft?: ReactNode;
  topRight?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function HeaderFrame({
  title,
  subtitle,
  meta,
  align = 'center',
  topLeft,
  topRight,
  children,
  className,
}: HeaderFrameProps): JSX.Element {
  return (
    <div className={cn('card-header', className)}>
      <div className="header-top relative flex justify-center items-start">
        {topLeft ? <div className="absolute left-0 top-0">{topLeft}</div> : null}
        {topRight ? <div className="absolute right-0 top-0">{topRight}</div> : null}
        <SentraBrandSignature title={title} subtitle={subtitle} meta={meta} align={align} />
      </div>
      {children}
    </div>
  );
}
