import * as React from 'react';
import { cn } from '../../lib/utils';

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  onError?: () => void;
}

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The source URL of the avatar image
   */
  src?: string | null;
  /**
   * The alt text for the avatar image
   */
  alt?: string;
  /**
   * The fallback text or element to display when the image fails to load
   */
  fallback?: React.ReactNode;
  /**
   * The size of the avatar
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /**
   * Additional CSS classes for the image element
   */
  imgClassName?: string;
  /**
   * Whether the avatar is clickable
   * @default false
   */
  clickable?: boolean;
  /**
   * Whether to show a status indicator
   * @default false
   */
  status?: 'online' | 'offline' | 'busy' | 'away' | null;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-xl',
} as const;

const statusClasses = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
} as const;

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('flex h-full w-full items-center justify-center', className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onError, ...props }, ref) => {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn('h-full w-full object-cover', className)}
        onError={onError}
        {...props}
      />
    );
  }
);

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({
    src,
    alt = '',
    fallback,
    size = 'md',
    className,
    imgClassName,
    clickable = false,
    status = null,
    ...props
  }, ref) => {
    const [imgError, setImgError] = React.useState(false);
    const showFallback = !src || imgError;
    const sizeClass = sizeClasses[size];

    const handleError = () => {
      setImgError(true);
    };

    const renderFallback = () => {
      if (typeof fallback === 'string') {
        return (
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {fallback.slice(0, 2).toUpperCase()}
          </span>
        );
      }
      return fallback || <UserIcon className="h-1/2 w-1/2 text-gray-400" />;
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700',
          sizeClass,
          clickable && 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2',
          className
        )}
        {...props}
      >
        {showFallback ? (
          <AvatarFallback>
            {renderFallback()}
          </AvatarFallback>
        ) : (
          <AvatarImage
            src={src}
            alt={alt}
            className={imgClassName}
            onError={handleError}
          />
        )}
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900',
              statusClasses[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Simple user icon component for the fallback
const UserIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

export { Avatar, AvatarFallback, AvatarImage };
