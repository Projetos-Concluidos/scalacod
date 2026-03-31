import {
  Eye, FileText, MousePointerClick, Package, TrendingUp, AlertTriangle, Coins,
  Users as UsersIcon
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import NinjaBadge from "@/components/NinjaBadge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const hours = Array.from({ length: 24 }, (_, i) => ({
  name: `${String(i).padStart(2, "0")}h`,
  visitantes: 0,
  pedidos: 0,
}));

const Dashboard = () => {
  return (
    <div>
      <PageHeader
        title="Resumo Operacional"
        subtitle="PAINEL GERAL"
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {["Hoje", "Ontem", "7 dias", "15 dias", "30 dias", "Máximo"].map((label) => (
              <button
                key={label}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground first:bg-muted first:text-foreground"
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {/* Top stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        <div className="ninja-card col-span-1 md:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receita Estimada</p>
          <p className="mt-2 text-4xl font-bold text-foreground">R$ 0,00</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Package className="h-4 w-4" /> 0 pedidos
          </p>
          <div className="mt-4 h-1 w-1/3 rounded-full bg-primary" />
        </div>
        <div className="ninja-card flex flex-col items-center justify-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Eye className="h-6 w-6 text-primary" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pixel Analytics</p>
          <p className="mt-1 text-2xl font-bold text-foreground">0</p>
          <p className="text-xs text-muted-foreground">Eventos disparados</p>
        </div>
        <div className="ninja-card flex flex-col items-center justify-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <TrendingUp className="h-6 w-6 text-accent" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversão</p>
          <p className="mt-1 text-2xl font-bold text-foreground">0.0%</p>
          <p className="text-xs text-muted-foreground">Taxa de conversão</p>
        </div>
      </div>

      {/* Pixel Analytics row */}
      <div className="ninja-card mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Pixel Analytics</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Visitantes", value: "0", color: "text-success" },
            { label: "Pageviews", value: "0", color: "text-primary" },
            { label: "Interações", value: "0", color: "text-warning" },
            { label: "Pedidos", value: "0", color: "text-destructive" },
            { label: "Conversão", value: "0.0%", color: "text-accent" },
            { label: "Abandono", value: "0.0%", color: "text-warning" },
            { label: "Coinzz Pagos", value: "0", color: "text-muted-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${stat.color.replace("text-", "bg-")}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <div className="ninja-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Tráfego & Conversões</h3>
              <p className="text-xs text-muted-foreground">Por hora</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Visitantes</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Pedidos</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={hours}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsla(240,15%,20%,0.5)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(240,15%,55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240,15%,55%)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(240,20%,7%)",
                  border: "1px solid hsla(190,100%,50%,0.12)",
                  borderRadius: "8px",
                  color: "hsl(240,20%,97%)",
                }}
              />
              <Area type="monotone" dataKey="visitantes" stroke="#00FF88" fill="#00FF8820" />
              <Area type="monotone" dataKey="pedidos" stroke="#00D4FF" fill="#00D4FF20" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="ninja-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Leads Recentes</h3>
            <button className="text-xs font-semibold uppercase text-primary hover:underline">Ver Todos</button>
          </div>
          <EmptyState
            icon={<UsersIcon className="h-12 w-12" />}
            title="Nenhum lead ainda"
            description=""
            className="border-0 p-4 shadow-none"
          />
          <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] text-primary">💡</span>
              </div>
              <span className="text-sm font-bold text-foreground">Dica da ScalaNinja</span>
            </div>
            <p className="text-xs text-muted-foreground">
              O tráfego mobile sobe 15% após as 20h. Considere agendar seus disparos para esse horário.
            </p>
          </div>
        </div>
      </div>

      {/* Engagement chart */}
      <div className="ninja-card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Engajamento</h3>
            <p className="text-xs text-muted-foreground">Visualizações e interações por hora</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Views</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Interações</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={hours}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(240,15%,20%,0.5)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(240,15%,55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(240,15%,55%)" }} />
            <Area type="monotone" dataKey="visitantes" stroke="#00FF88" fill="#00FF8820" />
            <Area type="monotone" dataKey="pedidos" stroke="#00D4FF" fill="#00D4FF20" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom empty */}
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Sem dados ainda"
        description="O pixel está ativo. Dados aparecerão aqui quando visitantes acessarem seus checkouts."
      />
    </div>
  );
};

export default Dashboard;
