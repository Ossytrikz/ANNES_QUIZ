import * as React from "react";
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-primary ${className}`} {...props} />
));
Textarea.displayName = "Textarea";
export default Textarea;
