import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { navigate } from "../router";

/** In-app link: a real <a href> (works without JavaScript, new tabs, copy link) with client routing. */
export function Link({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.defaultPrevented || modified || event.button !== 0 || !href) return;
    event.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handle} {...props} />;
}
