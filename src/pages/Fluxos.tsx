import { useState, useEffect } from "react";
import { GitBranch, Zap, Folder, Plus, MessageCircle, Tag, ChevronDown, ChevronRight, Pencil, SlidersHorizontal, Sparkles, MoreHorizontal, XCircle, Star, CheckCircle, Loader2, Power, PowerOff, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import NinjaBadge from "@/components/NinjaBadge";
import FlowBuilderModal from "@/components/fluxos/FlowBuilderModal";
import AIFlowModal from "@/components/fluxos/AIFlowModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Flow = Tables<"flows">;

const Fluxos = () => {
  const { user } = useAuth();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [templates, setTemplates] = useState<Tables<"flow_templates">[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [subTab, setSubTab] = useState<"flows" | "templates" | "tags">("flows");
  const [expanded, setExpanded] = useState(true);

  const fetchFlows = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: flowsData }, { data: templatesData }] = await Promise.all([
      supabase.from("flows").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("flow_templates").select("*"),
    ]);
    setFlows(flowsData || []);
    setTemplates(templatesData || []);
    setLoading(false);
  };

  useEffect(() => { fetchFlows(); }, [user]);

  const activeFlows = flows.filter(f => f.is_active);

  const handleSaveFlow = async (data: any) => {
    if (!user) return;
    try {
      if (editingFlow) {
        await supabase.from("flows").update({
          name: data.name,
          trigger_event: data.trigger_event,
          flow_type: data.flow_type,
          is_official: data.is_official,
          nodes: data.nodes,
          edges: data.edges,
          node_count: data.node_count,
          message_count: data.message_count,
        }).eq("id", editingFlow.id);
        toast.success("Fluxo atualizado!");
      } else {
        await supabase.from("flows").insert({
          user_id: user.id,
          name: data.name,
          trigger_event: data.trigger_event,
          flow_type: data.flow_type,
          is_official: data.is_official,
          nodes: data.nodes,
          edges: data.edges,
          node_count: data.node_count,
          message_count: data.message_count,
          is_active: true,
        });
        toast.success("Fluxo criado!");
      }
      setBuilderOpen(false);
      setEditingFlow(null);
      fetchFlows();
    } catch {
      toast.error("Erro ao salvar fluxo");
    }
  };

  const handleAIGenerated = (data: any) => {
    setEditingFlow(null);
    setBuilderOpen(true);
    // Pre-populate builder with AI-generated data
    setTimeout(() => {
      setEditingFlow({ ...data, id: "" } as any);
      setBuilderOpen(false);
      setTimeout(() => {
        setEditingFlow({ ...data, id: "" } as any);
        setBuilderOpen(true);
      }, 100);
    }, 100);
  };

  const toggleFlowActive = async (flow: Flow) => {
    await supabase.from("flows").update({ is_active: !flow.is_active }).eq("id", flow.id);
    toast.success(flow.is_active ? "Fluxo desativado" : "Fluxo ativado");
    fetchFlows();
  };

  const deleteFlow = async (id: string) => {
    await supabase.from("flows").delete().eq("id", id);
    toast.success("Fluxo excluído");
    fetchFlows();
  };

  const getFlowIcon = (flow: Flow) => {
    if (flow.trigger_event === "pedido_cancelado") return <XCircle className="h-5 w-5 text-destructive" />;
    if (flow.trigger_event === "pedido_entregue") return <Star className="h-5 w-5 text-warning" />;
    return <CheckCircle className="h-5 w-5 text-success" />;
  };

  const getTemplateStatusBadge = (status: string | null) => {
    if (status === "approved") return <NinjaBadge variant="success">✓ Aprovado</NinjaBadge>;
    if (status === "rejected") return <NinjaBadge variant="danger">✗ Rejeitado</NinjaBadge>;
    return <NinjaBadge variant="warning">⏳ Pendente</NinjaBadge>;
  };

  return (
    <div>
      <PageHeader
        title="Fluxos"
        subtitle="Gerencie suas automações e funis de WhatsApp com precisão cirúrgica."
        actions={
          <div className="flex items-center gap-3">
            <button onClick={() => setAiOpen(true)} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              <Sparkles className="h-4 w-4 text-primary" /> IA
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
                  <SlidersHorizontal className="h-4 w-4" /> Mais
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Exportar fluxos</DropdownMenuItem>
                <DropdownMenuItem>Importar fluxo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={() => { setEditingFlow(null); setBuilderOpen(true); }} className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Novo Fluxo
            </button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total de Fluxos" value={flows.length} icon={<GitBranch className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
            <StatCard label="Fluxos Ativos" value={activeFlows.length} icon={<Zap className="h-6 w-6 text-success" />} iconBg="bg-success/10" />
            <StatCard label="Pastas" value={0} icon={<Folder className="h-6 w-6 text-muted-foreground" />} iconBg="bg-muted" />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 mb-6">
        <button className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">
          <GitBranch className="h-4 w-4" /> Todos
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <Folder className="h-4 w-4" /> Nova pasta
        </button>
      </div>

      {/* Content card */}
      <div className="ninja-card mb-6">
        {/* Sub tabs */}
        <div className="flex items-center gap-6 border-b border-border pb-4 mb-4">
          <button onClick={() => setSubTab("flows")} className={`flex items-center gap-2 text-sm font-medium ${subTab === "flows" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <MessageCircle className="h-4 w-4" /> Fluxos <NinjaBadge variant="info">{flows.length}</NinjaBadge>
          </button>
          <button onClick={() => setSubTab("templates")} className={`flex items-center gap-2 text-sm font-medium ${subTab === "templates" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <GitBranch className="h-4 w-4" /> Templates (API Oficial)
          </button>
          <button onClick={() => setSubTab("tags")} className={`flex items-center gap-2 text-sm font-medium ${subTab === "tags" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Tag className="h-4 w-4" /> Tags
          </button>
        </div>

        {subTab === "flows" && (
          <>
            {/* Collapsible group header */}
            <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Atribuição de Fluxos por Etapa
                <NinjaBadge variant="info">{flows.length}</NinjaBadge>
              </div>
              {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expanded && (
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : flows.length === 0 ? (
                  <div className="text-center py-12">
                    <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum fluxo criado ainda</p>
                    <button onClick={() => setBuilderOpen(true)} className="mt-3 text-sm text-primary hover:underline">Criar primeiro fluxo</button>
                  </div>
                ) : (
                  flows.map((flow) => (
                    <div key={flow.id} className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-4 transition-colors hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                          {getFlowIcon(flow)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{flow.name}</span>
                            {flow.is_official && <NinjaBadge variant="info">Oficial</NinjaBadge>}
                            <NinjaBadge variant={flow.flow_type === "cod" ? "success" : "default"}>{flow.flow_type?.toUpperCase()}</NinjaBadge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {flow.message_count || 0} msgs</span>
                            <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {flow.node_count || 0} nós</span>
                            <span>⏱ {flow.updated_at ? formatDistanceToNow(new Date(flow.updated_at), { addSuffix: true, locale: ptBR }) : "—"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`h-2 w-2 rounded-full ${flow.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                          {flow.is_active ? "Ativo" : "Inativo"}
                        </span>
                        {flow.is_official && (
                          <button className="gradient-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                            <Zap className="mr-1 inline h-3 w-3" /> Enviar p/ aprovação
                          </button>
                        )}
                        <button onClick={() => { setEditingFlow(flow); setBuilderOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleFlowActive(flow)}>
                              {flow.is_active ? <><PowerOff className="h-4 w-4 mr-2" /> Desativar</> : <><Power className="h-4 w-4 mr-2" /> Ativar</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteFlow(flow.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {subTab === "templates" && (
          <div className="space-y-2">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum template encontrado</p>
                <p className="text-xs text-muted-foreground mt-1">Templates são criados automaticamente ao enviar fluxos oficiais para aprovação</p>
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{t.template_name}</span>
                      {getTemplateStatusBadge(t.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Categoria: {t.category || "—"}</span>
                      <span>Idioma: {t.language || "pt_BR"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {subTab === "tags" && (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma tag criada ainda</p>
            <button className="mt-3 text-sm text-primary hover:underline">Criar primeira tag</button>
          </div>
        )}
      </div>

      {/* Modals */}
      <FlowBuilderModal
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingFlow(null); }}
        onSave={handleSaveFlow}
        initialData={editingFlow}
      />
      <AIFlowModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerated={handleAIGenerated}
      />
    </div>
  );
};

export default Fluxos;
