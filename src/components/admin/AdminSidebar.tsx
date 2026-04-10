import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Coins,
  Settings2,
  ScrollText,
  ArrowLeft,
  Shield,
  Home,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/admin/assinantes", icon: Users, label: "Assinantes" },
  { to: "/admin/planos", icon: CreditCard, label: "Planos" },
  { to: "/admin/cobrancas", icon: Receipt, label: "Cobranças" },
  { to: "/admin/tokens", icon: Coins, label: "Tokens" },
  { to: "/admin/integracoes", icon: Settings2, label: "Integrações" },
  { to: "/admin/home", icon: Home, label: "Página Inicial" },
  { to: "/admin/pixel", icon: BarChart3, label: "Pixel & Tracking" },
  { to: "/admin/tickets", icon: MessageSquare, label: "Tickets" },
  { to: "/admin/logs", icon: ScrollText, label: "Logs" },
];

const AdminSidebar = () => {
  const navigate = useNavigate();

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[220px] flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <Shield className="h-5 w-5 text-primary" />
        <span className="text-base font-bold tracking-tight text-white">
          Admin Panel
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Painel
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
