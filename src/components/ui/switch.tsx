import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: boolean;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({
    className,
    id,
    label,
    helperText,
    error = false,
    checked,
    disabled,
    ...props
  }, ref) => {
    const switchId = id || React.useId();
    
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              id={switchId}
              className="sr-only peer"
              checked={checked}
              disabled={disabled}
              ref={ref}
              {...props}
            />
            <div className={cn(
              'w-11 h-6 bg-gray-200 peer-focus:outline-none',
              'rounded-full peer peer-checked:after:translate-x-full',
              'peer-checked:after:border-white after:content-[""]',
              'after:absolute after:top-[2px] after:left-[2px]',
              'after:bg-white after:border-gray-300 after:border after:rounded-full',
              'after:h-5 after:w-5 after:transition-all',
              'peer-checked:bg-primary',
              error && 'border border-destructive',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}>
            </div>
          </label>
          {label && (
            <label 
              htmlFor={switchId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
        </div>
        {helperText && (
          <p className={cn(
            'text-xs',
            error ? 'text-destructive' : 'text-muted-foreground',
            'pl-12'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
