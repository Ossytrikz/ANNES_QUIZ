import * as React from "react";
export function DropdownMenu({ children }: { children: React.ReactNode }) { return <div className="relative inline-block">{children}</div>; }
export function DropdownMenuTrigger({ children, ...props }: React.HTMLAttributes<HTMLElement>) { return <span {...props}>{children}</span>; }
export function DropdownMenuContent({ children }: { children: React.ReactNode }) { return <div className="absolute right-0 mt-2 min-w-40 rounded border bg-white dark:bg-gray-900 shadow z-50">{children}</div>; }
export function DropdownMenuItem({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" {...props}>{children}</div>; }
export function DropdownMenuSeparator() { return <div className="h-px my-1 bg-gray-200 dark:bg-gray-800" />; }
