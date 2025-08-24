import * as React from "react";
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}
export function Badge({ className = "", ...props }: BadgeProps) {
  return (<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 ${className}`} {...props} />);
}
export default Badge;
