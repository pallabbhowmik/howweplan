'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

function Progress({ value = 0, max = 100, color = 'blue', className, ...props }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-100', className)}
      {...props}
    >
      <div
        className={cn('h-full transition-all duration-500 ease-out', colorClasses[color])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export { Progress };
