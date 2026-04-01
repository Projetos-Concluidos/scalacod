import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Step {
  id: string;
  label: string;
  done: boolean;
  link: string;
}

const OnboardingBanner = () => {
  const { user, profile, updateProfile } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const [waRes, intRes, ckRes, ordRes] = await Promise.all([
        supabase.from("whatsapp_instances").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("integrations").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "logzz"),
        supabase.from("checkouts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setSteps([
        { id: "whatsapp", label: "Conectar WhatsApp", done: (waRes.count || 0) > 0, link: "/whatsapp-cloud" },
        { id: "logzz", label: "Configurar Logzz", done: (intRes.count || 0) > 0, link: "/configuracoes" },
        { id: "checkout", label: "Criar checkout", done: (ckRes.count || 0) > 0, link: "/checkouts" },
        { id: "order", label: "Primeiro pedido", done: (ordRes.count || 0) > 0, link: "/pedidos" },
      ]);
      setLoading(false);
    };
    check();
  }, [user]);

  if (loading) return null;

  // Check dismissed from profile
  const isDismissed = (profile as any)?.onboarding_dismissed === true;
  if (isDismissed) return null;
  if (sessionDismissed) return null;

  const completedCount = steps.filter((s) => s.done).length;

  // Auto-dismiss when all done
  if (completedCount === 4) {
    updateProfile({ onboarding_dismissed: true, onboarding_dismissed_at: new Date().toISOString() } as any);
    return null;
  }

  const nextStep = steps.find((s) => !s.done);

  const handleSessionDismiss = () => {
    setHiding(true);
    setTimeout(() => setSessionDismissed(true), 300);
  };

  const handlePermanentDismiss = async () => {
    setHiding(true);
    await updateProfile({ onboarding_dismissed: true, onboarding_dismissed_at: new Date().toISOString() } as any);
  };

  const circumference = 2 * Math.PI * 16; // r=16
  const dashArray = `${(completedCount / 4) * circumference} ${circumference}`;

  return (
    <div
      className={`border border-primary/20 bg-primary/5 rounded-xl p-4 mb-6 relative transition-all duration-300 ${
        hiding ? "opacity-0 max-h-0 mb-0 p-0 overflow-hidden" : "opacity-100 max-h-40"
      }`}
    >
      {/* Close button (session) */}
      <button
        onClick={handleSessionDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        title="Fechar (vai aparecer novamente)"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-4 pr-8">
        {/* Progress circle */}
        <div className="flex-shrink-0 relative w-10 h-10">
          <svg className="w-10 h-10 -rotate-90">
            <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="4" />
            <circle
              cx="20" cy="20" r="16" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeDasharray={dashArray}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
            {completedCount}/4
          </span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Configure sua conta ({completedCount} de 4 etapas)
          </p>
          {nextStep && (
            <Link to={nextStep.link} className="text-xs text-primary hover:text-primary/80 transition-colors">
              Próximo: {nextStep.label} →
            </Link>
          )}
        </div>

        {/* Step chips (desktop) */}
        <div className="hidden md:flex gap-1.5">
          {steps.map((step) => (
            <Link
              key={step.id}
              to={step.link}
              title={step.label}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                step.done
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {step.done ? <Check size={12} /> : "○"}
            </Link>
          ))}
        </div>

        {/* Permanent dismiss (desktop) */}
        <button
          onClick={handlePermanentDismiss}
          className="hidden md:flex text-xs text-muted-foreground hover:text-foreground whitespace-nowrap ml-2 transition-colors"
        >
          Não mostrar mais
        </button>
      </div>

      {/* Mobile: permanent dismiss */}
      <div className="md:hidden mt-2 flex justify-end">
        <button
          onClick={handlePermanentDismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Não mostrar mais
        </button>
      </div>
    </div>
  );
};

export default OnboardingBanner;
