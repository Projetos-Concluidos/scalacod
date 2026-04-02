import { useState, useEffect } from "react";
import { GitBranch, Zap, Folder, Plus, MessageCircle, Tag, ChevronDown, ChevronRight, Pencil, SlidersHorizontal, Sparkles, MoreHorizontal, XCircle, Star, CheckCircle, Loader2, Power, PowerOff, Trash2, History, AlertTriangle, Clock, LayoutTemplate, X, Download, Upload, Copy } from "lucide-react";
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
  const [subTab, setSubTab] = useState<"flows" | "templates" | "executions" | "tags">("flows");
  const [executions, setExecutions] = useState<any[]>([]);
  const [execLoading, setExecLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTemplates, setGalleryTemplates] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [flowFilter, setFlowFilter] = useState<"all" | "cod" | "coinzz">("all");

  const openGallery = async () => {
    setGalleryOpen(true);
    setGalleryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/seed-default-flows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: "list_templates" }),
      });
      const data = await res.json();
      setGalleryTemplates(data.templates || []);
    } catch {
      toast.error("Erro ao carregar templates");
    }
    setGalleryLoading(false);
  };

  const useTemplate = async (index: number) => {
    if (!user) return;
    setCreatingTemplate(index);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/seed-default-flows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: "use_template", template_index: index }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Fluxo "${data.flow.name}" criado com sucesso!`);
        setGalleryOpen(false);
        fetchFlows();
      } else {
        toast.error(data.error || "Erro ao criar fluxo");
      }
    } catch {
      toast.error("Erro ao criar fluxo a partir do template");
    }
    setCreatingTemplate(null);
  };

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

  const fetchExecutions = async () => {
    if (!user) return;
    setExecLoading(true);
    const { data } = await supabase
      .from("flow_executions")
      .select("*, flows(name), orders(order_number, client_name, status)")
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false })
      .limit(50);
    setExecutions(data || []);
    setExecLoading(false);
  };

  useEffect(() => {
    if (subTab === "executions") fetchExecutions();
  }, [subTab, user]);

  const activeFlows = flows.filter(f => f.is_active);

  const handleSaveFlow = async (data: any) => {
    if (!user) return;
    try {
      // Serialize nodes/edges to plain JSON (strip React Flow internal properties)
      const serializeNodes = (nodes: any[]) => (nodes || []).map((n: any) => ({
        id: n.id,
        position: n.position,
        data: n.data,
        style: n.style,
        type: n.type,
      }));
      const serializeEdges = (edges: any[]) => (edges || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: e.animated,
        style: e.style,
        label: e.label,
      }));

      const serializedNodes = serializeNodes(data.nodes);
      const serializedEdges = serializeEdges(data.edges);

      if (editingFlow && editingFlow.id) {
        const { error } = await supabase.from("flows").update({
          name: data.name,
          trigger_event: data.trigger_event,
          flow_type: data.flow_type,
          is_official: data.is_official,
          nodes: serializedNodes,
          edges: serializedEdges,
          node_count: serializedNodes.length,
          message_count: data.message_count,
        }).eq("id", editingFlow.id);
          if (error) {
            if (import.meta.env.DEV) console.error("Update flow error:", error);
          toast.error(`Erro ao atualizar fluxo: ${error.message}`);
          return;
        }
        toast.success("Fluxo atualizado!");
      } else {
        const insertPayload = {
          user_id: user.id,
          name: data.name || "Fluxo sem nome",
          trigger_event: data.trigger_event || "pedido_criado",
          flow_type: data.flow_type || "cod",
          is_official: data.is_official ?? false,
          nodes: serializedNodes,
          edges: serializedEdges,
          node_count: serializedNodes.length,
          message_count: data.message_count || 0,
          is_active: true,
        };
        if (import.meta.env.DEV) console.log("Inserting flow:", JSON.stringify(insertPayload).substring(0, 300));
        const { error } = await supabase.from("flows").insert(insertPayload);
        if (error) {
          if (import.meta.env.DEV) console.error("Insert flow error:", error);
          toast.error(`Erro ao criar fluxo: ${error.message}`);
          return;
        }
        toast.success("Fluxo criado!");
      }
      setBuilderOpen(false);
      setEditingFlow(null);
      fetchFlows();
    } catch (e: any) {
      if (import.meta.env.DEV) console.error("Save flow exception:", e);
      toast.error("Erro ao salvar fluxo");
    }
  };

  const handleAIGenerated = (data: any) => {
    setEditingFlow({ ...data, id: "" } as any);
    setBuilderOpen(true);
  };

  const submitTemplateToMeta = async (flow: Flow) => {
    if (!user) return;
    try {
      const components = [];
      const messageNodes = (flow.nodes as any[])?.filter((n: any) => n.data?.type === "message") || [];
      if (messageNodes.length > 0) {
        components.push({ type: "BODY", text: messageNodes.map((n: any) => n.data?.content || n.data?.label).join("\n") });
      }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/meta-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_template",
          user_id: user.id,
          flow_id: flow.id,
          template_data: {
            name: flow.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 60),
            category: "UTILITY",
            language: "pt_BR",
            components: components.length > 0 ? components : [{ type: "BODY", text: flow.name }],
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Template enviado para aprovação! ID: ${data.template_id}`);
        fetchFlows();
      } else {
        toast.error(data.error || "Erro ao submeter template");
      }
    } catch {
      toast.error("Erro ao enviar template para a Meta");
    }
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

  const exportFlow = (flow: Flow) => {
    const exportData = {
      _ninjacod: true,
      v: 1,
      name: flow.name,
      description: flow.description || "",
      provider: flow.is_official ? "official" : "evolution",
      nodes: flow.nodes || [],
      edges: flow.edges || [],
    };
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(exportData))));
    navigator.clipboard.writeText(code);
    toast.success("Código do fluxo copiado para a área de transferência!");
  };

  const handleImport = async (providerOverride?: "evolution" | "official") => {
    if (!user || !importCode.trim()) return;
    try {
      const jsonStr = decodeURIComponent(escape(atob(importCode.trim())));
      const parsed = JSON.parse(jsonStr);
      if (!parsed._ninjacod || !parsed.nodes) {
        toast.error("Código inválido. Use um código exportado válido.");
        return;
      }
      const isOfficial = providerOverride ? providerOverride === "official" : parsed.provider === "official";
      const { error } = await supabase.from("flows").insert({
        user_id: user.id,
        name: parsed.name || "Fluxo importado",
        description: parsed.description || null,
        flow_type: "cod",
        is_official: isOfficial,
        nodes: parsed.nodes,
        edges: parsed.edges || [],
        node_count: parsed.nodes?.length || 0,
        message_count: parsed.nodes?.filter((n: any) => n.type === "message" || n.data?.type === "message").length || 0,
        is_active: true,
        trigger_event: parsed.nodes?.find((n: any) => n.type === "trigger")?.data?.keyword || "pedido_criado",
      });
      if (error) { toast.error(error.message); return; }
      toast.success(`Fluxo "${parsed.name}" importado com sucesso!`);
      setImportOpen(false);
      setImportCode("");
      fetchFlows();
    } catch {
      toast.error("Código inválido. Verifique e tente novamente.");
    }
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
            <button onClick={openGallery} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              <LayoutTemplate className="h-4 w-4 text-primary" /> Templates
            </button>
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
                  <DropdownMenuItem onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" /> Importar fluxo
                  </DropdownMenuItem>
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
        <button
          onClick={() => setFlowFilter("all")}
          className={flowFilter === "all" ? "gradient-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground" : "flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"}
        >
          <GitBranch className="h-4 w-4" /> Todos
        </button>
        <button
          onClick={() => setFlowFilter("cod")}
          className={flowFilter === "cod" ? "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"}
        >
          🟢 Logzz
        </button>
        <button
          onClick={() => setFlowFilter("coinzz")}
          className={flowFilter === "coinzz" ? "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30" : "flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"}
        >
          🟣 Coinzz
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
          <button onClick={() => setSubTab("executions")} className={`flex items-center gap-2 text-sm font-medium ${subTab === "executions" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <History className="h-4 w-4" /> Execuções
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
                <NinjaBadge variant="info">{filteredFlows.length}</NinjaBadge>
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
                          <button
                            onClick={() => submitTemplateToMeta(flow)}
                            className="gradient-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                          >
                            <Zap className="mr-1 inline h-3 w-3" /> Enviar p/ aprovação
                          </button>
                        )}
                        <button onClick={() => { setEditingFlow(flow); setBuilderOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportFlow(flow)}>
                              <Download className="h-4 w-4 mr-2" /> Exportar
                            </DropdownMenuItem>
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

        {subTab === "executions" && (
          <div className="space-y-2">
            {execLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : executions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma execução registrada</p>
                <p className="text-xs text-muted-foreground mt-1">Execuções aparecerão quando pedidos mudarem de status</p>
              </div>
            ) : (
              executions.map((exec) => (
                <div key={exec.id} className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3 transition-colors hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      exec.status === "completed" ? "bg-success/10" : exec.status === "failed" ? "bg-destructive/10" : "bg-warning/10"
                    }`}>
                      {exec.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : exec.status === "failed" ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-warning animate-spin" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {(exec.flows as any)?.name || "Fluxo removido"}
                        </span>
                        <NinjaBadge variant={exec.status === "completed" ? "success" : exec.status === "failed" ? "danger" : "warning"}>
                          {exec.status === "completed" ? "Concluído" : exec.status === "failed" ? "Falhou" : "Executando"}
                        </NinjaBadge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {(exec.orders as any)?.order_number && (
                          <span>Pedido #{(exec.orders as any).order_number}</span>
                        )}
                        {(exec.orders as any)?.client_name && (
                          <span>{(exec.orders as any).client_name}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" /> {exec.nodes_executed || 0} nós
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exec.executed_at ? formatDistanceToNow(new Date(exec.executed_at), { addSuffix: true, locale: ptBR }) : "—"}
                        </span>
                      </div>
                      {exec.error_message && (
                        <p className="text-xs text-destructive mt-1 truncate max-w-md">
                          ⚠ {exec.error_message}
                        </p>
                      )}
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

      {/* Template Gallery Modal */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-primary" /> Galeria de Templates
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Templates prontos para todos os status de pedido COD</p>
              </div>
              <button onClick={() => setGalleryOpen(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {galleryLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {galleryTemplates.map((tpl: any, i: number) => {
                    const existingFlow = flows.find(f => f.trigger_status === tpl.trigger_status && f.flow_type === tpl.flow_type);
                    const isCoinzz = tpl.flow_type === "coinzz";
                    return (
                      <div key={i} className="bg-muted/50 border border-border rounded-xl p-4 hover:border-primary/30 transition-all group">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-foreground text-sm">{tpl.name}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCoinzz ? (
                              <span className="text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full font-bold">COINZZ</span>
                            ) : (
                              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">LOGZZ</span>
                            )}
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              Pronto
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{tpl.description}</p>
                        <p className="text-[10px] text-muted-foreground mb-3">
                          Trigger: <span className="font-medium text-foreground">{tpl.trigger_status}</span>
                          {tpl.nodes?.length > 1 && ` · ${tpl.nodes.length} nós`}
                        </p>
                        <div className="text-[11px] text-muted-foreground bg-background rounded-lg p-2.5 max-h-20 overflow-hidden mb-3 leading-relaxed whitespace-pre-wrap">
                          {tpl.nodes?.[0]?.data?.content?.slice(0, 120)}...
                        </div>
                        {existingFlow ? (
                          <div className="w-full py-2 text-center text-xs font-medium text-muted-foreground bg-muted rounded-lg">
                            ✓ Já existe: "{existingFlow.name}"
                          </div>
                        ) : (
                          <button
                            onClick={() => useTemplate(i)}
                            disabled={creatingTemplate === i}
                            className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {creatingTemplate === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            Usar este template
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" /> Importar Fluxo
              </h2>
              <button onClick={() => { setImportOpen(false); setImportCode(""); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Cole o código Base64 exportado de outro fluxo:</p>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Cole o código aqui..."
                className="w-full min-h-[120px] rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Escolha o provedor:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleImport()}
                    disabled={!importCode.trim()}
                    className="py-2.5 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Manter original
                  </button>
                  <button
                    onClick={() => handleImport("evolution")}
                    disabled={!importCode.trim()}
                    className="py-2.5 px-3 rounded-lg border border-primary/30 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                  >
                    Evolution
                  </button>
                  <button
                    onClick={() => handleImport("official")}
                    disabled={!importCode.trim()}
                    className="py-2.5 px-3 rounded-lg border border-primary/30 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                  >
                    API Oficial
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fluxos;
