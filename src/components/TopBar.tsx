import { Moon, Sun, HelpCircle, Menu, Shield, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileSidebar } from "@/contexts/MobileSidebarContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";

const TopBar = () => {
  const { profile, user } = useAuth();
  const { open } = useMobileSidebar();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  // Fetch unread count
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
      .channel("topbar-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const isActive = ["active", "trial"].includes(profile?.subscription_status || "");
  const planLabel = profile?.role === "superadmin" ? "Admin"
    : profile?.plan === "pro" ? "Pro Account"
    : profile?.plan === "enterprise" ? "Enterprise"
    : profile?.plan === "starter" ? "Starter"
    : isActive ? "Ativo"
    : "Free";

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-card md:justify-end md:px-6 md:py-2.5">
      {/* Hamburger — mobile only */}
      <button
        onClick={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={isDark ? "Modo claro" : "Modo escuro"}
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <NotificationBell />
        <button
          onClick={() => navigate("/suporte")}
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
          title="Suporte"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        {profile?.role === "superadmin" && (
          <button
            onClick={() => navigate("/admin")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10"
            title="Painel Admin"
          >
            <Shield className="h-[18px] w-[18px]" />
          </button>
        )}
        <div className="ml-2 flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-foreground">{profile?.name || "Usuário"}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{planLabel}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
