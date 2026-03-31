import { Users, Heart, MessageSquare, DollarSign, Upload, Search, LayoutGrid, List } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";

const tabs = ["Todos", "Confirmados", "Em Aguardo", "Cancelados"];

const Leads = () => {
  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Gerencie seus contatos e funil de vendas em tempo real."
        actions={
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            <Upload className="h-4 w-4" /> Importar
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Leads" value={0} icon={<Users className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Leads Confirmados" value={0} icon={<Heart className="h-6 w-6 text-success" />} iconBg="bg-success/10" />
        <StatCard label="Em Aguardo" value={0} icon={<MessageSquare className="h-6 w-6 text-warning" />} iconBg="bg-warning/10" />
        <StatCard label="Receita Acumulada" value="R$ 0,00" icon={<DollarSign className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
      </div>

      <div className="ninja-card">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou tele"
                className="h-9 rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-primary"><LayoutGrid className="h-4 w-4" /></button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"><List className="h-4 w-4" /></button>
          </div>
        </div>

        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Nenhum lead encontrado"
          description="Leads aparecerão quando houver pedidos"
          action={
            <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
              <Upload className="h-4 w-4" /> Importar leads
            </button>
          }
        />
      </div>
    </div>
  );
};

export default Leads;
