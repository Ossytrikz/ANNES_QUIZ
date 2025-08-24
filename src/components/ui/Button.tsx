import * as React from "react";
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: "default" | "outline" | "ghost"; asChild?: boolean; }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className = "", variant = "default", asChild, ...props }, ref) => {
  const base = "inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60";
  const styles = variant === "outline" ? "border border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800" : variant === "ghost" ? "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800" : "bg-primary text-white hover:opacity-90";
  return <button ref={ref} className={`${base} ${styles} ${className}`} {...props} />;
});
Button.displayName = "Button";
export default Button;
