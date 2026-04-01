import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: ReactNode | LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ icon: IconOrNode, title, description, action, className }: EmptyStateProps) => {
  const isLucideIcon = typeof IconOrNode === "function";

  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        {isLucideIcon ? (
          <IconOrNode size={36} className="text-primary" />
        ) : (
          <span className="text-primary">{IconOrNode}</span>
        )}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
