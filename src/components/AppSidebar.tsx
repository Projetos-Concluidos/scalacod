import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Users, MessageCircle,
  GitBranch, Mic, Send, Cloud, Settings, LogOut, X, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ScalaCODLogo from "@/components/ScalaCODLogo";
import { useMobileSidebar } from "@/contexts/MobileSidebarContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

// Logo imported from shared component

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isOpen, close } = useMobileSidebar();
  const [unreadCount, setUnreadCount] = useState(0);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  // Fetch unread conversation count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .gt("unread_count", 0);
      setUnreadCount(count || 0);
    };
    fetchUnread();
    const channel = supabase
      .channel("sidebar-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      <aside
        role="navigation"
        aria-label="Menu principal"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={close}
          className="absolute right-3 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white md:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 px-6 py-6">
          <ScalaCODLogo size={32} centerFill="#0F1923" />
          <div>
            <h1 className="text-base font-bold leading-tight">
              <span className="text-white">Scala</span>
              <span className="text-emerald-400" style={{ textShadow: "0 0 12px rgba(52,211,153,0.5)" }}>COD</span>
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground">
              AFILIADO Pro
            </span>
          </div>
        </div>

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
                    ? "border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-l-[3px] border-transparent text-sidebar-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
                {item.label === "Conversas" && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-3 space-y-0.5">
          <NavLink
            to="/suporte"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              location.pathname === "/suporte"
                ? "border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                : "border-l-[3px] border-transparent text-sidebar-foreground hover:bg-white/5 hover:text-white"
            )}
          >
            <HelpCircle className="h-[18px] w-[18px]" />
            <span>Suporte</span>
          </NavLink>
          <NavLink
            to="/configuracoes"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              location.pathname === "/configuracoes"
                ? "border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                : "border-l-[3px] border-transparent text-sidebar-foreground hover:bg-white/5 hover:text-white"
            )}
          >
            <Settings className="h-[18px] w-[18px]" />
            <span>Configurações</span>
          </NavLink>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
