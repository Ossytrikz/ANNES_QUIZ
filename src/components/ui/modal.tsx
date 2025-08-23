import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button, ButtonProps } from './button';
import { cn } from '../../lib/utils';

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback when the modal is closed
   */
  onClose: () => void;
  /**
   * The title of the modal
   */
  title?: React.ReactNode;
  /**
   * The description of the modal
   */
  description?: React.ReactNode;
  /**
   * The content of the modal
   */
  children: React.ReactNode;
  /**
   * The text for the primary action button
   */
  actionText?: string;
  /**
   * The variant of the primary action button
   * @default 'default'
   */
  actionVariant?: ButtonProps['variant'];
  /**
   * Whether the primary action is loading
   * @default false
   */
  isLoading?: boolean;
  /**
   * Whether the primary action is disabled
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Callback when the primary action is clicked
   */
  onAction?: () => void;
  /**
   * The text for the secondary action button
   */
  secondaryActionText?: string;
  /**
   * Callback when the secondary action is clicked
   */
  onSecondaryAction?: () => void;
  /**
   * Whether to hide the close button
   * @default false
   */
  hideCloseButton?: boolean;
  /**
   * Custom footer content
   */
  footer?: React.ReactNode;
  /**
   * The size of the modal
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  /**
   * Additional class names for the modal content
   */
  className?: string;
  /**
   * Additional class names for the modal container
   */
  containerClassName?: string;
  /**
   * Whether to close the modal when clicking outside
   * @default true
   */
  closeOnOverlayClick?: boolean;
  /**
   * Whether to show the dialog header
   * @default true
   */
  showHeader?: boolean;
  /**
   * Whether to show the dialog footer
   * @default true
   */
  showFooter?: boolean;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  '6xl': 'sm:max-w-6xl',
  '7xl': 'sm:max-w-7xl',
  full: 'sm:max-w-full',
} as const;

/**
 * A reusable modal component built on top of the Dialog component
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  actionText,
  actionVariant = 'default',
  isLoading = false,
  isDisabled = false,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  hideCloseButton = false,
  footer,
  size = 'md',
  className,
  containerClassName,
  closeOnOverlayClick = true,
  showHeader = true,
  showFooter = true,
}: ModalProps) => {
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(sizeClass, containerClassName)}
        onPointerDownOutside={(e) => {
          if (!closeOnOverlayClick) {
            e.preventDefault();
          }
        }}
      >
        {showHeader && (title || description) && (
          <DialogHeader className={cn(!showFooter && 'pb-0')}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        <div className={cn('py-4', className)}>{children}</div>
        {showFooter && (
          <DialogFooter className="flex flex-row items-center justify-end space-x-2">
            {footer || (
              <>
                {secondaryActionText && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSecondaryAction}
                    disabled={isDisabled || isLoading}
                  >
                    {secondaryActionText}
                  </Button>
                )}
                {actionText && (
                  <Button
                    type="button"
                    variant={actionVariant}
                    onClick={onAction}
                    isLoading={isLoading}
                    disabled={isDisabled || isLoading}
                  >
                    {actionText}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { Modal };
