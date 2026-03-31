import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Users, MessageCircle,
  GitBranch, Mic, Send, Cloud, Settings, LogOut, Moon, Bell, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Checkouts", icon: ShoppingCart, path: "/checkouts" },
  { label: "Pedidos", icon: Package, path: "/pedidos" },
  { label: "Leads", icon: Users, path: "/leads" },
  { label: "Conversas", icon: MessageCircle, path: "/conversas" },
  { label: "Fluxos", icon: GitBranch, path: "/fluxos" },
  { label: "Vozes", icon: Mic, path: "/vozes" },
  { label: "Disparos", icon: Send, path: "/disparos" },
  { label: "WhatsApp Cloud", icon: Cloud, path: "/whatsapp-cloud" },
];

const ShurikenLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="shuriken-grad" x1="0" y1="0" x2="32" y2="32">
        <stop offset="0%" stopColor="#00D4FF" />
        <stop offset="100%" stopColor="#0066FF" />
      </linearGradient>
    </defs>
    <path
      d="M16 2L20 12L30 16L20 20L16 30L12 20L2 16L12 12Z"
      fill="url(#shuriken-grad)"
    />
    <circle cx="16" cy="16" r="3" fill="#0A0A0F" />
  </svg>
);

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <ShurikenLogo />
        <div>
          <h1 className="text-base font-bold leading-tight">
            <span className="text-foreground">Scala</span>
            <span className="text-primary">Ninja</span>
          </h1>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Obsidian Edition
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto">
        {mainNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "border-l-[3px] border-primary bg-sidebar-accent text-primary"
                  : "border-l-[3px] border-transparent text-sidebar-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-0.5">
        <NavLink
          to="/configuracoes"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            location.pathname === "/configuracoes"
              ? "border-l-[3px] border-primary bg-sidebar-accent text-primary"
              : "border-l-[3px] border-transparent text-sidebar-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-[18px] w-[18px]" />
          <span>Configurações</span>
        </NavLink>
        <button className="flex w-full items-center gap-3 rounded-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10">
          <LogOut className="h-[18px] w-[18px]" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
