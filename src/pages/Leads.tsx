import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, Heart, MessageSquare, DollarSign, Upload, Search, LayoutGrid, List, Phone, Mail, Eye, MoreHorizontal, X, FileText, Plus, Tag, Send, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamContext } from "@/hooks/useTeamContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

const statusConfig: Record<string, { label: string; color: string }> = {
  "Confirmado": { label: "Confirmado", color: "bg-success/20 text-success border-success/30" },
  "Em Aguardo": { label: "Em Aguardo", color: "bg-warning/20 text-warning border-warning/30" },
  "Cancelado": { label: "Cancelado", color: "bg-destructive/20 text-destructive border-destructive/30" },
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const Leads = () => {
  const { user } = useAuth();
  const { effectiveUserId, canEdit, isViewer } = useTeamContext();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [leadOrders, setLeadOrders] = useState<any[]>([]);
  const [newTag, setNewTag] = useState("");

  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const filtered = useMemo(() => {
    let result = leads;
    if (activeTab !== "Todos") {
      const statusMap: Record<string, string> = { "Confirmados": "Confirmado", "Em Aguardo": "Em Aguardo", "Cancelados": "Cancelado" };
      result = result.filter(l => l.status === statusMap[activeTab]);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(s) || l.phone.includes(s) || (l.email && l.email.toLowerCase().includes(s)));
    }
    return result;
  }, [leads, activeTab, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    confirmed: leads.filter(l => l.status === "Confirmado").length,
    pending: leads.filter(l => l.status === "Em Aguardo").length,
    revenue: leads.reduce((sum, l) => sum + (Number(l.accumulated_revenue) || 0), 0),
  }), [leads]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
      setCsvData(rows.filter(r => r.some(c => c)));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user || csvData.length < 2) return;
    setImporting(true);
    const headers = csvData[0].map(h => h.toLowerCase());
    const nameIdx = headers.findIndex(h => h.includes("nome") || h.includes("name"));
    const phoneIdx = headers.findIndex(h => h.includes("telefone") || h.includes("phone") || h.includes("cel"));
    const emailIdx = headers.findIndex(h => h.includes("email"));

    if (nameIdx === -1 || phoneIdx === -1) {
      toast.error("CSV precisa ter colunas 'nome' e 'telefone'");
      setImporting(false);
      return;
    }

    const rows = csvData.slice(1).filter(r => r[nameIdx] && r[phoneIdx]);
    const inserts = rows.map(r => ({
      user_id: user.id,
      name: r[nameIdx],
      phone: r[phoneIdx],
      email: emailIdx >= 0 ? r[emailIdx] || null : null,
      status: "Em Aguardo" as string,
    }));

    const { error } = await supabase.from("leads").insert(inserts);
    if (error) toast.error("Erro ao importar: " + error.message);
    else { toast.success(`${inserts.length} leads importados!`); setShowImport(false); setCsvData([]); fetchLeads(); }
    setImporting(false);
  };

  const openLeadDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    if (user) {
      const { data } = await supabase.from("orders").select("*").eq("client_phone", lead.phone).order("created_at", { ascending: false }).limit(10);
      setLeadOrders(data || []);
    }
  };

  const addTag = async () => {
    if (!selectedLead || !newTag.trim()) return;
    const currentTags = (selectedLead.tags as string[]) || [];
    if (currentTags.includes(newTag.trim())) return;
    const updated = [...currentTags, newTag.trim()];
    await supabase.from("leads").update({ tags: updated as any }).eq("id", selectedLead.id);
    setSelectedLead({ ...selectedLead, tags: updated as any });
    setNewTag("");
    fetchLeads();
  };

  const removeTag = async (tag: string) => {
    if (!selectedLead) return;
    const currentTags = (selectedLead.tags as string[]) || [];
    const updated = currentTags.filter(t => t !== tag);
    await supabase.from("leads").update({ tags: updated as any }).eq("id", selectedLead.id);
    setSelectedLead({ ...selectedLead, tags: updated as any });
    fetchLeads();
  };

  const exportCSV = useCallback(() => {
    if (filtered.length === 0) { toast.error("Nenhum lead para exportar"); return; }
    const headers = ["Nome", "Telefone", "Email", "Status", "Receita", "Tags", "Criado em"];
    const rows = filtered.map(l => [
      l.name,
      l.phone,
      l.email || "",
      l.status || "",
      String(l.accumulated_revenue || 0),
      ((l.tags as string[]) || []).join("; "),
      l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} leads exportados!`);
  }, [filtered]);

  const tabs = ["Todos", "Confirmados", "Em Aguardo", "Cancelados"];

  const StatusBadge = ({ status }: { status: string | null }) => {
    const cfg = statusConfig[status || "Em Aguardo"] || statusConfig["Em Aguardo"];
    return <Badge variant="outline" className={`${cfg.color} border text-xs`}>{cfg.label}</Badge>;
  };

  const LeadAvatar = ({ name, className = "" }: { name: string; className?: string }) => (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{getInitials(name)}</AvatarFallback>
    </Avatar>
  );

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Gerencie seus contatos e funil de vendas em tempo real."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Leads" value={stats.total} icon={<Users className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Leads Confirmados" value={stats.confirmed} icon={<Heart className="h-6 w-6 text-success" />} iconBg="bg-success/10" />
        <StatCard label="Em Aguardo" value={stats.pending} icon={<MessageSquare className="h-6 w-6 text-warning" />} iconBg="bg-warning/10" />
        <StatCard label="Receita Acumulada" value={formatCurrency(stats.revenue)} icon={<DollarSign className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
      </div>

      {/* Filters */}
      <div className="ninja-card">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, email ou telefone"
                className="h-9 w-64 rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-card border border-border">
                {tabs.map(tab => (
                  <TabsTrigger key={tab} value={tab} className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode("grid")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${viewMode === "grid" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${viewMode === "table" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Nenhum lead encontrado"
            description="Leads aparecerão quando houver pedidos"
            action={
              <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4" /> Importar leads
              </Button>
            }
          />
        ) : viewMode === "table" ? (
          /* TABLE VIEW */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(lead => (
                  <TableRow key={lead.id} className="border-border hover:bg-muted/30 cursor-pointer" onClick={() => openLeadDetail(lead)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <LeadAvatar name={lead.name} className="h-8 w-8" />
                        <span className="font-medium text-foreground">{lead.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.email || "—"}</TableCell>
                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                    <TableCell className="text-foreground font-medium">{formatCurrency(Number(lead.accumulated_revenue) || 0)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(lead.created_at!), "dd/MM/yy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg text-success hover:bg-success/10">
                          <Phone className="h-4 w-4" />
                        </a>
                        <button onClick={() => openLeadDetail(lead)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(lead => (
              <div key={lead.id} onClick={() => openLeadDetail(lead)} className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-center gap-3 mb-3">
                  <LeadAvatar name={lead.name} className="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </div>
                </div>
                <div className="mb-3"><StatusBadge status={lead.status} /></div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Receita</span>
                  <span className="font-bold text-foreground">{formatCurrency(Number(lead.accumulated_revenue) || 0)}</span>
                </div>
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-success/10 text-xs text-success hover:bg-success/20">
                    <Phone className="h-3 w-3" /> WhatsApp
                  </a>
                  <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-muted text-xs text-foreground hover:bg-muted/80">
                    <Eye className="h-3 w-3" /> Detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IMPORT MODAL */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Importar Leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Envie um arquivo CSV com colunas: <strong>nome</strong>, <strong>telefone</strong>, email (opcional)</p>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 hover:border-primary/50 transition-colors">
              <FileText className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{csvData.length > 0 ? `${csvData.length - 1} linhas encontradas` : "Clique para selecionar CSV"}</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            {csvData.length > 1 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted">{csvData[0].map((h, i) => <th key={i} className="p-2 text-left text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>
                    {csvData.slice(1, 6).map((row, i) => (
                      <tr key={i} className="border-t border-border">{row.map((c, j) => <td key={j} className="p-2 text-foreground">{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground" onClick={handleImport} disabled={importing || csvData.length < 2}>
              {importing ? "Importando..." : `Importar ${Math.max(0, csvData.length - 1)} leads`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* LEAD DETAIL MODAL */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <LeadAvatar name={selectedLead.name} className="h-14 w-14" />
                  <div>
                    <DialogTitle className="text-foreground text-xl">{selectedLead.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={selectedLead.status} />
                      <span className="text-sm text-muted-foreground">Criado em {format(new Date(selectedLead.created_at!), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Phone className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm text-foreground font-medium">{selectedLead.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm text-foreground font-medium">{selectedLead.email || "—"}</p>
                    </div>
                  </div>
                  {selectedLead.document && (
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Documento</p>
                        <p className="text-sm text-foreground font-medium">{selectedLead.document}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <DollarSign className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Receita Acumulada</p>
                      <p className="text-sm text-foreground font-bold">{formatCurrency(Number(selectedLead.accumulated_revenue) || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {((selectedLead.tags as string[]) || []).map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Nova tag..." className="h-8 flex-1 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                    <Button size="sm" variant="outline" onClick={addTag} className="h-8"><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>

                {/* Orders History */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Histórico de Pedidos</p>
                  {leadOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhum pedido encontrado</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {leadOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">#{order.order_number || order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-foreground">{formatCurrency(Number(order.order_final_price))}</p>
                            <Badge variant="outline" className="text-xs">{order.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <a href={`https://wa.me/${selectedLead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex-1">
                    <Button className="w-full gap-2 bg-success/20 text-success hover:bg-success/30 border border-success/30">
                      <Send className="h-4 w-4" /> Enviar WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;
