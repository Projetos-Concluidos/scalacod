import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Clock, Send, ChevronRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NinjaBadge from "@/components/NinjaBadge";
import RemarketingTimeline from "./RemarketingTimeline";

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

type Checkout = { id: string; name: string; slug: string | null };

const DEFAULT_STEPS = [
  { step_order: 1, delay_days: 1, send_hour: "19:00", message_template: "Olá {{cliente_nome}}! 😊 Notamos que seu pedido não foi concluído. Podemos ajudar? Se teve algum problema, estamos aqui!\n\n{{checkout_link}}", discount_value: 0 },
  { step_order: 2, delay_days: 2, send_hour: "19:30", message_template: "{{cliente_nome}}, o produto {{produto}} é um dos mais vendidos! 🔥 Clientes que compraram adoraram. Não perca essa oportunidade!\n\n{{checkout_link}}", discount_value: 0 },
  { step_order: 3, delay_days: 5, send_hour: "19:00", message_template: "⚡ {{cliente_nome}}, últimas unidades de {{produto}} disponíveis! A procura está alta e o estoque é limitado.\n\n{{checkout_link}}", discount_value: 5 },
  { step_order: 4, delay_days: 10, send_hour: "20:00", message_template: "{{cliente_nome}}, +500 clientes satisfeitos com {{produto}}! ⭐ Avaliação média de 4.8/5. Junte-se a eles!\n\n{{checkout_link}}", discount_value: 10 },
  { step_order: 5, delay_days: 15, send_hour: "19:00", message_template: "🎁 {{cliente_nome}}, preparamos algo especial para você! Use o cupom {{cupom}} e ganhe {{desconto_valor}} de desconto!\n\n{{checkout_link}}", discount_value: 15 },
  { step_order: 6, delay_days: 25, send_hour: "19:00", message_template: "⏰ ÚLTIMA CHANCE, {{cliente_nome}}! Seu cupom exclusivo {{cupom}} expira hoje. Aproveite {{desconto_valor}} OFF!\n\n{{checkout_link}}", discount_value: 20 },
];

const VARIABLES = [
  { key: "{{cliente_nome}}", desc: "Nome do cliente" },
  { key: "{{produto}}", desc: "Nome do produto" },
  { key: "{{checkout_link}}", desc: "Link do checkout" },
  { key: "{{cupom}}", desc: "Código do cupom" },
  { key: "{{desconto_valor}}", desc: "Valor do desconto" },
  { key: "{{valor_pedido}}", desc: "Valor do pedido original" },
];

interface Props {
  campaign: Campaign | null;
  steps: Step[];
  onClose: () => void;
  onSaved: () => void;
}

