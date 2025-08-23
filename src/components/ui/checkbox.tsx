import * as React from 'react';
import { cn } from '../../lib/utils';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    className,
    id,
    label,
    helperText,
    error = false,
    ...props
  }, ref) => {
    const checkboxId = id || React.useId();
    
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <div className="relative flex items-center">
            <input
              id={checkboxId}
              type="checkbox"
              className={cn(
                'peer h-4 w-4 shrink-0 rounded border border-input',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
                error ? 'border-destructive' : 'border-input',
                className
              )}
              ref={ref}
              {...props}
            />
            <svg
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity peer-data-[state=checked]:opacity-100"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          {label && (
            <label
              htmlFor={checkboxId}
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
            'pl-6'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
