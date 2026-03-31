import { Send, TrendingUp, BarChart3, AlertTriangle, Info, Plus, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import NinjaBadge from "@/components/NinjaBadge";

const Disparos = () => {
  return (
    <div>
      <PageHeader
        title="Disparos"
        badge={<NinjaBadge variant="info">API Oficial</NinjaBadge>}
        subtitle="Envie templates aprovados pela Meta para sua base de leads via WhatsApp Cloud API"
        actions={
          <button className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Nova Campanha
          </button>
        }
      />

      {/* Warnings */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">API Oficial do WhatsApp não configurada</p>
            <p className="text-xs text-muted-foreground">Para realizar disparos, conecte seu número via API Oficial na aba <strong>WhatsApp Cloud</strong>.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <Info className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Nenhum fluxo aprovado pela Meta</p>
            <p className="text-xs text-muted-foreground">Você tem 3 fluxos pendentes de aprovação. Apenas fluxos com template aprovado podem ser usados em disparos. Vá em <strong>Fluxos</strong> para submeter seus templates.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <StatCard
          label="Alcance Total"
          value={0}
          icon={<TrendingUp className="h-6 w-6 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard label="Campanhas" value={0} icon={<Send className="h-6 w-6 text-muted-foreground" />} iconBg="bg-muted" />
        <StatCard label="Falhas" value={0} icon={<AlertTriangle className="h-6 w-6 text-destructive" />} iconBg="bg-destructive/10" />
      </div>

      <div className="ninja-card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Campanhas Recentes</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar campanhas..."
              className="h-9 rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <EmptyState
          icon={<Send className="h-12 w-12" />}
          title="Nenhuma campanha criada"
          description="Crie sua primeira campanha para disparar templates via API Oficial"
        />
      </div>
    </div>
  );
};

export default Disparos;
