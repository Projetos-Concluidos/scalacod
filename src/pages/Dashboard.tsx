import { useState } from "react";
import {
  Eye, TrendingUp, Package, Users, BarChart3, MousePointerClick,
  ShoppingCart, AlertTriangle, Coins, Calendar, FileText
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import EmptyState from "@/components/EmptyState";

const hours = Array.from({ length: 24 }, (_, i) => ({
  name: `${String(i).padStart(2, "0")}h`,
  visitantes: 0,
  pedidos: 0,
  views: 0,
  interacoes: 0,
}));

const sparkData = Array.from({ length: 12 }, (_, i) => ({ v: 0 }));

const periods = ["Hoje", "Ontem", "7 dias", "15 dias", "30 dias", "Máximo"];

const pixelStats = [
  { label: "Visitantes", value: "0", color: "#00FF88", icon: Eye },
  { label: "Pageviews", value: "0", color: "#00D4FF", icon: FileText },
  { label: "Interações", value: "0", color: "#FFB020", icon: MousePointerClick },
  { label: "Pedidos", value: "0", color: "#FF3D5A", icon: ShoppingCart },
  { label: "Conversão", value: "0.0%", color: "#00FF88", icon: TrendingUp },
  { label: "Abandono", value: "0.0%", color: "#FFB020", icon: AlertTriangle },
  { label: "Coinzz Pagos", value: "0", color: "#8888AA", icon: Coins },
];

const chartTooltipStyle = {
  backgroundColor: "hsl(240,20%,7%)",
  border: "1px solid hsla(190,100%,50%,0.12)",
  borderRadius: "8px",
  color: "hsl(240,20%,97%)",
  fontSize: "12px",
};

const Dashboard = () => {
  const [activePeriod, setActivePeriod] = useState("Hoje");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Painel Geral</p>
          <h1 className="text-3xl font-bold text-foreground">Resumo Operacional</h1>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activePeriod === p
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              }`}
            >
              {p}
            </button>
          ))}
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Section 1 — Top metric cards */}
      <div className="grid grid-cols-12 gap-4">
        {/* Receita Estimada - spans 8 cols */}
        <div className="col-span-8 ninja-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receita Estimada</p>
            <p className="mt-2 text-4xl font-extrabold text-foreground tracking-tight">R$ 0,00</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Package className="h-4 w-4" /> 0 pedidos
            </p>
          </div>
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke="#00D4FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pixel Analytics card */}
        <div className="col-span-2 ninja-card flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Eye className="h-7 w-7 text-primary" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pixel Analytics</p>
          <p className="mt-1 text-3xl font-extrabold text-foreground">0</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Eventos disparados</p>
        </div>

        {/* Conversão card */}
        <div className="col-span-2 ninja-card flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <TrendingUp className="h-7 w-7 text-accent" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conversão</p>
          <p className="mt-1 text-3xl font-extrabold text-foreground">0.0%</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Taxa de conversão</p>
        </div>
      </div>

      {/* Section 2 — Pixel Analytics bar */}
      <div className="ninja-card">
        <div className="mb-5 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Pixel Analytics</h3>
        </div>
        <div className="grid grid-cols-7 divide-x divide-border">
          {pixelStats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-start px-4 first:pl-0 last:pr-0">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Charts + Leads */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column — Charts */}
        <div className="col-span-8 space-y-6">
          {/* Tráfego & Conversões */}
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
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hours}>
                <defs>
                  <linearGradient id="gradVisitantes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FF88" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00FF88" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(240,15%,20%,0.5)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8888AA" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8888AA" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="visitantes" stroke="#00FF88" strokeWidth={2} fill="url(#gradVisitantes)" />
                <Area type="monotone" dataKey="pedidos" stroke="#00D4FF" strokeWidth={2} fill="url(#gradPedidos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Engajamento */}
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
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hours}>
                <defs>
                  <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FF88" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00FF88" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradInteracoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB020" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#FFB020" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(240,15%,20%,0.5)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8888AA" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8888AA" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="views" stroke="#00FF88" strokeWidth={2} fill="url(#gradViews)" />
                <Area type="monotone" dataKey="interacoes" stroke="#FFB020" strokeWidth={2} fill="url(#gradInteracoes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column — Leads + Tip */}
        <div className="col-span-4 space-y-6">
          {/* Leads Recentes */}
          <div className="ninja-card">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Leads Recentes</h3>
              <button className="text-xs font-bold uppercase tracking-wide text-primary hover:underline">
                Ver Todos
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">Nenhum lead ainda</p>
            </div>
          </div>

          {/* Dica da ScalaNinja */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="shrink-0">
                <defs>
                  <linearGradient id="shuriken-tip" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#00D4FF" />
                    <stop offset="100%" stopColor="#0066FF" />
                  </linearGradient>
                </defs>
                <path d="M16 2L20 12L30 16L20 20L16 30L12 20L2 16L12 12Z" fill="url(#shuriken-tip)" />
                <circle cx="16" cy="16" r="3" fill="#0A0A0F" />
              </svg>
              <span className="text-sm font-bold text-foreground">Dica da ScalaNinja</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O tráfego mobile sobe 15% após as 20h. Considere agendar seus disparos para esse horário.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4 — Empty state bottom */}
      <EmptyState
        icon={<BarChart3 className="h-14 w-14" />}
        title="Sem dados ainda"
        description="O pixel está ativo. Dados aparecerão aqui quando visitantes acessarem seus checkouts."
      />
    </div>
  );
};

export default Dashboard;
