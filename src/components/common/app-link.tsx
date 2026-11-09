import { useNavigate } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, MouseEvent } from "react";

/**
 * A link inside the app given as a full address ("/scripture/john/3?v=16"). A plain click
 * navigates within the app: no page reload, so the opening does not play again and nothing loads
 * twice. Ctrl/⌘-click, middle click and "open in a new tab" keep working as on any link.
 */
export function AppLink({
  href,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const navigate = useNavigate();
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target
    )
      return;
    event.preventDefault();
    void navigate({ href });
  };
  return <a {...props} href={href} onClick={follow} />;
}
