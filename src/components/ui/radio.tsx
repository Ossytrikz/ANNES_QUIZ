import * as React from 'react';
import { cn } from '../../lib/utils';

export interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: boolean;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({
    className,
    id,
    label,
    helperText,
    error = false,
    ...props
  }, ref) => {
    const radioId = id || React.useId();
    
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <div className="relative flex items-center">
            <input
              id={radioId}
              type="radio"
              className={cn(
                'peer h-4 w-4 shrink-0 rounded-full border border-input',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'before:content-[""] before:block before:w-2 before:h-2 before:rounded-full before:bg-primary before:opacity-0 before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2',
                'peer-checked:before:opacity-100',
                error ? 'border-destructive' : 'border-input',
                className
              )}
              ref={ref}
              {...props}
            />
          </div>
          <label
            htmlFor={radioId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
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

Radio.displayName = 'Radio';

export { Radio };
