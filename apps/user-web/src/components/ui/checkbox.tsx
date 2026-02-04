'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            'w-5 h-5 rounded border-2 transition-all duration-200',
            'border-slate-300 bg-white',
            'peer-checked:bg-indigo-600 peer-checked:border-indigo-600',
            'peer-hover:border-indigo-400',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2',
            'flex items-center justify-center',
            className
          )}
        >
          {checked && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
        </div>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
