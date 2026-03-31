import { useState, useEffect } from "react";
import { Send, TrendingUp, AlertTriangle, Info, Plus, Search, Loader2, Calendar, Clock, Users, FileText, Upload, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { useFeatureGate, UpgradePrompt } from "@/hooks/useFeatureGate";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import NinjaBadge from "@/components/NinjaBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Campaign = Tables<"campaigns">;

const Disparos = () => {
  const gate = useFeatureGate("campaigns");
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [flows, setFlows] = useState<Tables<"flows">[]>([]);
  const [whatsappInstances, setWhatsappInstances] = useState<Tables<"whatsapp_instances">[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // New campaign state
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [segmentation, setSegmentation] = useState<"all" | "status" | "tag">("all");
  const [segmentStatus, setSegmentStatus] = useState("Confirmado");
  const [segmentTag, setSegmentTag] = useState("");
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [estimatedReach, setEstimatedReach] = useState(0);
  const [creating, setCreating] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState("Olá {{nome}}! Confira nossas novidades 🔥");
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: campaignsData }, { data: flowsData }, { data: instancesData }, { count }] = await Promise.all([
      supabase.from("campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("flows").select("*").eq("user_id", user.id),
      supabase.from("whatsapp_instances").select("*").eq("user_id", user.id),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setCampaigns(campaignsData || []);
    setFlows(flowsData || []);
    setWhatsappInstances(instancesData || []);
    setLeadsCount(count || 0);
    setEstimatedReach(count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Realtime progress for running campaigns
  useEffect(() => {
    const channel = supabase
      .channel("campaigns-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "campaigns" }, (payload) => {
        const updated = payload.new as Campaign;
        setCampaigns(prev => prev.map(c => c.id === updated.id ? { ...updated } : c));
        if (updated.status === "completed" && runningCampaignId === updated.id) {
          setRunningCampaignId(null);
          toast.success(`Campanha concluída! ${updated.sent_count || 0} enviados, ${updated.failed_count || 0} falhas`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [runningCampaignId]);

  const hasOfficialApi = whatsappInstances.some(i => i.provider === "meta" || i.provider === "ycloud");
  const approvedFlows = flows.filter(f => f.template_status === "approved");
  const pendingFlows = flows.filter(f => f.template_status === "pending");

  const totalReach = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalFailed = campaigns.reduce((sum, c) => sum + (c.failed_count || 0), 0);
  const completedCampaigns = campaigns.filter(c => c.status === "completed").length;

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed": return <NinjaBadge variant="success">Concluída</NinjaBadge>;
      case "running": return <NinjaBadge variant="warning">Enviando</NinjaBadge>;
      case "scheduled": return <NinjaBadge variant="info">Agendada</NinjaBadge>;
      case "failed": return <NinjaBadge variant="danger">Falhou</NinjaBadge>;
      default: return <NinjaBadge variant="default">Rascunho</NinjaBadge>;
    }
  };

  const handleSegmentationChange = async (seg: typeof segmentation) => {
    setSegmentation(seg);
    if (!user) return;
    if (seg === "all") {
      setEstimatedReach(leadsCount);
    } else if (seg === "status") {
      const { count } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", segmentStatus);
      setEstimatedReach(count || 0);
    } else {
      setEstimatedReach(leadsCount);
    }
  };

  const handleCreate = async () => {
    if (!user || !campaignName) return;
    setCreating(true);
    try {
      const scheduledAt = scheduleType === "scheduled" && scheduleDate
        ? new Date(`${format(scheduleDate, "yyyy-MM-dd")}T${scheduleTime}:00`).toISOString()
        : null;

      const segmentFilter: any = {};
      if (segmentation === "status") segmentFilter.status = segmentStatus;
      if (segmentation === "tag" && segmentTag) segmentFilter.tag = segmentTag;

      const { data: newCampaign, error } = await supabase.from("campaigns").insert({
        user_id: user.id,
        name: campaignName,
        flow_id: selectedFlowId || null,
        status: scheduleType === "now" ? "draft" : "scheduled",
        total_recipients: estimatedReach,
        scheduled_at: scheduledAt,
        segment_filter: segmentFilter,
        message_template: messageTemplate,
      }).select().single();

      if (error) throw error;

      // If sending now, invoke the edge function
      if (scheduleType === "now" && newCampaign) {
        setRunningCampaignId(newCampaign.id);
        supabase.functions.invoke("execute-campaign", {
          body: { campaignId: newCampaign.id },
        }).then(({ error: execErr }) => {
          if (execErr) {
            toast.error("Erro ao executar campanha: " + execErr.message);
            setRunningCampaignId(null);
          }
        });
        toast.success("Campanha iniciada! Acompanhe o progresso em tempo real.");
      } else {
        toast.success("Campanha agendada com sucesso!");
      }

      setModalOpen(false);
      resetModal();
      fetchData();
    } catch (err: any) {
      toast.error("Erro ao criar campanha: " + (err.message || ""));
    } finally {
      setCreating(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setCampaignName("");
    setSelectedFlowId("");
    setSegmentation("all");
    setScheduleType("now");
    setScheduleDate(undefined);
    setScheduleTime("09:00");
    setEstimatedReach(leadsCount);
  };

  if (!gate.allowed) return <UpgradePrompt reason={gate.reason} />;

  return (
    <div>
      <PageHeader
        title="Disparos"
        badge={<NinjaBadge variant="info">API Oficial</NinjaBadge>}
        subtitle="Envie templates aprovados pela Meta para sua base de leads via WhatsApp Cloud API"
        actions={
          <button onClick={() => { resetModal(); setModalOpen(true); }} className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Nova Campanha
          </button>
        }
      />

      {/* Warnings */}
      <div className="space-y-3 mb-8">
        {!loading && !hasOfficialApi && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">API Oficial do WhatsApp não configurada</p>
              <p className="text-xs text-muted-foreground">Para realizar disparos, conecte seu número via API Oficial na aba <strong>WhatsApp Cloud</strong>. Os disparos utilizam exclusivamente provedores oficiais (Meta Cloud ou YCloud).</p>
            </div>
          </div>
        )}
        {!loading && approvedFlows.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <Info className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">Nenhum fluxo aprovado pela Meta</p>
              <p className="text-xs text-muted-foreground">Você tem {pendingFlows.length} fluxos pendentes de aprovação. Apenas fluxos com template aprovado podem ser usados em disparos. Vá em <strong>Fluxos</strong> para submeter seus templates.</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Alcance Total" value={totalReach.toLocaleString("pt-BR")} icon={<TrendingUp className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
            <StatCard label="Campanhas" value={`${campaigns.length} (${completedCampaigns} concluídas)`} icon={<Send className="h-6 w-6 text-muted-foreground" />} iconBg="bg-muted" />
            <StatCard label="Falhas" value={totalFailed.toLocaleString("pt-BR")} icon={<AlertTriangle className="h-6 w-6 text-destructive" />} iconBg="bg-destructive/10" />
          </>
        )}
      </div>

      {/* Campaigns table */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Campanhas Recentes</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar campanhas..."
              className="h-9 rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <EmptyState
            icon={<Send className="h-12 w-12" />}
            title="Nenhuma campanha criada"
            description="Crie sua primeira campanha para disparar templates via API Oficial"
            action={
              <button onClick={() => { resetModal(); setModalOpen(true); }} className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> Nova Campanha
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enviados</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Falhas</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map(campaign => {
                  const flow = flows.find(f => f.id === campaign.flow_id);
                  return (
                    <tr key={campaign.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-foreground">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">{flow?.name || "—"}</p>
                        </div>
                      </td>
                      <td className="py-4">{getStatusBadge(campaign.status)}</td>
                      <td className="py-4">
                        <span className="text-foreground font-medium">{campaign.sent_count || 0}</span>
                        <span className="text-muted-foreground">/{campaign.total_recipients || 0}</span>
                      </td>
                      <td className="py-4 text-destructive font-medium">{campaign.failed_count || 0}</td>
                      <td className="py-4 text-xs text-muted-foreground">
                        {campaign.created_at ? formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true, locale: ptBR }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) { setModalOpen(false); resetModal(); } }}>
        <DialogContent className="max-w-lg bg-card border-border p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-foreground">Nova Campanha</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
            {[{ n: 1, l: "Config" }, { n: 2, l: "Público" }, { n: 3, l: "Agendar" }].map(s => (
              <div key={s.n} className={cn("flex items-center gap-2 text-xs font-semibold", s.n === step ? "text-primary" : "text-muted-foreground")}>
                <span className={cn("h-6 w-6 rounded-full flex items-center justify-center text-xs", s.n === step ? "bg-primary text-primary-foreground" : s.n < step ? "bg-success text-success-foreground" : "bg-muted")}>{s.n < step ? "✓" : s.n}</span>
                {s.l}
                {s.n < 3 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex: Black Friday 2025" />
                </div>
                <div className="space-y-2">
                  <Label>Template (Fluxo aprovado)</Label>
                  <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                    <SelectContent>
                      {approvedFlows.length > 0 ? (
                        approvedFlows.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)
                      ) : (
                        flows.map(f => <SelectItem key={f.id} value={f.id}>{f.name} {f.template_status === "pending" ? "(pendente)" : ""}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                  {approvedFlows.length === 0 && <p className="text-[11px] text-warning">Nenhum template aprovado. Selecione um fluxo pendente.</p>}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-3">
                  <Label>Segmentação do Público</Label>
                  {[
                    { value: "all" as const, label: "Todos os leads", icon: Users, desc: `${leadsCount} contatos` },
                    { value: "status" as const, label: "Leads por status", icon: FileText, desc: "Filtrar por status" },
                    { value: "tag" as const, label: "Leads por tag", icon: FileText, desc: "Filtrar por tag" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleSegmentationChange(opt.value)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        segmentation === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                      )}
                    >
                      <opt.icon className={cn("h-5 w-5", segmentation === opt.value ? "text-primary" : "text-muted-foreground")} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                  {segmentation === "status" && (
                    <Select value={segmentStatus} onValueChange={async (v) => {
                      setSegmentStatus(v);
                      if (user) {
                        const { count } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", v);
                        setEstimatedReach(count || 0);
                      }
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Confirmado">Confirmado</SelectItem>
                        <SelectItem value="Em Aguardo">Em Aguardo</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">Estimativa de alcance</p>
                  <p className="text-2xl font-bold text-primary">{estimatedReach.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">contatos</p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-3">
                  <Label>Quando enviar?</Label>
                  {[
                    { value: "now" as const, label: "Enviar agora", icon: Send },
                    { value: "scheduled" as const, label: "Agendar envio", icon: Calendar },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setScheduleType(opt.value)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        scheduleType === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                      )}
                    >
                      <opt.icon className={cn("h-5 w-5", scheduleType === opt.value ? "text-primary" : "text-muted-foreground")} />
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    </button>
                  ))}

                  {scheduleType === "scheduled" && (
                    <div className="flex gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}>
                            <Calendar className="mr-2 h-4 w-4" />
                            {scheduleDate ? format(scheduleDate, "dd/MM/yyyy") : "Data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent mode="single" selected={scheduleDate} onSelect={setScheduleDate} disabled={d => d < new Date()} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="pl-9 w-32" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-muted/50 border border-border px-4 py-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Resumo</p>
                  <p className="text-xs text-muted-foreground">Campanha: <strong className="text-foreground">{campaignName}</strong></p>
                  <p className="text-xs text-muted-foreground">Destinatários: <strong className="text-primary">{estimatedReach.toLocaleString("pt-BR")} contatos</strong></p>
                  <p className="text-xs text-muted-foreground">Envio: <strong className="text-foreground">{scheduleType === "now" ? "Imediato" : scheduleDate ? `${format(scheduleDate, "dd/MM/yyyy")} às ${scheduleTime}` : "Agendar data"}</strong></p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : setModalOpen(false)} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> {step > 1 ? "Voltar" : "Cancelar"}
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !campaignName} className="gradient-primary text-primary-foreground">
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={creating || !campaignName} className="gradient-primary text-primary-foreground">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Confirmar e Disparar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Disparos;
