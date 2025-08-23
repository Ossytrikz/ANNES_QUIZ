import * as React from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps 
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  htmlFor?: string;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, htmlFor, ...props }, ref) => {
    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={cn(
          'text-sm font-medium leading-none',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';

export { Label };
