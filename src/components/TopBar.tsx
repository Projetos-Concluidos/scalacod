import { Moon, Sun, Bell, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

const TopBar = () => {
  const { profile } = useAuth();

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

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const planLabel = profile?.plan === "pro" ? "Pro Account"
    : profile?.plan === "enterprise" ? "Enterprise"
    : profile?.plan === "starter" ? "Starter"
    : "Free";

  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-b border-border bg-card">
      <button
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={isDark ? "Modo claro" : "Modo escuro"}
      >
        {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>
      <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Bell className="h-[18px] w-[18px]" />
      </button>
      <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <HelpCircle className="h-[18px] w-[18px]" />
      </button>
      <div className="ml-2 flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">{profile?.name || "Usuário"}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{planLabel}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initials}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
