import { cn } from "@/lib/utils";

interface NinjaBadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "default";
  className?: string;
}

const variantStyles = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  danger: "bg-destructive/15 text-destructive border-destructive/20",
  info: "bg-primary/15 text-primary border-primary/20",
  default: "bg-muted text-muted-foreground border-border",
};

const NinjaBadge = ({ children, variant = "default", className }: NinjaBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default NinjaBadge;
