import { useState, useEffect } from "react";
import { CreditCard, ArrowUpRight, AlertTriangle, Receipt } from "lucide-react";
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchData = async () => {
      if (profile.plan_id) {
        const { data } = await supabase.from("plans").select("*").eq("id", profile.plan_id).single();
        if (data) setPlan(data);
      }

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

    const fetchInvoices = async () => {
      const { data } = await supabase
        .from("subscription_invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setInvoices(data || []);
      setInvoicesLoading(false);
    };

    fetchData();
    fetchInvoices();
  }, [user, profile]);

  const limits = (plan?.limits as Record<string, number>) || {};

  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
    active: { label: "Ativo", variant: "success" },
    trial: { label: "Trial", variant: "warning" },
    inactive: { label: "Inativo", variant: "danger" },
    cancelled: { label: "Cancelado", variant: "danger" },
    past_due: { label: "Pendente", variant: "warning" },
  };

  const invoiceStatusMap: Record<string, { label: string; color: string }> = {
    paid: { label: "Pago", color: "text-success" },
    pending: { label: "Pendente", color: "text-warning" },
    overdue: { label: "Atrasado", color: "text-destructive" },
    cancelled: { label: "Cancelado", color: "text-muted-foreground" },
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

          {!plan && (
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
      <div className="ninja-card mb-8">
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

      {/* Invoice History */}
      <div className="ninja-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Histórico de Faturas</h3>
            <p className="text-xs text-muted-foreground">Suas cobranças recentes</p>
          </div>
        </div>

        {invoicesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma fatura encontrada</p>
            <p className="text-xs mt-1">Suas cobranças aparecerão aqui após a primeira assinatura.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vencimento</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const invStatus = invoiceStatusMap[inv.status] || { label: inv.status, color: "text-muted-foreground" };
                  return (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 text-foreground">
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-3 font-medium text-foreground">
                        R$ {Number(inv.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs font-semibold ${invStatus.color}`}>
                          {invStatus.label}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
