import { useState, useRef, useEffect, ReactNode } from "react";
import { Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InfoTooltipProps {
  title: string;
  steps: (string | ReactNode)[];
  warning?: string;
}

const InfoTooltip = ({ title, steps, warning }: InfoTooltipProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success hover:bg-success/25 transition-colors"
        aria-label="Ajuda"
      >
        <Info className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute left-7 top-1/2 -translate-y-1/2 z-50 w-72 rounded-xl border border-border bg-popover p-4 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 border-l border-b border-border bg-popover" />
          <p className="mb-2 text-xs font-bold text-foreground">{title}</p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {warning && (
            <p className="mt-2 text-[10px] text-warning">{warning}</p>
          )}
          <button
            onClick={() => { setOpen(false); navigate("/suporte"); }}
            className="mt-3 text-[11px] font-semibold text-success hover:text-success/80 hover:underline transition-colors"
          >
            Ler Mais →
          </button>
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
