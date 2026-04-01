import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Circle, ChevronRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Step {
  id: string;
  label: string;
  done: boolean;
  link: string;
}

const OnboardingChecklist = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

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
        { id: "checkout", label: "Criar primeiro checkout", done: (ckRes.count || 0) > 0, link: "/checkouts" },
        { id: "order", label: "Primeiro pedido", done: (ordRes.count || 0) > 0, link: "/pedidos" },
      ]);
      setLoading(false);
    };
    check();
  }, [user]);

  if (loading) return null;

  const completedCount = steps.filter((s) => s.done).length;
  if (completedCount === 4) return null;

  const pct = Math.round((completedCount / 4) * 100);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            Configuração inicial ({completedCount}/4)
          </h3>
        </div>
        <span className="text-sm font-medium text-primary">{pct}% completo</span>
      </div>
      <div className="h-2 rounded-full bg-primary/20 mb-4">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-1">
        {steps.map((step) => (
          <Link
            key={step.id}
            to={step.link}
            className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-primary/10 ${
              step.done ? "text-primary" : "text-foreground"
            }`}
          >
            {step.done ? (
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
            )}
            <span className={`text-sm font-medium ${step.done ? "line-through opacity-60" : ""}`}>
              {step.label}
            </span>
            {!step.done && <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default OnboardingChecklist;
