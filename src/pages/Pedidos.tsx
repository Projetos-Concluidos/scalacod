import { Search, SlidersHorizontal, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const statuses = [
  { label: "Aguardando", color: "bg-warning", count: 0 },
  { label: "Confirmado", color: "bg-destructive", count: 0 },
  { label: "Aprovado", color: "bg-success", count: 0 },
  { label: "Agendado", color: "bg-primary", count: 0 },
  { label: "Em Separação", color: "bg-destructive", count: 0 },
  { label: "Separado", color: "bg-muted-foreground", count: 0 },
  { label: "Em Rota", color: "bg-primary", count: 0 },
  { label: "Entregue", color: "bg-success", count: 0 },
  { label: "Frustrado", color: "bg-destructive", count: 0 },
  { label: "Reagendar", color: "bg-warning", count: 0 },
];

const kanbanColumns = ["AGUARDANDO", "CONFIRMADO", "APROVADO", "AGENDADO", "EM SEPARAÇÃO"];

const Pedidos = () => {
  return (
    <div>
      <PageHeader
        title="Quadro de Pedidos"
        subtitle="Gerencie o fluxo operacional em tempo real"
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <SlidersHorizontal className="h-4 w-4" /> Filtros Avançados
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-6 max-w-lg">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar pedidos, clientes ou IDs..."
          className="h-10 w-full rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Status bar */}
      <div className="mb-6 flex flex-wrap gap-4">
        {statuses.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${s.color}`} />
            <span>{s.count}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((col) => (
          <div key={col} className="min-w-[260px] flex-1">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{col}</h3>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/20 px-1.5 text-[10px] font-bold text-destructive">
                0
              </span>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-xs text-muted-foreground">Mova cards para aqui</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pedidos;
