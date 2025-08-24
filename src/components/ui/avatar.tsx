import * as React from "react";
export function Avatar({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <div className={`inline-flex h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ${className}`}>{children}</div>;
}
export function AvatarImage({ src, alt = "" }: { src?: string; alt?: string }) { return src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : null; }
export function AvatarFallback({ children }: { children?: React.ReactNode }) { return <div className="h-full w-full flex items-center justify-center text-xs font-bold">{children}</div>; }
export default Avatar;
