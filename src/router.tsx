import { useEffect, useState, type AnchorHTMLAttributes } from "react";

/**
 * Tiny hash router. GitHub Pages only serves static files, so routes live
 * after the "#" (e.g. .../Free-AI-Resume-Tool/#/library) and a refresh never 404s.
 */
function current(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h : "/";
}

export function useRoute(): string {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(to: string) {
  window.location.hash = to;
}

export function Link({ to, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={`#${to}`} {...rest} />;
}
