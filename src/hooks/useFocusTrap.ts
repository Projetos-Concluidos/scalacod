import { useRef, useEffect } from "react";

/**
 * Traps keyboard focus inside a container when active.
 * Usage: const ref = useFocusTrap(isOpen);
 *        <div ref={ref}>…modal content…</div>
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const getFocusable = () =>
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]'
      );

    // Focus first element on open
    requestAnimationFrame(() => {
      const els = getFocusable();
      if (els.length > 0) els[0].focus();
    });

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [isActive]);

  return containerRef;
}
