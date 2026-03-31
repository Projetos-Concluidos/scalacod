import { useState, useEffect } from "react";
import { CreditCard, ArrowUpRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import PlanUsageBar from "@/components/PlanUsageBar";
import NinjaBadge from "@/components/NinjaBadge";
import PageHeader from "@/components/PageHeader";

const Subscription = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [usage, setUsage] = useState({ checkouts: 0, orders: 0, leads: 0, flows: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchData = async () => {
      // Get plan
      if (profile.plan_id) {
        const { data } = await supabase.from("plans").select("*").eq("id", profile.plan_id).single();
        if (data) setPlan(data);
      }

      // Get usage counts
      const [checkouts, orders, leads, flows] = await Promise.all([
        supabase.from("checkouts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("flows").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setUsage({
        checkouts: checkouts.count || 0,
        orders: orders.count || 0,
        leads: leads.count || 0,
        flows: flows.count || 0,
      });
      setLoading(false);
    };

    fetchData();
  }, [user, profile]);

  const limits = (plan?.limits as Record<string, number>) || {};

  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
    active: { label: "Ativo", variant: "success" },
    trial: { label: "Trial", variant: "warning" },
    inactive: { label: "Inativo", variant: "danger" },
    cancelled: { label: "Cancelado", variant: "danger" },
    past_due: { label: "Pendente", variant: "warning" },
  };

  const status = statusMap[profile?.subscription_status || "inactive"] || statusMap.inactive;

  return (
    <div>
      <PageHeader
        title="Minha Assinatura"
        subtitle="Gerencie seu plano, uso de recursos e cobranças"
        actions={
          <button
            onClick={() => navigate("/upgrade")}
            className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <ArrowUpRight className="h-4 w-4" /> Trocar plano
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        {/* Current plan */}
        <div className="ninja-card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Plano {plan?.name || "Nenhum"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {plan ? `R$ ${Number(plan.price_monthly).toFixed(2)}/mês` : "Sem plano ativo"}
                </p>
              </div>
            </div>
            <NinjaBadge variant={status.variant}>{status.label}</NinjaBadge>
          </div>

          {!plan && profile?.role !== "superadmin" && (
            <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-5 py-4">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">Nenhum plano ativo</p>
                <p className="text-xs text-muted-foreground">
                  Assine um plano para desbloquear todas as funcionalidades.
                </p>
              </div>
            </div>
          )}

          {profile?.subscription_ends_at && (
            <p className="text-sm text-muted-foreground mt-2">
              Próxima cobrança:{" "}
              <strong className="text-foreground">
                {new Date(profile.subscription_ends_at).toLocaleDateString("pt-BR")}
              </strong>
            </p>
          )}
        </div>

        {/* Token balance */}
        <div className="ninja-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Tokens de Voz
          </p>
          <p className="text-3xl font-bold text-foreground">
            {(profile?.token_balance || 0).toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">disponíveis</p>
        </div>
      </div>

      {/* Usage */}
      <div className="ninja-card">
        <h3 className="text-lg font-bold text-foreground mb-6">Uso do Plano</h3>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <PlanUsageBar label="Checkouts" current={usage.checkouts} limit={limits.checkouts ?? 0} />
            <PlanUsageBar label="Pedidos este mês" current={usage.orders} limit={limits.orders_per_month ?? 0} />
            <PlanUsageBar label="Leads" current={usage.leads} limit={limits.leads ?? 0} />
            <PlanUsageBar label="Fluxos" current={usage.flows} limit={limits.flows ?? 0} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
