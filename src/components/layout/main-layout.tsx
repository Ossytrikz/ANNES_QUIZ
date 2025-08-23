import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { ThemeProvider } from '../theme/theme-provider';
import { TooltipProvider } from '../ui/tooltip';
import { Toaster } from '../ui/toast';
import { ErrorBoundary } from '../error-boundary';

interface MainLayoutProps {
  /**
   * Additional class names to apply to the layout
   */
  className?: string;
  /**
   * Whether to show the header
   * @default true
   */
  showHeader?: boolean;
  /**
   * Whether to show the footer
   * @default true
   */
  showFooter?: boolean;
  /**
   * The header component to render
   */
  header?: React.ReactNode;
  /**
   * The footer component to render
   */
  footer?: React.ReactNode;
  /**
   * The sidebar component to render
   */
  sidebar?: React.ReactNode;
  /**
   * Whether the sidebar is collapsed
   * @default false
   */
  isSidebarCollapsed?: boolean;
  /**
   * Callback when the sidebar toggle is clicked
   */
  onSidebarToggle?: () => void;
  /**
   * Additional class names for the main content area
   */
  contentClassName?: string;
  /**
   * Additional class names for the sidebar
   */
  sidebarClassName?: string;
}

/**
 * Main layout component that provides a consistent layout structure for the application
 */
export function MainLayout({
  className,
  showHeader = true,
  showFooter = true,
  header,
  footer,
  sidebar,
  isSidebarCollapsed = false,
  onSidebarToggle,
  contentClassName,
  sidebarClassName,
}: MainLayoutProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <TooltipProvider>
        <ErrorBoundary>
          <div
            className={cn(
              'flex min-h-screen flex-col bg-background text-foreground',
              className
            )}
          >
            {showHeader && header && (
              <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center">
                  {header}
                </div>
              </header>
            )}

            <div className="flex flex-1 overflow-hidden">
              {sidebar && (
                <aside
                  className={cn(
                    'hidden w-64 border-r bg-muted/40 transition-all duration-300 md:block',
                    isSidebarCollapsed ? 'w-16' : 'w-64',
                    sidebarClassName
                  )}
                >
                  {sidebar}
                </aside>
              )}

              <main
                className={cn(
                  'flex-1 overflow-y-auto overflow-x-hidden',
                  contentClassName
                )}
              >
                <div className="container py-6">
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </div>
              </main>
            </div>

            {showFooter && footer && (
              <footer className="border-t bg-muted/40 py-6">
                <div className="container">{footer}</div>
              </footer>
            )}

            <Toaster />
          </div>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  );
}
