import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search, SlidersHorizontal, RefreshCw, Phone, Eye, MoreHorizontal,
  Package, CalendarDays, MapPin, DollarSign, Printer, Truck, Clock,
  Download, X, ExternalLink, MessageSquare,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

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

const Pedidos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterCity, setFilterCity] = useState("");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders"],
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

  // Realtime subscription
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, fromStatus }: { id: string; status: string; fromStatus?: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      // Record status history
      supabase.from("order_status_history").insert({
        order_id: id,
        from_status: fromStatus || null,
        to_status: status,
        source: "kanban_drag",
      }).then(({ error: histErr }) => {
        if (histErr) console.warn("Status history insert error:", histErr);
      });

      // Trigger automation flows for this status change
      if (user) {
        console.log(`[Kanban] Triggering flow for status=${status} orderId=${id}`);
        supabase.functions.invoke("trigger-flow", {
          body: { userId: user.id, orderId: id, newStatus: status },
        }).catch((err: any) => console.warn("Flow trigger error:", err));
      }
    },
    onError: (e: any) => {
      toast.error("Erro ao mover pedido: " + e.message);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  // Filter orders
  const filtered = useMemo(() => {
    let result = orders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.client_name.toLowerCase().includes(q) ||
          o.order_number?.toLowerCase().includes(q) ||
          o.client_phone.includes(q) ||
          o.id.toLowerCase().includes(q)
      );
    }
    if (activeFilter) result = result.filter((o) => o.status === activeFilter);
    if (filterDateFrom) result = result.filter((o) => o.created_at && o.created_at >= filterDateFrom);
    if (filterDateTo) result = result.filter((o) => o.created_at && o.created_at <= filterDateTo + "T23:59:59");
    if (filterProvider) result = result.filter((o) => o.logistics_type === filterProvider);
    if (filterCity) result = result.filter((o) => o.client_address_city.toLowerCase().includes(filterCity.toLowerCase()));
    return result;
  }, [orders, search, activeFilter, filterDateFrom, filterDateTo, filterProvider, filterCity]);

  // Group by status
  const columns = useMemo(() => {
    const map: Record<string, Order[]> = {};
    STATUS_KEYS.forEach((s) => (map[s] = []));
    filtered.forEach((o) => {
      if (map[o.status]) map[o.status].push(o);
      else if (map["Aguardando"]) map["Aguardando"].push(o);
    });
    return map;
  }, [filtered]);

  // Status counts (from all orders, not filtered)
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    STATUS_KEYS.forEach((s) => (c[s] = 0));
    orders.forEach((o) => { if (c[o.status] !== undefined) c[o.status]++; });
    return c;
  }, [orders]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const newStatus = result.destination.droppableId;
      const fromStatus = result.source.droppableId;
      const orderId = result.draggableId;
      if (fromStatus === newStatus) return;
      // Optimistic update
      queryClient.setQueryData<Order[]>(["orders"], (old) =>
        old?.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      updateStatusMutation.mutate({ id: orderId, status: newStatus, fromStatus });
      toast.success(`Pedido movido para ${newStatus}`);
    },
    [queryClient, updateStatusMutation]
  );

  function exportCSV() {
    if (filtered.length === 0) return toast.error("Nenhum pedido para exportar");
    const headers = ["Número", "Status", "Cliente", "Telefone", "Cidade", "UF", "Valor", "Data"];
    const rows = filtered.map((o) => [
      o.order_number || o.id.slice(0, 8),
      o.status,
      o.client_name,
      o.client_phone,
      o.client_address_city,
      o.client_address_state,
      Number(o.order_final_price).toFixed(2),
      o.created_at ? new Date(o.created_at).toLocaleDateString("pt-BR") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  }

  const statusMeta = (key: string) => STATUSES.find((s) => s.key === key) || STATUSES[0];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Quadro de Pedidos"
        subtitle="Gerencie o fluxo operacional em tempo real"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="border-border text-muted-foreground">
              <Download className="h-4 w-4 mr-1.5" /> Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)} className="border-border text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Filtros
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-4 max-w-lg">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pedidos, clientes ou IDs..."
          className="h-10 w-full rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Status chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveFilter(activeFilter === s.key ? null : s.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
              activeFilter === s.key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
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
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center text-[10px] font-bold bg-muted text-muted-foreground">
                      {items.length}
                    </Badge>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-xl border p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-340px)] overflow-y-auto transition-colors ${
                          snapshot.isDraggingOver
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/50 bg-card/30"
                        }`}
                      >
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-xs text-muted-foreground text-center py-8">Mova cards para aqui</p>
                        )}
                        {items.map((order, index) => (
                          <Draggable key={order.id} draggableId={order.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-lg border bg-card p-3 transition-shadow cursor-grab active:cursor-grabbing ${
                                  snapshot.isDragging ? "shadow-lg shadow-primary/10 border-primary/30" : "border-border hover:border-primary/20"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-mono text-primary font-semibold">
                                    #{order.order_number || order.id.slice(0, 8)}
                                  </span>
                                  <Badge className={`text-[10px] ${meta.color} text-white border-0 px-1.5 py-0`}>
                                    {order.status}
                                  </Badge>
                                </div>
                                <p className="text-sm font-semibold text-foreground truncate mb-1.5">{order.client_name}</p>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Package className="h-3 w-3 shrink-0" />
                                    <span className="truncate">x{order.order_quantity || 1}</span>
                                  </div>
                                  {order.delivery_date && (
                                    <div className="flex items-center gap-1.5">
                                      <CalendarDays className="h-3 w-3 shrink-0" />
                                      <span>{new Date(order.delivery_date).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <DollarSign className="h-3 w-3 shrink-0" />
                                    <span className="font-semibold text-foreground">R$ {Number(order.order_final_price).toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{order.client_address_city} - {order.client_address_state}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-success"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`https://wa.me/${order.client_phone.replace(/\D/g, "")}`, "_blank");
                                    }}
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground ml-auto">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
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

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => { if (!o) setSelectedOrder(null); }}>
        <DialogContent className="sm:max-w-[640px] bg-card border-border max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  Pedido #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                  <Badge className={`${statusMeta(selectedOrder.status).color} text-white border-0`}>
                    {selectedOrder.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="info" className="mt-2">
                <TabsList className="bg-secondary border border-border w-full">
                  <TabsTrigger value="info" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Informações</TabsTrigger>
                  <TabsTrigger value="logistics" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Logística</TabsTrigger>
                  <TabsTrigger value="timeline" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  {/* Client */}
                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Cliente</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Nome:</span> <span className="text-foreground font-medium">{selectedOrder.client_name}</span></div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Tel:</span>
                        <a href={`https://wa.me/${selectedOrder.client_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-success hover:underline font-medium">
                          {selectedOrder.client_phone}
                        </a>
                      </div>
                      {selectedOrder.client_email && <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{selectedOrder.client_email}</span></div>}
                      {selectedOrder.client_document && <div><span className="text-muted-foreground">Doc:</span> <span className="text-foreground">{selectedOrder.client_document}</span></div>}
                    </div>
                  </div>
                  {/* Address */}
                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Endereço</h4>
                    <p className="text-sm text-foreground">
                      {selectedOrder.client_address}, {selectedOrder.client_address_number}
                      {selectedOrder.client_address_comp ? ` - ${selectedOrder.client_address_comp}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.client_address_district} — {selectedOrder.client_address_city}/{selectedOrder.client_address_state} — CEP {selectedOrder.client_zip_code}
                    </p>
                  </div>
                  {/* Financial */}
                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Financeiro</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Valor:</span> <span className="text-primary font-bold text-lg">R$ {Number(selectedOrder.order_final_price).toFixed(2)}</span></div>
                      <div><span className="text-muted-foreground">Frete:</span> <span className="text-foreground">R$ {Number(selectedOrder.shipping_value || 0).toFixed(2)}</span></div>
                      {selectedOrder.payment_method && <div><span className="text-muted-foreground">Pagamento:</span> <span className="text-foreground uppercase">{selectedOrder.payment_method}</span></div>}
                      <div><span className="text-muted-foreground">Qtd:</span> <span className="text-foreground">{selectedOrder.order_quantity || 1}</span></div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logistics" className="space-y-4 mt-4">
                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Logística</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Provider:</span> <span className="text-foreground uppercase font-medium">{selectedOrder.logistics_type || "—"}</span></div>
                      {selectedOrder.delivery_date && <div><span className="text-muted-foreground">Entrega:</span> <span className="text-foreground">{new Date(selectedOrder.delivery_date).toLocaleDateString("pt-BR")}</span></div>}
                      {selectedOrder.delivery_type_name && <div><span className="text-muted-foreground">Tipo:</span> <span className="text-foreground">{selectedOrder.delivery_type_name}</span></div>}
                      {selectedOrder.tracking_code && <div><span className="text-muted-foreground">Rastreio:</span> <span className="text-primary font-mono">{selectedOrder.tracking_code}</span></div>}
                      {selectedOrder.delivery_man && <div><span className="text-muted-foreground">Entregador:</span> <span className="text-foreground">{selectedOrder.delivery_man}</span></div>}
                      {selectedOrder.logistic_operator && <div><span className="text-muted-foreground">Operador:</span> <span className="text-foreground">{selectedOrder.logistic_operator}</span></div>}
                    </div>
                  </div>
                  {/* Labels */}
                  <div className="flex gap-3">
                    {selectedOrder.label_a4_url && (
                      <Button variant="outline" size="sm" className="border-border" onClick={() => window.open(selectedOrder.label_a4_url!, "_blank")}>
                        <Printer className="h-4 w-4 mr-1.5" /> Etiqueta A4
                      </Button>
                    )}
                    {selectedOrder.label_thermal_url && (
                      <Button variant="outline" size="sm" className="border-border" onClick={() => window.open(selectedOrder.label_thermal_url!, "_blank")}>
                        <Printer className="h-4 w-4 mr-1.5" /> Etiqueta Térmica
                      </Button>
                    )}
                    {!selectedOrder.label_a4_url && !selectedOrder.label_thermal_url && (
                      <p className="text-sm text-muted-foreground">Nenhuma etiqueta disponível.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-3 w-3 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Pedido criado — {selectedOrder.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString("pt-BR") : "—"}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.updated_at && selectedOrder.updated_at !== selectedOrder.created_at && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-3 w-3 rounded-full bg-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Última atualização</p>
                          <p className="text-xs text-muted-foreground">{new Date(selectedOrder.updated_at).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                    )}
                    {selectedOrder.status_description && (
                      <div className="rounded-lg border border-border bg-secondary/50 p-3 mt-4">
                        <p className="text-xs text-muted-foreground mb-1">Observação</p>
                        <p className="text-sm text-foreground">{selectedOrder.status_description}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters Drawer */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="bg-card border-border w-[340px]">
          <SheetHeader>
            <SheetTitle className="text-foreground">Filtros Avançados</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div>
              <Label className="text-xs text-muted-foreground">Data início</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="bg-input border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data fim</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="bg-input border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Provider logístico</Label>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="bg-input border-border mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="logzz">Logzz</SelectItem>
                  <SelectItem value="coinzz">Coinzz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cidade</Label>
              <Input value={filterCity} onChange={(e) => setFilterCity(e.target.value)} placeholder="Ex: São Paulo" className="bg-input border-border mt-1" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1 border-border" onClick={() => {
                setFilterDateFrom(""); setFilterDateTo(""); setFilterProvider(""); setFilterCity("");
              }}>
                Limpar
              </Button>
              <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => setFiltersOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Pedidos;
