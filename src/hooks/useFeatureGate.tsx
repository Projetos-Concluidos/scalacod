import { useAuth } from "@/contexts/AuthContext";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

interface FeatureGate {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

export function useFeatureGate(feature?: string): FeatureGate {
  const { profile } = useAuth();

  if (!profile) return { allowed: false, reason: "Não autenticado" };
  if (profile.role === "superadmin") return { allowed: true };

  const isActive = ["active", "trial"].includes(profile.subscription_status || "");
  if (!isActive) {
    return {
      allowed: false,
      reason: "Sua assinatura está inativa. Ative um plano para usar este recurso.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

export function UpgradePrompt({ reason }: { reason?: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Recurso bloqueado</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {reason || "Faça upgrade do seu plano para acessar este recurso."}
      </p>
      <button
        onClick={() => navigate("/configuracoes")}
        className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ver planos e fazer upgrade
      </button>
    </div>
  );
}

export function FeatureGateWrapper({
  feature,
  children,
  fallback,
}: {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const gate = useFeatureGate(feature);
  if (gate.allowed) return <>{children}</>;
  return <>{fallback || <UpgradePrompt reason={gate.reason} />}</>;
}
