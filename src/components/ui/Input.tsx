import * as React from "react";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = "", ...props }, ref) => (
  <input ref={ref} className={"w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-primary " + className} {...props} />
));
Input.displayName = "Input";
export default Input;
