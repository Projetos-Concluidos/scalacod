import { ShoppingCart, CheckCircle, AlertCircle, Package, Plus, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";

const Checkouts = () => {
  return (
    <div>
      <PageHeader
        title="Checkouts"
        subtitle="Gerencie seus fluxos de conversão e otimize suas vendas em tempo real."
        actions={
          <button className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
            <Plus className="h-4 w-4" /> Novo Checkout
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Checkouts" value={0} icon={<ShoppingCart className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Ativos" value={0} icon={<CheckCircle className="h-6 w-6 text-success" />} iconBg="bg-success/10" />
        <StatCard label="Inativos" value={0} icon={<AlertCircle className="h-6 w-6 text-muted-foreground" />} iconBg="bg-muted" />
        <StatCard label="Produtos" value={0} icon={<Package className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
      </div>

      <div className="ninja-card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Meus Checkouts</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className="h-9 rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        <EmptyState
          icon={<Plus className="h-12 w-12" />}
          title="Criar Primeiro Checkout"
          description=""
          className="border border-dashed border-border shadow-none"
        />
      </div>
    </div>
  );
};

export default Checkouts;
