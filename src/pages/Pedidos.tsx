import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search, SlidersHorizontal, RefreshCw, Phone, Eye, MoreHorizontal,
  Package, CalendarDays, MapPin, DollarSign, Printer, Truck, Clock,
  Download, X, ExternalLink, MessageSquare, Copy, Edit, Trash2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { useTeamContext } from "@/hooks/useTeamContext";

type Order = Tables<"orders">;

const STATUSES = [
  { key: "Aguardando", color: "bg-yellow-500", textColor: "text-yellow-400" },
  { key: "Confirmado", color: "bg-green-500", textColor: "text-green-400" },
  { key: "Aprovado", color: "bg-blue-500", textColor: "text-blue-400" },
  { key: "Agendado", color: "bg-purple-500", textColor: "text-purple-400" },
  { key: "Em Separação", color: "bg-orange-500", textColor: "text-orange-400" },
  { key: "Separado", color: "bg-sky-500", textColor: "text-sky-400" },
  { key: "Em Rota", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { key: "Entregue", color: "bg-green-600", textColor: "text-green-400" },
  { key: "Frustrado", color: "bg-red-500", textColor: "text-red-400" },
  { key: "Reagendar", color: "bg-amber-500", textColor: "text-amber-400" },
] as const;

const STATUS_KEYS = STATUSES.map((s) => s.key);

/* ─── CopyBtn ─── */
const CopyBtn = ({ value, label }: { value: string; label?: string }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(value);
      toast.success(label ? `${label} copiado!` : "Copiado!");
    }}
    className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
    title="Copiar"
  >
    <Copy className="h-3 w-3" />
  </button>
);

/* ─── Platform Badge ─── */
const PlatformBadge = ({ type }: { type: string | null }) => {
  if (type === "coinzz") return <Badge className="bg-purple-600 text-white border-0 text-[9px] px-1.5 py-0 font-bold">COINZZ</Badge>;
  return <Badge className="bg-emerald-500 text-white border-0 text-[9px] px-1.5 py-0 font-bold">LOGZZ</Badge>;
};

