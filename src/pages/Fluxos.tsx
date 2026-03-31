import { GitBranch, Zap, Folder, Plus, MessageCircle, Tag, ChevronDown, Pencil, SlidersHorizontal, Sparkles, MoreHorizontal, XCircle, Star, CheckCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import NinjaBadge from "@/components/NinjaBadge";

const flows = [
  { name: "Pedido Cancelado (Oficial)", icon: <XCircle className="h-5 w-5 text-destructive" />, msgs: 6, nodes: 12, time: "há 3 minutos", status: "Ativo" },
  { name: "Pos-Venda (Oficial)", icon: <Star className="h-5 w-5 text-warning" />, msgs: 4, nodes: 10, time: "há 3 minutos", status: "Ativo" },
  { name: "Pedido Feito (Oficial)", icon: <CheckCircle className="h-5 w-5 text-success" />, msgs: 4, nodes: 8, time: "há 3 minutos", status: "Ativo" },
];

const Fluxos = () => {
  return (
    <div>
      <PageHeader
        title="Fluxos"
        subtitle="Gerencie suas automações e funis de WhatsApp com precisão cirúrgica."
        actions={
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              <Sparkles className="h-4 w-4 text-primary" /> IA
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              <SlidersHorizontal className="h-4 w-4" /> Mais
            </button>
            <button className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Novo Fluxo
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Total de Fluxos" value={3} icon={<GitBranch className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Fluxos Ativos" value={3} icon={<Zap className="h-6 w-6 text-success" />} iconBg="bg-success/10" />
        <StatCard label="Pastas" value={0} icon={<Folder className="h-6 w-6 text-muted-foreground" />} iconBg="bg-muted" />
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

      {/* Sub tabs */}
      <div className="ninja-card mb-6">
        <div className="flex items-center gap-6 border-b border-border pb-4 mb-4">
          <button className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageCircle className="h-4 w-4" /> Fluxos <NinjaBadge variant="info">3</NinjaBadge>
          </button>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <GitBranch className="h-4 w-4" /> Templates (API Oficial)
          </button>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Tag className="h-4 w-4" /> Tags
          </button>
        </div>

        {/* Atribuição header */}
        <button className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Atribuição de Fluxos por Etapa
            <NinjaBadge variant="info">3</NinjaBadge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Flow list */}
        <div className="space-y-2">
          {flows.map((flow) => (
            <div key={flow.name} className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-4 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  {flow.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{flow.name}</span>
                    <NinjaBadge variant="info">Oficial</NinjaBadge>
                    <NinjaBadge variant="success">COD</NinjaBadge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {flow.msgs} msgs</span>
                    <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {flow.nodes} nós</span>
                    <span>⏱ {flow.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full bg-success" /> {flow.status}</span>
                <button className="gradient-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  <Zap className="mr-1 inline h-3 w-3" /> Enviar p/ aprovação
                </button>
                <button className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button className="text-muted-foreground hover:text-foreground"><SlidersHorizontal className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Fluxos;
