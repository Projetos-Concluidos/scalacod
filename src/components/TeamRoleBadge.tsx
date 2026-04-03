import { Crown, Shield, Wrench, Eye } from "lucide-react";
import NinjaBadge from "@/components/NinjaBadge";

const roleConfig = {
  owner: { label: "DONO", variant: "warning" as const, Icon: Crown },
  admin: { label: "ADMIN", variant: "info" as const, Icon: Shield },
  operator: { label: "OPERADOR", variant: "success" as const, Icon: Wrench },
  viewer: { label: "VIEWER", variant: "default" as const, Icon: Eye },
};

interface TeamRoleBadgeProps {
  role: string;
  className?: string;
}

const TeamRoleBadge = ({ role, className }: TeamRoleBadgeProps) => {
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.viewer;
  const { Icon } = config;

  return (
    <NinjaBadge variant={config.variant} className={className}>
      <Icon className="h-3 w-3" />
      {config.label}
    </NinjaBadge>
  );
};

export default TeamRoleBadge;