const Pedidos = () => {
  const { user } = useAuth();
  const { canEdit, canDelete, isViewer, effectiveUserId } = useTeamContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  // Edit modal
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({ client_name: "", client_phone: "", client_address: "", client_address_number: "", client_address_comp: "", client_address_district: "", client_address_city: "", client_address_state: "", client_zip_code: "", delivery_date: "" });

  // Confirm dialogs
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  // Detail modal extra data
  const [detailOffer, setDetailOffer] = useState<any>(null);
  const [detailBumps, setDetailBumps] = useState<any[]>([]);
  const [detailTimeline, setDetailTimeline] = useState<any[]>([]);

  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["orders", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user,
  });

  // Fetch checkout names for cards
  const { data: checkoutsMap } = useQuery({
    queryKey: ["checkouts-map"],
    queryFn: async () => {
      const { data } = await supabase.from("checkouts").select("id, name");
      const map: Record<string, string> = {};
      data?.forEach((c) => { map[c.id] = c.name; });
      return map;
    },
    enabled: !!user,
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Fetch detail data when selectedOrder changes
  useEffect(() => {
    if (!selectedOrder) { setDetailOffer(null); setDetailBumps([]); setDetailTimeline([]); return; }
    // Offer
    if (selectedOrder.offer_id) {
      supabase.from("offers").select("*").eq("id", selectedOrder.offer_id).maybeSingle().then(({ data }) => setDetailOffer(data));
      supabase.from("order_bumps").select("*").eq("offer_id", selectedOrder.offer_id).eq("is_active", true).then(({ data }) => setDetailBumps(data || []));
    } else { setDetailOffer(null); setDetailBumps([]); }
    // Timeline
    supabase.from("order_status_history").select("*").eq("order_id", selectedOrder.id).order("created_at", { ascending: true }).then(({ data }) => setDetailTimeline(data || []));
  }, [selectedOrder]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, fromStatus }: { id: string; status: string; fromStatus?: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      supabase.from("order_status_history").insert({ order_id: id, from_status: fromStatus || null, to_status: status, source: "kanban_drag" }).then(() => {});
      if (user) {
        supabase.functions.invoke("trigger-flow", { body: { userId: user.id, orderId: id, newStatus: status } }).catch(() => {});
      }
    },
    onError: (e: any) => { toast.error("Erro ao mover pedido: " + e.message); queryClient.invalidateQueries({ queryKey: ["orders"] }); },
  });

  // Cancel order
  const cancelMutation = useMutation({
    mutationFn: async (order: Order) => {
      const { error } = await supabase.from("orders").update({ status: "Frustrado" }).eq("id", order.id);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: order.id, from_status: order.status, to_status: "Frustrado", source: "cancelamento_manual" });
      // Trigger WhatsApp flow for cancellation
      try {
        await supabase.functions.invoke("trigger-flow", {
          body: { userId: user?.id, orderId: order.id, newStatus: "Frustrado", triggerEvent: "order_status_changed" },
        });
      } catch (e) {
        console.error("[Pedidos] trigger-flow cancel error:", e);
      }
    },
    onSuccess: () => { toast.success("Pedido cancelado (Frustrado)"); queryClient.invalidateQueries({ queryKey: ["orders"] }); setCancelTarget(null); },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete order
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pedido apagado"); queryClient.invalidateQueries({ queryKey: ["orders"] }); setDeleteTarget(null); if (selectedOrder && deleteTarget && selectedOrder.id === deleteTarget.id) setSelectedOrder(null); },
    onError: (e: any) => toast.error(e.message),
  });

  // Edit order
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editOrder) return;
      const { error } = await supabase.from("orders").update({
        client_name: editForm.client_name, client_phone: editForm.client_phone,
        client_address: editForm.client_address, client_address_number: editForm.client_address_number,
        client_address_comp: editForm.client_address_comp, client_address_district: editForm.client_address_district,
        client_address_city: editForm.client_address_city, client_address_state: editForm.client_address_state,
        client_zip_code: editForm.client_zip_code,
        delivery_date: editForm.delivery_date || null,
      }).eq("id", editOrder.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pedido atualizado!"); queryClient.invalidateQueries({ queryKey: ["orders"] }); setEditOrder(null); },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(order: Order) {
    setEditForm({
      client_name: order.client_name, client_phone: order.client_phone,
      client_address: order.client_address, client_address_number: order.client_address_number,
      client_address_comp: order.client_address_comp || "", client_address_district: order.client_address_district,
      client_address_city: order.client_address_city, client_address_state: order.client_address_state,
      client_zip_code: order.client_zip_code, delivery_date: order.delivery_date || "",
    });
    setEditOrder(order);
  }

  // Filter orders
  const filtered = useMemo(() => {
    let result = orders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((o) => o.client_name.toLowerCase().includes(q) || o.order_number?.toLowerCase().includes(q) || o.client_phone.includes(q) || o.id.toLowerCase().includes(q));
    }
    if (activeFilter) result = result.filter((o) => o.status === activeFilter);
    if (filterDateFrom) result = result.filter((o) => o.created_at && o.created_at >= filterDateFrom);
    if (filterDateTo) result = result.filter((o) => o.created_at && o.created_at <= filterDateTo + "T23:59:59");
    if (filterProvider && filterProvider !== "all") result = result.filter((o) => o.logistics_type === filterProvider);
    if (filterCity) result = result.filter((o) => o.client_address_city.toLowerCase().includes(filterCity.toLowerCase()));
    if (filterPayment) result = result.filter((o) => o.payment_method?.toLowerCase() === filterPayment.toLowerCase());
    return result;
  }, [orders, search, activeFilter, filterDateFrom, filterDateTo, filterProvider, filterCity, filterPayment]);

  const columns = useMemo(() => {
    const map: Record<string, Order[]> = {};
    STATUS_KEYS.forEach((s) => (map[s] = []));
    filtered.forEach((o) => { if (map[o.status]) map[o.status].push(o); else if (map["Aguardando"]) map["Aguardando"].push(o); });
    return map;
  }, [filtered]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    STATUS_KEYS.forEach((s) => (c[s] = 0));
    orders.forEach((o) => { if (c[o.status] !== undefined) c[o.status]++; });
    return c;
  }, [orders]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const fromStatus = result.source.droppableId;
    const orderId = result.draggableId;
    if (fromStatus === newStatus) return;
    queryClient.setQueryData<Order[]>(["orders"], (old) => old?.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    updateStatusMutation.mutate({ id: orderId, status: newStatus, fromStatus });
    toast.success(`Pedido movido para ${newStatus}`);
  }, [queryClient, updateStatusMutation]);

  function exportCSV() {
    if (filtered.length === 0) return toast.error("Nenhum pedido para exportar");
    const headers = ["Número", "Status", "Cliente", "Telefone", "Cidade", "UF", "Valor", "Data"];
    const rows = filtered.map((o) => [o.order_number || o.id.slice(0, 8), o.status, o.client_name, o.client_phone, o.client_address_city, o.client_address_state, Number(o.order_final_price).toFixed(2), o.created_at ? new Date(o.created_at).toLocaleDateString("pt-BR") : ""]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  }

  const statusMeta = (key: string) => STATUSES.find((s) => s.key === key) || STATUSES[0];

  const fullAddress = (o: Order) => `${o.client_address}, ${o.client_address_number}${o.client_address_comp ? ` - ${o.client_address_comp}` : ""}, ${o.client_address_district}, ${o.client_address_city}/${o.client_address_state} — CEP ${o.client_zip_code}`;

    const hasAdvancedFilters = !!filterDateFrom || !!filterDateTo || (!!filterProvider && filterProvider !== "all") || !!filterCity || !!filterPayment;

    return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Quadro de Pedidos"
        subtitle="Gerencie o fluxo operacional em tempo real"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="border-border text-muted-foreground"><Download className="h-4 w-4 mr-1.5" /> Exportar</Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /></Button>
          </div>
        }
      />

      {/* Search + Filtros Avançados button */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedidos, clientes ou IDs..." className="h-10 w-full rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`border-border text-muted-foreground relative ${hasAdvancedFilters ? "border-primary/50" : ""}`}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1.5" />
          Filtros Avançados
          {hasAdvancedFilters && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />}
          {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
        </Button>
      </div>

      {/* Inline Advanced Filters Panel */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <div className="mb-3 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Plataforma */}
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Plataforma</span>
                <div className="flex gap-1.5">
                  {[
                    { value: "", label: "Todos" },
                    { value: "logzz", label: "Logzz" },
                    { value: "coinzz", label: "Coinzz" },
                    { value: "cod", label: "COD" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setFilterProvider(filterProvider === p.value ? "" : p.value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors border ${
                        (filterProvider === p.value || (p.value === "" && !filterProvider))
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data De */}
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Data início</span>
                <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="bg-input border-border h-9 w-[150px] text-xs" />
              </div>

              <span className="text-xs text-muted-foreground pb-2">até</span>

              {/* Data Até */}
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Data fim</span>
                <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="bg-input border-border h-9 w-[150px] text-xs" />
              </div>

              {/* Cidade */}
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Cidade</span>
                <Input value={filterCity} onChange={(e) => setFilterCity(e.target.value)} placeholder="Ex: São Paulo" className="bg-input border-border h-9 w-[160px] text-xs" />
              </div>

              {/* Método de Pagamento */}
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Pagamento</span>
                <div className="flex gap-1.5">
                  {[
                    { value: "", label: "Todos" },
                    { value: "pix", label: "PIX" },
                    { value: "credit_card", label: "Cartão" },
                    { value: "boleto", label: "Boleto" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setFilterPayment(filterPayment === p.value ? "" : p.value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors border ${
                        (filterPayment === p.value || (p.value === "" && !filterPayment))
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limpar */}
              {hasAdvancedFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterProvider(""); setFilterCity(""); setFilterPayment(""); }}
                  className="text-destructive hover:text-destructive h-9"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Status summary bar (clickable) */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* "Todos" chip */}
        <button
          onClick={() => setActiveFilter(null)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
            activeFilter === null
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-secondary"
          }`}
        >
          Todos
          <span className="ml-0.5 font-bold">{orders.length}</span>
        </button>
        {STATUSES.map((s) => (
          <button key={s.key} onClick={() => setActiveFilter(activeFilter === s.key ? null : s.key)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${activeFilter === s.key ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
            <span className={`h-2 w-2 rounded-full ${s.color}`} />
            {s.key}
            <span className="ml-0.5 font-bold">{statusCounts[s.key] || 0}</span>
          </button>
        ))}
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {STATUS_KEYS.slice(0, 5).map((c) => (
            <div key={c} className="min-w-[280px] flex-1 space-y-3">
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-32 animate-pulse rounded-xl bg-muted/50" />
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
            {STATUS_KEYS.map((status) => {
              const meta = statusMeta(status);
              const items = columns[status] || [];
              return (
                <div key={status} className="min-w-[270px] w-[270px] flex flex-col">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.color}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{status}</h3>
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center text-[10px] font-bold bg-muted text-muted-foreground">{items.length}</Badge>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 rounded-xl border p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-340px)] overflow-y-auto transition-colors ${snapshot.isDraggingOver ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card/30"}`}>
                        {items.length === 0 && !snapshot.isDraggingOver && <p className="text-xs text-muted-foreground text-center py-8">Mova cards para aqui</p>}
                        {items.map((order, index) => (
                          <Draggable key={order.id} draggableId={order.id} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`rounded-lg border bg-card p-3 transition-shadow cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "shadow-lg shadow-primary/10 border-primary/30" : "border-border hover:border-primary/20"}`}>
                                {/* ── Card Header: Order # + platform + link ── */}
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {order.logistics_type === "coinzz" && order.coinzz_order_hash ? (
                                      <a href={`https://app.coinzz.com.br/pedido/${order.coinzz_order_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-purple-400 font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>#{order.order_number || order.coinzz_order_hash}</a>
                                    ) : order.logistics_type === "logzz" && order.logzz_order_id ? (
                                      <a href={`https://app.logzz.com.br/meu-pedido/${order.logzz_order_id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-emerald-400 font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>#{order.order_number || order.logzz_order_id}</a>
                                    ) : (
                                      <span className="text-xs font-mono text-primary font-semibold">#{order.order_number || order.id.slice(0, 8)}</span>
                                    )}
                                    <PlatformBadge type={order.logistics_type} />
                                  </div>
                                  <Badge className={`text-[10px] ${meta.color} text-white border-0 px-1.5 py-0`}>{order.status}</Badge>
                                </div>
                                {/* Nome cliente MAIÚSCULO */}
                                <p className="text-sm font-bold text-foreground truncate mb-0.5 uppercase">{order.client_name}</p>
                                {/* Nome do produto (checkout name) */}
                                {order.checkout_id && checkoutsMap?.[order.checkout_id] && (
                                  <p className="text-[11px] text-muted-foreground truncate mb-1.5">{checkoutsMap[order.checkout_id]}</p>
                                )}
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  {/* Tempo em Aguardando */}
                                  {order.status === "Aguardando" && order.created_at && (() => {
                                    const hoursAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60));
                                    const daysAgo = Math.floor(hoursAgo / 24);
                                    const isUrgent = hoursAgo >= 12;
                                    const label = daysAgo >= 1 ? `há ${daysAgo}d` : `há ${hoursAgo}h`;
                                    return (
                                      <div className={`flex items-center gap-1.5 ${isUrgent ? "text-red-400" : "text-amber-400"}`}>
                                        <AlertTriangle className="h-3 w-3 shrink-0" />
                                        <span className="font-semibold text-[10px]">{label} aguardando{isUrgent ? " ⚠️" : ""}</span>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3 shrink-0" /><span className="font-semibold text-foreground">R$ {Number(order.order_final_price).toFixed(2)}</span></div>
                                  {/* Data agendamento — APENAS Logzz */}
                                  {order.logistics_type === "logzz" && order.delivery_date && (
                                    <div className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3 shrink-0 text-amber-400" /><span className="text-amber-400 font-medium">{new Date(order.delivery_date).toLocaleDateString("pt-BR")}</span></div>
                                  )}
                                  {/* Forma de pagamento — APENAS Coinzz */}
                                  {order.logistics_type === "coinzz" && order.payment_method && (
                                    <div className="flex items-center gap-1.5"><span className="text-[10px]">💳</span><span className="text-purple-400 font-medium capitalize">{order.payment_method}</span></div>
                                  )}
                                  <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{order.client_address_city}/{order.client_address_state}</span></div>
                                  <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" /><span>{order.created_at ? new Date(order.created_at).toLocaleDateString("pt-BR") + " " + new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</span></div>
                                </div>
                                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${order.client_phone.replace(/\D/g, "")}`, "_blank"); }}>
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  {order.logistics_type === "logzz" && !order.logzz_order_id && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" title="Enviar para Logzz" onClick={async (e) => {
                                      e.stopPropagation();
                                      toast.loading("Enviando para Logzz...", { id: `logzz-${order.id}` });
                                      try {
                                        const { data, error } = await supabase.functions.invoke("checkout-api", { body: { action: "send_to_logzz", order_id: order.id, user_id: user?.id } });
                                        if (error) throw error;
                                        if (data?.success) { toast.success(`Pedido enviado! ID: ${data.logzz_order_id || "OK"}`, { id: `logzz-${order.id}` }); refetch(); }
                                        else toast.error(`Erro Logzz: ${(data?.logzz_error || data?.logzz_response || data?.error || "falha").slice(0, 100)}`, { id: `logzz-${order.id}` });
                                      } catch (err: any) { toast.error(`Erro: ${err.message}`, { id: `logzz-${order.id}` }); }
                                    }}>
                                      <Truck className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {/* Botão Enviar para Coinzz — sempre visível para pedidos coinzz */}
                                  {order.logistics_type === "coinzz" && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-purple-500" title="Enviar para Coinzz" onClick={async (e) => {
                                      e.stopPropagation();
                                      toast.loading("Enviando para Coinzz...", { id: `coinzz-${order.id}` });
                                      try {
                                        const { data, error } = await supabase.functions.invoke("checkout-api", { body: { action: "create_coinzz_order", order_id: order.id, user_id: user?.id } });
                                        if (error) throw error;
                                        if (data?.success) { toast.success(`Pedido enviado! Hash: ${data.coinzz_order_hash || "OK"}`, { id: `coinzz-${order.id}` }); refetch(); }
                                        else toast.error(`Erro Coinzz: ${(data?.error || "falha").slice(0, 100)}`, { id: `coinzz-${order.id}` });
                                      } catch (err: any) { toast.error(`Erro: ${err.message}`, { id: `coinzz-${order.id}` }); }
                                    }}>
                                      <Truck className="h-3.5 w-3.5 text-purple-400" />
                                    </Button>
                                  )}
                                  {/* ─── Dropdown "..." ─── */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground ml-auto" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => setSelectedOrder(order)}>👁️ Ver Detalhes</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEdit(order)}>✏️ Editar Pedido</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setCancelTarget(order)} className="text-amber-500 focus:text-amber-500">❌ Cancelar Pedido</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setDeleteTarget(order)} className="text-destructive focus:text-destructive">🗑️ Apagar Pedido</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* ─── Order Detail Modal ─── */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => { if (!o) setSelectedOrder(null); }}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border max-h-[85vh] overflow-y-auto">
          {selectedOrder && (() => {
            const o = orders.find(ord => ord.id === selectedOrder.id) || selectedOrder;
            const shippingVal = Number(o.shipping_value || 0);
            const offerPrice = detailOffer ? Number(detailOffer.price) : null;
            const bumpsTotal = detailBumps.reduce((s, b) => s + Number(b.current_price || b.price || 0), 0);
            const isLogzz = o.logistics_type !== "coinzz";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-foreground flex items-center gap-2 flex-wrap">
                    Pedido #{o.order_number || o.id.slice(0, 8)} <CopyBtn value={o.order_number || o.id.slice(0, 8)} />
                    <PlatformBadge type={o.logistics_type} />
                    <Badge className={`${statusMeta(o.status).color} text-white border-0`}>{o.status}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="info" className="mt-2">
                  <TabsList className="bg-secondary border border-border w-full">
                    <TabsTrigger value="info" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Informações</TabsTrigger>
                    <TabsTrigger value="logistics" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Logística</TabsTrigger>
                    <TabsTrigger value="timeline" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Timeline</TabsTrigger>
                  </TabsList>

                  {/* ── INFO TAB ── */}
                  <TabsContent value="info" className="space-y-4 mt-4">
                    {/* Cliente */}
                    <div className="rounded-lg border border-border bg-secondary/50 p-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">👤 Cliente</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                        <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Nome:</span><span className="text-foreground font-medium">{o.client_name}</span><CopyBtn value={o.client_name} label="Nome" /></div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Tel:</span>
                          <a href={`https://wa.me/${o.client_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline font-medium">{o.client_phone}</a>
                          <CopyBtn value={o.client_phone} label="Telefone" />
                        </div>
                        
                        {o.client_document && <div className="flex items-center gap-1.5"><span className="text-muted-foreground">CPF/CNPJ:</span><span className="text-foreground">{o.client_document}</span><CopyBtn value={o.client_document} label="Documento" /></div>}
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="rounded-lg border border-border bg-secondary/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground">📍 Endereço</h4>
                        <CopyBtn value={fullAddress(o)} label="Endereço completo" />
                      </div>
                      <p className="text-sm text-foreground">{o.client_address}, {o.client_address_number}{o.client_address_comp ? ` - ${o.client_address_comp}` : ""}</p>
                      <p className="text-sm text-muted-foreground">{o.client_address_district} — {o.client_address_city}/{o.client_address_state} — CEP {o.client_zip_code}</p>
                    </div>

                    {/* Data de Agendamento */}
                    {o.delivery_date && (
                      <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-4">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">📅 Agendamento de Entrega</h4>
                        <p className="text-2xl font-bold text-foreground">
                          {new Date(o.delivery_date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    )}

                    {/* Produtos / Oferta */}
                    <div className="rounded-lg border border-border bg-secondary/50 p-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">📦 Produtos do Pedido</h4>
                      {detailOffer ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground font-medium">{detailOffer.name}</span>
                            <span className="text-foreground">x{o.order_quantity || 1} — R$ {Number(detailOffer.price).toFixed(2)}</span>
                          </div>
                          {detailBumps.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-bold uppercase text-emerald-400">Order Bumps ({detailBumps.length})</p>
                              {detailBumps.map((b) => (
                                <div key={b.id} className="flex justify-between text-sm border border-emerald-500/30 rounded-md p-2 bg-emerald-500/5">
                                  <div>
                                    <span className="text-foreground font-medium">{b.name}</span>
                                    {b.label_bump && <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 text-[10px] border-0">{b.label_bump}</Badge>}
                                  </div>
                                  <span className="text-foreground">R$ {Number(b.current_price || b.price || 0).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Qtd: {o.order_quantity || 1}</p>
                      )}
                    </div>

                     {/* Financeiro */}
                    <div className="rounded-lg border border-border bg-secondary/50 p-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">💰 Financeiro</h4>
                      <div className="space-y-2 text-sm">
                        {offerPrice !== null && <div className="flex justify-between"><span className="text-muted-foreground">Produto principal</span><span className="text-foreground">R$ {offerPrice.toFixed(2)}</span></div>}
                        {bumpsTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Order Bumps ({detailBumps.length})</span><span className="text-foreground">R$ {bumpsTotal.toFixed(2)}</span></div>}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Frete</span>
                          {shippingVal === 0 ? <Badge className="bg-emerald-500 text-white border-0 text-xs">🟢 FRETE GRÁTIS!</Badge> : <span className="text-foreground">R$ {shippingVal.toFixed(2)}</span>}
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 mt-2">
                          <span className="font-bold text-foreground text-base">Total do Pedido</span>
                          <span className="font-bold text-primary text-xl">R$ {Number(o.order_final_price).toFixed(2)}</span>
                        </div>

                        {/* Forma de pagamento */}
                        <div className="mt-3 p-2.5 rounded-md bg-muted/50 border border-border space-y-2">
                          {isLogzz
                            ? <span className="text-sm font-semibold text-amber-400">💵 PAGAMENTO NA ENTREGA</span>
                            : (
                              <div className="space-y-1.5">
                                <span className="text-sm font-semibold text-purple-400">💳 PAGAMENTO ONLINE — ENTREGA VIA CORREIOS</span>

                                {/* Status de pagamento MercadoPago */}
                                {(() => {
                                  // Fallback: parse status_description "MP: status - detail"
                                  let mpStatus = o.mp_payment_status || null;
                                  let mpDetail = o.mp_payment_status_detail || null;
                                  if (!mpStatus && o.status_description) {
                                    const match = o.status_description.match(/^MP:\s*(\w+)\s*-\s*(.+)$/i);
                                    if (match) {
                                      mpStatus = match[1].trim().toLowerCase();
                                      mpDetail = match[2].trim().toLowerCase();
                                    }
                                  }
                                  if (!mpStatus) {
                                    return (
                                      <div className="mt-1.5">
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-muted-foreground">Status:</span>
                                          <Badge className="text-[10px] border bg-muted text-muted-foreground border-border">Status não informado</Badge>
                                        </div>
                                      </div>
                                    );
                                  }
                                  const mpStatusLabels: Record<string, string> = {
                                    approved: "Pagamento Aprovado",
                                    pending: "Pagamento Pendente",
                                    authorized: "Pagamento Autorizado",
                                    in_process: "Em Processamento",
                                    in_mediation: "Em Mediação",
                                    rejected: "Pagamento Rejeitado",
                                    cancelled: "Pagamento Cancelado",
                                    refunded: "Reembolsado",
                                    charged_back: "Chargeback",
                                  };
                                  const mpStatusColors: Record<string, string> = {
                                    approved: "bg-green-500/15 text-green-400 border-green-500/30",
                                    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
                                    authorized: "bg-blue-500/15 text-blue-400 border-blue-500/30",
                                    in_process: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
                                    in_mediation: "bg-orange-500/15 text-orange-400 border-orange-500/30",
                                    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
                                    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
                                    refunded: "bg-blue-500/15 text-blue-400 border-blue-500/30",
                                    charged_back: "bg-red-500/15 text-red-400 border-red-500/30",
                                  };
                                  const mpDetailLabels: Record<string, string> = {
                                    accredited: "Pagamento acreditado",
                                    pending_contingency: "Pendente — contingência",
                                    pending_review_manual: "Pendente — revisão manual",
                                    pending_waiting_payment: "Aguardando pagamento",
                                    pending_waiting_for_remedy: "Aguardando correção",
                                    pending_waiting_transfer: "Aguardando transferência",
                                    cc_rejected_bad_filled_card_number: "Número do cartão incorreto",
                                    cc_rejected_bad_filled_date: "Data do cartão incorreta",
                                    cc_rejected_bad_filled_other: "Dados do cartão incorretos",
                                    cc_rejected_bad_filled_security_code: "CVV incorreto",
                                    cc_rejected_blacklist: "Cartão na lista negra",
                                    cc_rejected_call_for_authorize: "Autorização necessária",
                                    cc_rejected_card_disabled: "Cartão desativado",
                                    cc_rejected_card_error: "Erro no cartão",
                                    cc_rejected_duplicated_payment: "Pagamento duplicado",
                                    cc_rejected_high_risk: "Risco elevado — rejeitado",
                                    cc_rejected_insufficient_amount: "Saldo insuficiente",
                                    cc_rejected_invalid_installments: "Parcelas inválidas",
                                    cc_rejected_max_attempts: "Tentativas excedidas",
                                    cc_rejected_other_reason: "Rejeitado pelo banco",
                                    partially_refunded: "Reembolso parcial",
                                    bank_rejected: "Rejeitado pelo banco",
                                    expired: "Pagamento expirado",
                                  };
                                  const colorClass = mpStatusColors[mpStatus] || "bg-muted text-muted-foreground border-border";
                                  return (
                                    <div className="mt-1.5 space-y-1.5">
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge className={`text-[10px] border ${colorClass}`}>
                                          {mpStatusLabels[mpStatus] || mpStatus}
                                        </Badge>
                                      </div>
                                      {mpDetail && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-muted-foreground">Detalhe:</span>
                                          <span className="text-foreground text-[11px]">{mpDetailLabels[mpDetail] || mpDetail}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {o.payment_method && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Método:</span>
                                    <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px] capitalize">{
                                      o.payment_method === "pix" ? "PIX" :
                                      o.payment_method === "credit_card" ? "Cartão de Crédito" :
                                      o.payment_method === "debit_card" ? "Cartão de Débito" :
                                      o.payment_method === "bolbradesco" || o.payment_method === "boleto" ? "Boleto Bancário" :
                                      o.payment_method === "account_money" ? "Saldo MercadoPago" :
                                      o.payment_method
                                    }</Badge>
                                  </div>
                                )}
                                {o.total_installments && o.total_installments > 1 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Parcelas:</span>
                                    <span className="text-foreground font-medium">{o.total_installments}x</span>
                                  </div>
                                )}
                                {o.gateway_fee && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Taxa gateway:</span>
                                    <span className="text-foreground">R$ {Number(o.gateway_fee).toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>

                        {/* Coinzz statuses */}
                        {!isLogzz && (o.coinzz_payment_status || o.coinzz_shipping_status) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {o.coinzz_payment_status && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground">Pgto Coinzz:</span>
                                <Badge variant="outline" className="text-[10px] border-border">{o.coinzz_payment_status}</Badge>
                              </div>
                            )}
                            {o.coinzz_shipping_status && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground">Envio Coinzz:</span>
                                <Badge variant="outline" className="text-[10px] border-border">{o.coinzz_shipping_status}</Badge>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── LOGISTICS TAB ── */}
                  <TabsContent value="logistics" className="space-y-4 mt-4">
                    <div className="rounded-lg border border-border bg-secondary/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground">🚚 Logística</h4>
                        <PlatformBadge type={o.logistics_type} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {o.delivery_date && <div><span className="text-muted-foreground">Entrega:</span> <span className="text-foreground">{new Date(o.delivery_date).toLocaleDateString("pt-BR")}</span></div>}
                        {o.delivery_type_name && <div><span className="text-muted-foreground">Tipo:</span> <span className="text-foreground">{o.delivery_type_name}</span></div>}
                        {o.tracking_code && <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Rastreio:</span><span className="text-primary font-mono">{o.tracking_code}</span><CopyBtn value={o.tracking_code} label="Rastreio" /></div>}
                        {o.delivery_man && <div><span className="text-muted-foreground">Entregador:</span> <span className="text-foreground">{o.delivery_man}</span></div>}
                        {o.logistic_operator && <div><span className="text-muted-foreground">Operador:</span> <span className="text-foreground">{o.logistic_operator}</span></div>}
                        {o.logzz_order_id ? (
                          <div className="col-span-2 flex items-center gap-1.5">
                            <span className="text-muted-foreground">Pedido Logzz:</span>
                            <a href={`https://app.logzz.com.br/meu-pedido/${o.logzz_order_id}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-mono font-medium inline-flex items-center gap-1">#{o.logzz_order_id}<ExternalLink className="h-3 w-3" /></a>
                            <CopyBtn value={o.logzz_order_id} label="ID Logzz" />
                          </div>
                        ) : o.logistics_type === "logzz" && o.status !== "Cancelado" ? (
                          <div className="col-span-2 space-y-2">
                            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
                              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs text-warning font-medium block">Logzz: Sincronização pendente</span>
                                {(() => {
                                  const errEntry = detailTimeline.find((ev: any) => ev.to_status === "logzz_error");
                                  if (errEntry?.raw_payload) {
                                    const errMsg = (errEntry.raw_payload as any)?.logzz_error || (errEntry.raw_payload as any)?.logzz_body?.substring(0, 200);
                                    if (errMsg) return <span className="text-[10px] text-warning/80 block mt-0.5">Erro: {errMsg}</span>;
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-warning/30 text-warning hover:bg-warning/10 w-full"
                              onClick={async () => {
                                toast.loading("Reenviando para Logzz...", { id: `logzz-retry-${o.id}` });
                                try {
                                  const { data, error } = await supabase.functions.invoke("logzz-create-order", { body: { order_id: o.id, user_id: user?.id } });
                                  if (error) throw error;
                                  if (data?.success) {
                                    toast.success(`Pedido sincronizado! ID: ${data.logzz_order_id || "OK"}`, { id: `logzz-retry-${o.id}` });
                                    refetch();
                                    supabase.from("orders").select("*").eq("id", o.id).single().then(({ data: refreshed }) => { if (refreshed) setSelectedOrder(refreshed as Order); });
                                  } else {
                                    toast.error(`Erro: ${(data?.logzz_error || data?.logzz_response || "falha").slice(0, 150)}`, { id: `logzz-retry-${o.id}` });
                                    supabase.from("order_status_history").select("*").eq("order_id", o.id).order("created_at", { ascending: true }).then(({ data: tl }) => setDetailTimeline(tl || []));
                                  }
                                } catch (err: any) { toast.error(`Erro: ${err.message}`, { id: `logzz-retry-${o.id}` }); }
                              }}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reenviar para Logzz
                            </Button>
                          </div>
                        ) : null}
                        {/* Coinzz section */}
                        {o.coinzz_order_hash ? (
                          <div className="col-span-2 flex items-center gap-1.5">
                            <span className="text-muted-foreground">Pedido Coinzz:</span>
                            <a href={`https://app.coinzz.com.br/pedido/${o.coinzz_order_hash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline font-mono font-medium inline-flex items-center gap-1">#{o.coinzz_order_hash}<ExternalLink className="h-3 w-3" /></a>
                            <CopyBtn value={o.coinzz_order_hash} label="Hash Coinzz" />
                          </div>
                        ) : o.logistics_type === "coinzz" && o.status !== "Frustrado" ? (
                          <div className="col-span-2 space-y-2">
                            <div className="flex items-center gap-2 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-2">
                              <AlertTriangle className="h-4 w-4 text-purple-400 shrink-0" />
                              <span className="text-xs text-purple-400 font-medium">Coinzz: Sincronização pendente</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 w-full"
                              onClick={async () => {
                                toast.loading("Enviando para Coinzz...", { id: `coinzz-retry-${o.id}` });
                                try {
                                  const { data, error } = await supabase.functions.invoke("checkout-api", { body: { action: "create_coinzz_order", order_id: o.id, user_id: user?.id } });
                                  if (error) throw error;
                                  if (data?.success) {
                                    toast.success(`Pedido enviado! Hash: ${data.coinzz_order_hash || "OK"}`, { id: `coinzz-retry-${o.id}` });
                                    refetch();
                                    supabase.from("orders").select("*").eq("id", o.id).single().then(({ data: refreshed }) => { if (refreshed) setSelectedOrder(refreshed as Order); });
                                  } else {
                                    toast.error(`Erro: ${(data?.error || "falha").slice(0, 150)}`, { id: `coinzz-retry-${o.id}` });
                                  }
                                } catch (err: any) { toast.error(`Erro: ${err.message}`, { id: `coinzz-retry-${o.id}` }); }
                              }}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Enviar para Coinzz
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {/* Labels */}
                    <div className="flex gap-3">
                      {o.label_a4_url && <Button variant="outline" size="sm" className="border-border" onClick={() => window.open(o.label_a4_url!, "_blank")}><Printer className="h-4 w-4 mr-1.5" /> Etiqueta A4</Button>}
                      {o.label_thermal_url && <Button variant="outline" size="sm" className="border-border" onClick={() => window.open(o.label_thermal_url!, "_blank")}><Printer className="h-4 w-4 mr-1.5" /> Etiqueta Térmica</Button>}
                      {!o.label_a4_url && !o.label_thermal_url && <p className="text-sm text-muted-foreground">Nenhuma etiqueta disponível.</p>}
                    </div>
                  </TabsContent>

                  {/* ── TIMELINE TAB ── */}
                  <TabsContent value="timeline" className="mt-4">
                    <div className="space-y-3">
                      {/* Fixed creation event */}
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-3 w-3 rounded-full bg-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Pedido criado</p>
                          <p className="text-xs text-muted-foreground">{o.created_at ? new Date(o.created_at).toLocaleString("pt-BR") : "—"}</p>
                        </div>
                      </div>
                      {/* Real timeline entries */}
                      {detailTimeline.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-3">
                          <div className="mt-1 h-3 w-3 rounded-full bg-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm text-foreground">
                              {ev.from_status && <Badge variant="outline" className="text-[10px] mr-1 border-border">{ev.from_status}</Badge>}
                              <span className="text-muted-foreground mx-1">→</span>
                              <Badge className={`${statusMeta(ev.to_status).color} text-white border-0 text-[10px]`}>{ev.to_status}</Badge>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ev.created_at ? new Date(ev.created_at).toLocaleString("pt-BR") : "—"} • <span className="capitalize">{ev.source?.replace(/_/g, " ")}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                      {detailTimeline.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação registrada ainda.</p>
                      )}
                      {o.status_description && (
                        <div className="rounded-lg border border-border bg-secondary/50 p-3 mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Observação</p>
                          <p className="text-sm text-foreground">{o.status_description}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Edit Modal ─── */}
      <Dialog open={!!editOrder} onOpenChange={(o) => { if (!o) setEditOrder(null); }}>
        <DialogContent className="sm:max-w-[520px] bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground">✏️ Editar Pedido #{editOrder?.order_number || editOrder?.id?.slice(0, 8)}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div><Label className="text-xs text-muted-foreground">Nome</Label><Input value={editForm.client_name} onChange={(e) => setEditForm(f => ({ ...f, client_name: e.target.value }))} className="bg-input border-border mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Telefone</Label><Input value={editForm.client_phone} onChange={(e) => setEditForm(f => ({ ...f, client_phone: e.target.value }))} className="bg-input border-border mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Rua</Label><Input value={editForm.client_address} onChange={(e) => setEditForm(f => ({ ...f, client_address: e.target.value }))} className="bg-input border-border mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Número</Label><Input value={editForm.client_address_number} onChange={(e) => setEditForm(f => ({ ...f, client_address_number: e.target.value }))} className="bg-input border-border mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Complemento</Label><Input value={editForm.client_address_comp} onChange={(e) => setEditForm(f => ({ ...f, client_address_comp: e.target.value }))} className="bg-input border-border mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Bairro</Label><Input value={editForm.client_address_district} onChange={(e) => setEditForm(f => ({ ...f, client_address_district: e.target.value }))} className="bg-input border-border mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Cidade</Label><Input value={editForm.client_address_city} onChange={(e) => setEditForm(f => ({ ...f, client_address_city: e.target.value }))} className="bg-input border-border mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">UF</Label><Input value={editForm.client_address_state} onChange={(e) => setEditForm(f => ({ ...f, client_address_state: e.target.value }))} maxLength={2} className="bg-input border-border mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">CEP</Label><Input value={editForm.client_zip_code} onChange={(e) => setEditForm(f => ({ ...f, client_zip_code: e.target.value }))} className="bg-input border-border mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Data de Entrega</Label><Input type="date" value={editForm.delivery_date} onChange={(e) => setEditForm(f => ({ ...f, delivery_date: e.target.value }))} className="bg-input border-border mt-1" /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOrder(null)} className="border-border">Cancelar</Button>
            <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending} className="gradient-primary text-primary-foreground">{editMutation.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Cancel AlertDialog ─── */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">❌ Cancelar Pedido?</AlertDialogTitle>
            <AlertDialogDescription>O pedido #{cancelTarget?.order_number || cancelTarget?.id?.slice(0, 8)} será movido para <span className="font-bold text-red-400">Frustrado</span>. Esta ação pode ser revertida movendo o card manualmente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget)} className="bg-red-600 hover:bg-red-700 text-white">Confirmar Cancelamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete AlertDialog ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">🗑️ Apagar Pedido Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>O pedido #{deleteTarget?.order_number || deleteTarget?.id?.slice(0, 8)} de <span className="font-bold">{deleteTarget?.client_name}</span> será removido do banco de dados. <span className="text-red-400 font-bold">Esta ação é irreversível.</span></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-red-600 hover:bg-red-700 text-white">Apagar Definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Pedidos;
