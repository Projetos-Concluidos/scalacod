import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  Eye, TrendingUp, Package, BarChart3, MousePointerClick,
  ShoppingCart, AlertTriangle, Coins, Calendar as CalendarIcon, FileText, MessageCircle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import EmptyState from "@/components/EmptyState";
import OnboardingBanner from "@/components/OnboardingBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useTeamContext } from "@/hooks/useTeamContext";

const periods = ["Hoje", "Ontem", "7 dias", "15 dias", "30 dias", "Máximo"];

const chartTooltipStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  color: "#111827",
  fontSize: "12px",
};

function getDateRange(period: string): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(today.getTime() + 86400000).toISOString(); // end of today

  switch (period) {
    case "Ontem": {
      const y = new Date(today.getTime() - 86400000);
      return { from: y.toISOString(), to: today.toISOString() };
    }
    case "7 dias": return { from: new Date(today.getTime() - 7 * 86400000).toISOString(), to };
    case "15 dias": return { from: new Date(today.getTime() - 15 * 86400000).toISOString(), to };
    case "30 dias": return { from: new Date(today.getTime() - 30 * 86400000).toISOString(), to };
    case "Máximo": return { from: "2020-01-01T00:00:00", to };
    default: return { from: today.toISOString(), to };
  }
}

