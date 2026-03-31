import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
  className?: string;
}

const StatCard = ({ label, value, icon, iconBg = "bg-primary/10", className }: StatCardProps) => {
  return (
    <div className={cn("ninja-card flex items-start justify-between", className)}>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </div>
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconBg)}>
        {icon}
      </div>
    </div>
  );
};

export default StatCard;
