import * as React from "react";
import { Link } from "react-router-dom";
export function LogoWithLink() {
  return (<Link to="/" className="inline-flex items-center gap-2 font-semibold">
    <span className="inline-block h-6 w-6 rounded bg-primary" />
    <span>Anne&apos;s Quiz</span>
  </Link>);
}
export default LogoWithLink;
