import * as React from "react";
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}
export function Select({ className = "", children, ...props }: SelectProps) {
  return (<select className={`w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary ${className}`} {...props}>{children}</select>);
}
export default Select;
