import { useState, useEffect } from "react";
import { Plus, RefreshCw, Target, TrendingUp, Users, DollarSign, Power, PowerOff, Trash2, Pencil, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NinjaBadge from "@/components/NinjaBadge";
import { Skeleton } from "@/components/ui/skeleton";
import RemarketingCampaignForm from "./RemarketingCampaignForm";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_status: string;
  flow_type: string;
  checkout_id: string | null;
  discount_enabled: boolean;
  discount_type: string;
  discount_progressive: boolean;
  total_enrolled: number;
  total_converted: number;
  total_revenue_recovered: number;
  created_at: string;
};

type Step = {
  id: string;
  campaign_id: string;
  step_order: number;
  delay_days: number;
  send_hour: string;
  message_template: string;
  discount_value: number;
};

const RemarketingTab = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingSteps, setEditingSteps] = useState<Step[]>([]);

  const fetchCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("remarketing_campaigns")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCampaigns((data as Campaign[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, [user]);

  const toggleActive = async (c: Campaign) => {
    await supabase.from("remarketing_campaigns").update({ is_active: !c.is_active }).eq("id", c.id);
    toast.success(c.is_active ? "Campanha desativada" : "Campanha ativada");
    fetchCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("remarketing_campaigns").delete().eq("id", id);
    toast.success("Campanha excluída");
    fetchCampaigns();
  };

  const openEdit = async (c: Campaign) => {
    const { data } = await supabase
      .from("remarketing_steps")
      .select("*")
      .eq("campaign_id", c.id)
      .order("step_order", { ascending: true });
    setEditingCampaign(c);
    setEditingSteps((data as Step[]) || []);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingCampaign(null);
    setEditingSteps([]);
    setFormOpen(true);
  };

  // Stats
  const totalEnrolled = campaigns.reduce((s, c) => s + c.total_enrolled, 0);
  const totalConverted = campaigns.reduce((s, c) => s + c.total_converted, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + Number(c.total_revenue_recovered), 0);
  const conversionRate = totalEnrolled > 0 ? Math.round((totalConverted / totalEnrolled) * 100) : 0;

  if (formOpen) {
    return (
      <RemarketingCampaignForm
        campaign={editingCampaign}
        steps={editingSteps}
        onClose={() => { setFormOpen(false); setEditingCampaign(null); }}
        onSaved={() => { setFormOpen(false); setEditingCampaign(null); fetchCampaigns(); }}
      />
    );
  }

  return (
    <div>
      {/* Dashboard mini */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="ninja-card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inscritos</p>
            <p className="text-lg font-bold text-foreground">{totalEnrolled}</p>
          </div>
        </div>
        <div className="ninja-card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Convertidos</p>
            <p className="text-lg font-bold text-foreground">{totalConverted}</p>
          </div>
        </div>
        <div className="ninja-card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <BarChart3 className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
            <p className="text-lg font-bold text-foreground">{conversionRate}%</p>
          </div>
        </div>
        <div className="ninja-card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receita Recuperada</p>
            <p className="text-lg font-bold text-foreground">R$ {totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Campanhas de Remarketing</h3>
          <p className="text-sm text-muted-foreground">Recupere vendas frustradas com sequências automatizadas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCampaigns} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={openNew} className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Campaigns list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma campanha criada</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie sua primeira campanha de remarketing para recuperar vendas frustradas</p>
          <button onClick={openNew} className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Criar Campanha
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="ninja-card flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.is_active ? "bg-success/10" : "bg-muted"}`}>
                  <Target className={`h-5 w-5 ${c.is_active ? "text-success" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground truncate">{c.name}</h4>
                    {c.is_active ? (
                      <NinjaBadge variant="success">Ativa</NinjaBadge>
                    ) : (
                      <NinjaBadge variant="neutral">Inativa</NinjaBadge>
                    )}
                    {c.flow_type !== "all" && (
                      <NinjaBadge variant={c.flow_type === "cod" ? "success" : c.flow_type === "coinzz" ? "info" : "warning"}>
                        {c.flow_type === "cod" ? "LOGZZ" : c.flow_type === "coinzz" ? "COINZZ" : "HYPPE"}
                      </NinjaBadge>
                    )}
                    {c.discount_enabled && (
                      <NinjaBadge variant="warning">
                        {c.discount_progressive ? "Desconto Progressivo" : "Desconto Fixo"}
                      </NinjaBadge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trigger: {c.trigger_status} · {c.total_enrolled} inscritos · {c.total_converted} convertidos
                    {c.total_enrolled > 0 && ` · ${Math.round((c.total_converted / c.total_enrolled) * 100)}% conversão`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => toggleActive(c)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title={c.is_active ? "Desativar" : "Ativar"}>
                  {c.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </button>
                <button onClick={() => deleteCampaign(c.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RemarketingTab;
