import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

export function InfiniteSlider({ children, speed = 30, className = "" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const el = scrollRef.current;
    if (!el) return;

    let frame: number;
    let pos = 0;
    const contentWidth = el.scrollWidth / 2;

    const animate = () => {
      pos += 0.5;
      if (pos >= contentWidth) pos = 0;
      el.style.transform = `translateX(-${pos}px)`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [speed]);

  return (
    <div className={`overflow-hidden ${className}`}>
      <div ref={scrollRef} className="flex items-center gap-12 whitespace-nowrap" style={{ width: "fit-content" }}>
        {children}
        {children}
      </div>
    </div>
  );
}
