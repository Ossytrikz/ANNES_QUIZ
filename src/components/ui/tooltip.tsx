import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

type TooltipProviderProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>;

const TooltipProvider = (props: TooltipProviderProps) => (
  <TooltipPrimitive.Provider delayDuration={200} {...props} />
);

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  /**
   * The preferred side of the trigger to render against when open.
   * Will be reversed when collisions occur and avoidCollisions is enabled.
   * @default 'top'
   */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * The distance in pixels from the trigger.
   * @default 4
   */
  sideOffset?: number;
  /**
   * The preferred alignment against the trigger.
   * May change when collisions occur.
   * @default 'center'
   */
  align?: 'start' | 'center' | 'end';
  /**
   * An offset in pixels from the "start" or "end" alignment options.
   * @default 0
   */
  alignOffset?: number;
  /**
   * The padding between the arrow and the edges of the content.
   * @default 0
   */
  arrowPadding?: number;
  /**
   * The width of the arrow in pixels.
   * @default 10
   */
  arrowWidth?: number;
  /**
   * The height of the arrow in pixels.
   * @default 5
   */
  arrowHeight?: number;
  /**
   * Whether to show an arrow pointing to the trigger.
   * @default true
   */
  showArrow?: boolean;
  /**
   * The background color of the tooltip.
   * @default 'bg-popover'
   */
  background?: string;
  /**
   * The text color of the tooltip.
   * @default 'text-popover-foreground'
   */
  textColor?: string;
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({
  className,
  side = 'top',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  arrowPadding = 0,
  arrowWidth = 10,
  arrowHeight = 5,
  showArrow = true,
  background = 'bg-popover',
  textColor = 'text-popover-foreground',
  children,
  ...props
}, ref) => {
  const arrowStyle = {
    '--tooltip-arrow-width': `${arrowWidth}px`,
    '--tooltip-arrow-height': `${arrowHeight}px`,
  } as React.CSSProperties;

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          'z-50 max-w-xs overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md',
          'animate-in fade-in-0 zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          background,
          textColor,
          className
        )}
        {...props}
      >
        {children}
        {showArrow && (
          <TooltipPrimitive.Arrow
            width={arrowWidth}
            height={arrowHeight}
            className={cn('fill-current', background.split(' ')[0])}
            style={arrowStyle}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
});

TooltipContent.displayName = 'TooltipContent';

// Higher-order component for simple tooltip usage
interface TooltipWrapperProps extends TooltipContentProps {
  /**
   * The content to show in the tooltip
   */
  content: React.ReactNode;
  /**
   * The element that triggers the tooltip
   */
  children: React.ReactElement;
  /**
   * Whether the tooltip is disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * The open state of the tooltip when controlled
   */
  open?: boolean;
  /**
   * Callback when the open state changes
   */
  onOpenChange?: (open: boolean) => void;
}

const TooltipWrapper = ({
  content,
  children,
  disabled = false,
  open,
  onOpenChange,
  ...props
}: TooltipWrapperProps) => {
  if (disabled) return children;

  return (
    <Tooltip open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent {...props}>{content}</TooltipContent>
    </Tooltip>
  );
};

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipWrapper,
  type TooltipContentProps,
  type TooltipWrapperProps,
};
