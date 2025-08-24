import * as React from "react";
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
export function Label({ className = "", ...props }: LabelProps) { return <label className={`block text-sm font-medium mb-1 ${className}`} {...props} />; }
export default Label;