const RemarketingCampaignForm = ({ campaign, steps: initialSteps, onClose, onSaved }: Props) => {
  const { user } = useAuth();
  const [name, setName] = useState(campaign?.name || "");
  const [description, setDescription] = useState(campaign?.description || "");
  const [triggerStatus, setTriggerStatus] = useState(campaign?.trigger_status || "Frustrado");
  const [flowType, setFlowType] = useState(campaign?.flow_type || "all");
  const [checkoutId, setCheckoutId] = useState(campaign?.checkout_id || "");
  const [discountEnabled, setDiscountEnabled] = useState(campaign?.discount_enabled || false);
  const [discountType, setDiscountType] = useState(campaign?.discount_type || "percentage");
  const [discountProgressive, setDiscountProgressive] = useState(campaign?.discount_progressive ?? true);
  const [localSteps, setLocalSteps] = useState<any[]>(
    initialSteps.length > 0 ? initialSteps : DEFAULT_STEPS
  );
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("checkouts").select("id, name, slug").eq("user_id", user.id).then(({ data }) => {
      setCheckouts((data as Checkout[]) || []);
    });
  }, [user]);

  const addStep = () => {
    const lastStep = localSteps[localSteps.length - 1];
    setLocalSteps([...localSteps, {
      step_order: localSteps.length + 1,
      delay_days: (lastStep?.delay_days || 25) + 5,
      send_hour: "19:00",
      message_template: "",
      discount_value: 0,
    }]);
    setActiveStep(localSteps.length);
  };

  const removeStep = (idx: number) => {
    if (localSteps.length <= 1) return;
    const updated = localSteps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 }));
    setLocalSteps(updated);
    if (activeStep >= updated.length) setActiveStep(updated.length - 1);
  };

  const updateStep = (idx: number, field: string, value: any) => {
    const updated = [...localSteps];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalSteps(updated);
  };

  const save = async () => {
    if (!user || !name.trim()) {
      toast.error("Informe o nome da campanha");
      return;
    }
    setSaving(true);
    try {
      let campaignId = campaign?.id;

      if (campaign) {
        const { error } = await supabase.from("remarketing_campaigns").update({
          name, description: description || null, trigger_status: triggerStatus,
          flow_type: flowType, checkout_id: checkoutId || null,
          discount_enabled: discountEnabled, discount_type: discountType,
          discount_progressive: discountProgressive,
        }).eq("id", campaign.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("remarketing_campaigns").insert({
          user_id: user.id, name, description: description || null,
          trigger_status: triggerStatus, flow_type: flowType,
          checkout_id: checkoutId || null,
          discount_enabled: discountEnabled, discount_type: discountType,
          discount_progressive: discountProgressive,
        }).select("id").single();
        if (error) throw error;
        campaignId = data.id;
      }

      // Save steps: delete all then re-insert
      if (campaignId) {
        await supabase.from("remarketing_steps").delete().eq("campaign_id", campaignId);
        const stepsToInsert = localSteps.map((s, i) => ({
          campaign_id: campaignId!,
          step_order: i + 1,
          delay_days: s.delay_days,
          send_hour: s.send_hour,
          message_template: s.message_template,
          discount_value: s.discount_value || 0,
        }));
        const { error: stepsError } = await supabase.from("remarketing_steps").insert(stepsToInsert);
        if (stepsError) throw stepsError;
      }

      toast.success(campaign ? "Campanha atualizada!" : "Campanha criada!");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {campaign ? "Editar Campanha" : "Nova Campanha de Remarketing"}
          </h3>
          <p className="text-sm text-muted-foreground">Configure a cadência e mensagens de recuperação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="lg:col-span-1 space-y-4">
          <div className="ninja-card p-4 space-y-4">
            <h4 className="font-semibold text-foreground text-sm">Configuração</h4>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome da campanha *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Remarketing Frustrados" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} placeholder="Campanha para recuperar vendas frustradas..." />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status de Trigger</label>
              <select value={triggerStatus} onChange={e => setTriggerStatus(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="Frustrado">Frustrado</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Devolvido">Devolvido</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
              <select value={flowType} onChange={e => setFlowType(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="all">Todos</option>
                <option value="cod">Logzz (COD)</option>
                <option value="coinzz">Coinzz</option>
                <option value="hyppe">Hyppe</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Checkout vinculado</label>
              <select value={checkoutId} onChange={e => setCheckoutId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">Nenhum (usar link original)</option>
                {checkouts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.slug ? `(/c/${c.slug})` : ""}</option>
                ))}
              </select>
            </div>

            {/* Discount config */}
            <div className="border-t border-border pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={discountEnabled} onChange={e => setDiscountEnabled(e.target.checked)} className="rounded border-border" />
                <span className="text-sm font-medium text-foreground">Desconto progressivo</span>
              </label>
              {discountEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tipo de desconto</label>
                    <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <option value="percentage">Percentual (%)</option>
                      <option value="fixed">Valor fixo (R$)</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={discountProgressive} onChange={e => setDiscountProgressive(e.target.checked)} className="rounded border-border" />
                    <span className="text-xs text-muted-foreground">Aumentar desconto a cada step</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Variables reference */}
          <div className="ninja-card p-4">
            <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Variáveis disponíveis
            </h4>
            <div className="space-y-1.5">
              {VARIABLES.map(v => (
                <div key={v.key} className="flex items-center justify-between text-xs">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono">{v.key}</code>
                  <span className="text-muted-foreground">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Timeline + Step editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Timeline visual */}
          <RemarketingTimeline
            steps={localSteps}
            activeStep={activeStep}
            onSelectStep={setActiveStep}
            discountEnabled={discountEnabled}
            discountType={discountType}
          />

          {/* Step editor */}
          {localSteps[activeStep] && (
            <div className="ninja-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  Step {activeStep + 1}: Dia {localSteps[activeStep].delay_days}
                </h4>
                <div className="flex items-center gap-2">
                  {localSteps.length > 1 && (
                    <button onClick={() => removeStep(activeStep)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Remover step">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Dia após frustração</label>
                  <input type="number" min={1} max={90} value={localSteps[activeStep].delay_days} onChange={e => updateStep(activeStep, "delay_days", parseInt(e.target.value) || 1)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Horário de envio</label>
                  <input type="time" value={localSteps[activeStep].send_hour} onChange={e => updateStep(activeStep, "send_hour", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
              </div>

              {discountEnabled && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Desconto neste step ({discountType === "percentage" ? "%" : "R$"})
                  </label>
                  <input type="number" min={0} value={localSteps[activeStep].discount_value} onChange={e => updateStep(activeStep, "discount_value", parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mensagem</label>
                <textarea
                  value={localSteps[activeStep].message_template}
                  onChange={e => updateStep(activeStep, "message_template", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                  rows={6}
                  placeholder="Digite a mensagem de remarketing..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use as variáveis da lista à esquerda para personalizar
                </p>
              </div>
            </div>
          )}

          {/* Add step + Save */}
          <div className="flex items-center justify-between">
            <button onClick={addStep} className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <Plus className="h-4 w-4" /> Adicionar Step
            </button>
            <button onClick={save} disabled={saving} className="gradient-primary flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? "Salvando..." : campaign ? "Salvar Alterações" : "Criar Campanha"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemarketingCampaignForm;
