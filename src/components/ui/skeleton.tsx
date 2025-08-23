import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The type of skeleton to render
   * @default 'rectangle'
   */
  variant?: 'rectangle' | 'circle' | 'text';
  /**
   * Whether to show a shimmer animation
   * @default true
   */
  shimmer?: boolean;
  /**
   * Whether to show a pulse animation
   * @default true
   */
  pulse?: boolean;
  /**
   * Custom width for the skeleton
   */
  width?: number | string;
  /**
   * Custom height for the skeleton
   */
  height?: number | string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({
    className,
    variant = 'rectangle',
    shimmer = true,
    pulse = true,
    width,
    height,
    style,
    as: Component = 'div',
    ...props
  }, ref) => {
    const styles = {
      ...style,
      ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
      ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
    };

    return (
      <Component
        ref={ref}
        className={cn(
          'relative overflow-hidden bg-muted',
          variant === 'circle' ? 'rounded-full' : 'rounded-md',
          variant === 'text' && 'h-4',
          pulse && 'animate-pulse',
          className
        )}
        style={styles}
        {...props}
      >
        {shimmer && (
          <div className={cn(
            'absolute inset-0 -translate-x-full bg-gradient-to-r',
            'from-transparent via-white/50 to-transparent',
            'animate-shimmer',
            'before:absolute before:inset-0 before:bg-muted',
            'after:absolute after:inset-0 after:bg-muted',
          )} />
        )}
        {props.children}
      </Component>
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Add keyframes for shimmer animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
  .animate-shimmer {
    animation: shimmer 1.5s infinite;
  }
`;
document.head.appendChild(style);

export { Skeleton };

interface SkeletonListProps {
  count: number;
  className?: string;
  itemClassName?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function SkeletonList({
  count,
  className,
  itemClassName,
  as: Component = 'div',
}: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          as={Component}
          className={cn('w-full h-6 mb-2 last:mb-0', itemClassName)}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function QuizCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <div className="flex flex-wrap gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}
