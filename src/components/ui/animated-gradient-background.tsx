import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGradientBackground({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !ref.current) return;

    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.003;
      const shift = Math.sin(t) * 8;
      if (ref.current) {
        ref.current.style.backgroundPosition = `${50 + shift}% ${50 + shift * 0.5}%`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, #052e16 0%, #064e3b 25%, #030712 60%, #030712 100%)`,
        backgroundSize: "200% 200%",
      }}
    >
      {children}
    </div>
  );
}