const Dashboard = () => {
  const { user } = useAuth();
  const { effectiveUserId } = useTeamContext();
  const navigate = useNavigate();
  const [activePeriod, setActivePeriod] = useState("Hoje");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    revenue: 0, orderCount: 0, visitors: 0, pageviews: 0,
    interactions: 0, conversions: 0, abandonment: 0, coinzzPaid: 0, pixelTotal: 0,
  });
  const [hourlyData, setHourlyData] = useState(
    Array.from({ length: 24 }, (_, i) => ({ name: `${String(i).padStart(2, "0")}h`, visitantes: 0, pedidos: 0, views: 0, interacoes: 0 }))
  );
  const [sparkData, setSparkData] = useState(Array.from({ length: 12 }, () => ({ v: 0 })));
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [convMetrics, setConvMetrics] = useState({ open: 0, resolved: 0, total: 0 });

  const loadData = useCallback(async () => {
    if (!user) return;
    let dateRange: { from: string; to: string };
    if (activePeriod === "Personalizado" && customDateFrom) {
      const fromDate = new Date(customDateFrom);
      const toDate = customDateTo ? new Date(customDateTo.getTime() + 86400000) : new Date(fromDate.getTime() + 86400000);
      dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
    } else {
      dateRange = getDateRange(activePeriod);
    }
    const { from, to } = dateRange;

    const qId = effectiveUserId || user?.id;
    if (!qId) return;

    const [pixelRes, ordersRes, coinzzRes, leadsRes, queueRes, convOpenRes, convResolvedRes, convTotalRes] = await Promise.all([
      supabase.from("pixel_events").select("event_type, created_at").gte("created_at", from).lt("created_at", to),
      supabase.from("orders").select("order_final_price, created_at, status").gte("created_at", from).lt("created_at", to),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("logistics_type", "coinzz").in("status", ["Aprovado", "Entregue"]).gte("created_at", from).lt("created_at", to),
      supabase.from("orders").select("id, order_number, client_name, client_phone, order_final_price, status, logistics_type, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("message_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("conversations").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.open"),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("conversations").select("id", { count: "exact", head: true }),
    ]);

    const pixels = pixelRes.data || [];
    const orders = ordersRes.data || [];

    const visitors = new Set(pixels.filter(p => p.event_type === "pageview").map(() => 1)).size > 0
      ? pixels.filter(p => p.event_type === "pageview").length : 0;
    const pageviews = pixels.filter(p => p.event_type === "pageview").length;
    const interactions = pixels.filter(p => p.event_type === "interaction").length;
    const orderCount = orders.length;
    const revenue = orders.reduce((s, o) => s + Number(o.order_final_price || 0), 0);
    const convRate = visitors > 0 ? (orderCount / visitors) * 100 : 0;
    const abandRate = visitors > 0 ? ((visitors - orderCount) / visitors) * 100 : 0;

    setMetrics({
      revenue, orderCount, visitors, pageviews, interactions,
      conversions: Math.round(convRate * 10) / 10,
      abandonment: Math.round(abandRate * 10) / 10,
      coinzzPaid: coinzzRes.count || 0,
      pixelTotal: pixels.length,
    });

    // Hourly breakdown
    const hourly = Array.from({ length: 24 }, (_, i) => ({ name: `${String(i).padStart(2, "0")}h`, visitantes: 0, pedidos: 0, views: 0, interacoes: 0 }));
    pixels.forEach(p => {
      const h = new Date(p.created_at!).getHours();
      if (p.event_type === "pageview") { hourly[h].visitantes++; hourly[h].views++; }
      if (p.event_type === "interaction") hourly[h].interacoes++;
    });
    orders.forEach(o => {
      const h = new Date(o.created_at!).getHours();
      hourly[h].pedidos++;
    });
    setHourlyData(hourly);

    // Spark data from last 12 periods
    const spark = Array.from({ length: 12 }, (_, i) => {
      const count = orders.filter(o => {
        const d = new Date(o.created_at!).getHours();
        return d >= i * 2 && d < (i + 1) * 2;
      }).length;
      return { v: count };
    });
    setSparkData(spark);
    setRecentOrders(leadsRes.data || []);
    setQueueCount(queueRes.count || 0);
    setConvMetrics({
      open: convOpenRes.count || 0,
      resolved: convResolvedRes.count || 0,
      total: convTotalRes.count || 0,
    });
  }, [user, activePeriod, customDateFrom, customDateTo, effectiveUserId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscription for pixel events
  useEffect(() => {
    if (!user) return;
    const filterUserId = effectiveUserId || user.id;
    const channel = supabase
      .channel("pixel-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pixel_events", filter: `user_id=eq.${filterUserId}` }, () => loadData())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${filterUserId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData, effectiveUserId]);

  const hasPixelData = metrics.pixelTotal > 0;

  const pixelStats = [
    { label: "Visitantes", value: String(metrics.visitors), color: "#10B981", icon: Eye },
    { label: "Pageviews", value: String(metrics.pageviews), color: "#059669", icon: FileText },
    { label: "Interações", value: String(metrics.interactions), color: "#F59E0B", icon: MousePointerClick },
    { label: "Pedidos", value: String(metrics.orderCount), color: "#EF4444", icon: ShoppingCart },
    { label: "Conversão", value: `${metrics.conversions}%`, color: "#10B981", icon: TrendingUp },
    { label: "Abandono", value: `${metrics.abandonment}%`, color: "#F59E0B", icon: AlertTriangle },
    { label: "Coinzz Pagos", value: String(metrics.coinzzPaid), color: "#6B7280", icon: Coins },
    { label: "Fila WhatsApp", value: String(queueCount), color: queueCount > 0 ? "#F59E0B" : "#10B981", icon: MessageCircle },
    { label: "Conversas Abertas", value: String(convMetrics.open), color: "#3B82F6", icon: MessageCircle },
    { label: "Resolvidas", value: String(convMetrics.resolved), color: "#10B981", icon: MessageCircle },
  ];

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Onboarding Banner */}
      <OnboardingBanner />

      {/* Header + Filter — aligned with gap */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Painel Geral</p>
          <h1 className="text-3xl font-bold text-foreground">Resumo Operacional</h1>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => { setActivePeriod(p); setCustomDateFrom(undefined); setCustomDateTo(undefined); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activePeriod === p && activePeriod !== "Personalizado"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              }`}
            >
              {p}
            </button>
          ))}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  activePeriod === "Personalizado"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Selecionar período personalizado"
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Período personalizado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">De</p>
                    <Calendar
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      disabled={(date) => date > new Date()}
                      className={cn("p-2 pointer-events-auto rounded-lg border border-border")}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Até</p>
                    <Calendar
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      disabled={(date) => date > new Date() || (customDateFrom ? date < customDateFrom : false)}
                      className={cn("p-2 pointer-events-auto rounded-lg border border-border")}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {customDateFrom ? format(customDateFrom, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    {" → "}
                    {customDateTo ? format(customDateTo, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </p>
                  <button
                    onClick={() => { setActivePeriod("Personalizado"); setCalendarOpen(false); }}
                    disabled={!customDateFrom}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Section 1 — Top metric cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 ninja-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receita Estimada</p>
            <p className="mt-2 text-4xl font-extrabold text-foreground tracking-tight">
              R$ {metrics.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Package className="h-4 w-4" /> {metrics.orderCount} pedidos
            </p>
          </div>
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 ninja-card flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Eye className="h-7 w-7 text-primary" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pixel Analytics</p>
          <p className="mt-1 text-3xl font-extrabold text-foreground">{metrics.pixelTotal}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Eventos disparados</p>
        </div>

        <div className="lg:col-span-2 ninja-card flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <TrendingUp className="h-7 w-7 text-accent" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conversão</p>
          <p className="mt-1 text-3xl font-extrabold text-foreground">{metrics.conversions}%</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Taxa de conversão</p>
        </div>
      </div>

      {/* Section 2 — Pixel Analytics bar */}
      <div className="ninja-card">
        <div className="mb-5 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Pixel Analytics</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4 md:gap-0 md:divide-x md:divide-border">
          {pixelStats.map((stat) => {
            const IconComp = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col items-center gap-1 px-4 first:pl-0 last:pr-0">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <IconComp className="h-3.5 w-3.5" style={{ color: stat.color }} />
                  {stat.label}
                </span>
                <p className="text-lg font-extrabold text-foreground leading-tight">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3 — Charts + Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6 min-w-0">
          <div className="ninja-card">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Tráfego & Conversões</h3>
                <p className="text-xs text-muted-foreground">Por hora</p>
              </div>
              <div className="flex items-center gap-5 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-success" /> Visitantes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Pedidos
                </span>
              </div>
            </div>
            {hasPixelData ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="gradVisitantes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="visitantes" stroke="#10B981" strokeWidth={2} fill="url(#gradVisitantes)" />
                  <Area type="monotone" dataKey="pedidos" stroke="#059669" strokeWidth={2} fill="url(#gradPedidos)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <BarChart3 className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Sem dados de tráfego ainda</p>
                <p className="text-xs text-muted-foreground max-w-xs">Quando visitantes acessarem seus checkouts, o gráfico será preenchido automaticamente em tempo real.</p>
              </div>
            )}
          </div>

          <div className="ninja-card">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Engajamento</h3>
                <p className="text-xs text-muted-foreground">Visualizações e interações por hora</p>
              </div>
              <div className="flex items-center gap-5 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-success" /> Views
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Interações
                </span>
              </div>
            </div>
            {hasPixelData ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradInteracoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="views" stroke="#10B981" strokeWidth={2} fill="url(#gradViews)" />
                  <Area type="monotone" dataKey="interacoes" stroke="#F59E0B" strokeWidth={2} fill="url(#gradInteracoes)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <MousePointerClick className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Sem dados de engajamento ainda</p>
                <p className="text-xs text-muted-foreground max-w-xs">Views e interações dos visitantes aparecerão aqui automaticamente em tempo real.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="ninja-card">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Vendas Recentes</h3>
              <button
                onClick={() => navigate("/pedidos")}
                className="text-xs font-bold uppercase tracking-wide text-primary hover:underline"
              >
                Ver Todos
              </button>
            </div>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">Nenhuma venda ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const providerLabel = order.logistics_type === "hyppe" ? "Hyppe" : order.logistics_type === "coinzz" ? "Coinzz" : "Logzz";
                   const providerColor = order.logistics_type === "hyppe"
                    ? "bg-violet-400/15 text-violet-400 border-violet-400/20"
                    : order.logistics_type === "coinzz"
                    ? "bg-purple-700/15 text-purple-700 border-purple-700/20"
                    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/20";
                  const statusColor =
                    order.status === "Entregue" ? "bg-success/15 text-success"
                    : order.status === "Aprovado" ? "bg-success/15 text-success"
                    : order.status === "Cancelado" || order.status === "Devolvido" ? "bg-destructive/15 text-destructive"
                    : order.status === "Em Rota" || order.status === "Separado" ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground";

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate("/pedidos")}
                      className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                        {order.client_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{order.client_name}</p>
                          <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase", providerColor)}>
                            {providerLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {order.order_number ? `#${order.order_number}` : "—"} · {order.client_phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          R$ {Number(order.order_final_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase mt-0.5", statusColor)}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/10 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="shrink-0">
                <defs>
              <linearGradient id="shuriken-tip" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <path d="M16 2L20 12L30 16L20 20L16 30L12 20L2 16L12 12Z" fill="url(#shuriken-tip)" />
                <circle cx="16" cy="16" r="3" fill="#F8FFFE" />
              </svg>
              <span className="text-sm font-bold text-foreground">Dica da ScalaCOD</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O tráfego mobile sobe 15% após as 20h. Considere agendar seus disparos para esse horário.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
