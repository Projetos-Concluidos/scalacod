import { Moon, Bell, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TopBar = () => {
  const { profile } = useAuth();

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const planLabel = profile?.plan === "pro" ? "Pro Account"
    : profile?.plan === "enterprise" ? "Enterprise"
    : profile?.plan === "starter" ? "Starter"
    : "Free";

  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4">
      <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Moon className="h-[18px] w-[18px]" />
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
