import * as React from 'react';
import { cn } from '../../lib/utils';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'info' | 'warning';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
  closable?: boolean;
  onClose?: () => void;
}

const variantIcons = {
  default: Info,
  destructive: XCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
} as const;

const variantClasses = {
  default: 'bg-background text-foreground border',
  destructive: 'bg-destructive/15 text-destructive border-destructive/50',
  success: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900',
  info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900',
} as const;

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({
    className,
    variant = 'default',
    title,
    description,
    icon,
    showIcon = true,
    closable = false,
    onClose,
    children,
    ...props
  }, ref) => {
    const Icon = variantIcons[variant];
    
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-start">
          {showIcon && (
            <div className="mr-3 flex-shrink-0">
              {icon || <Icon className="h-5 w-5" />}
            </div>
          )}
          <div className="flex-1">
            {title && (
              <h3 className="mb-1 text-sm font-medium leading-5">
                {title}
              </h3>
            )}
            {description && (
              <div className="text-sm">
                {description}
              </div>
            )}
            {children}
          </div>
          {closable && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto -mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex h-8 w-8 items-center justify-center text-current/50 hover:text-current focus:outline-none focus:ring-2 focus:ring-current/20"
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };
