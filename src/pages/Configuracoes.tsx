import { Store, Clock, Save, Globe, Key, Webhook, Bell } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const tabs = ["Loja", "Integrações", "API", "Webhooks", "Notificações"];

const Configuracoes = () => {
  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle={<>Gerencie sua loja, integrações e credenciais. <span className="text-primary">Alterações são salvas por aba.</span></>}
        actions={
          <button className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Save className="h-4 w-4" /> Salvar Alterações
          </button>
        }
      />

      {/* Tabs */}
      <div className="mb-8 flex items-center gap-6 border-b border-border">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`pb-3 text-sm font-medium transition-colors ${
              i === 0
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dados da Loja */}
      <div className="ninja-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Dados da Loja</h2>
            <p className="text-xs text-muted-foreground">Informações básicas que aparecem no painel</p>
          </div>
        </div>

        <div className="max-w-md">
          <label className="text-sm font-medium text-foreground">Nome da Loja</label>
          <input
            type="text"
            defaultValue="Minha Loja"
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">Aparece no painel e nos relatórios.</p>
        </div>
      </div>

      {/* Horário Comercial */}
      <div className="ninja-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Horário Comercial (Global)</h2>
            <p className="text-xs text-muted-foreground">Define o horário padrão de envio para todos os fluxos</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
          <span className="text-primary">ℹ</span>
          <p className="text-xs text-muted-foreground">
            Fluxos de automação só enviarão mensagens dentro do horário configurado. Cada fluxo pode ter seu próprio override.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Horário comercial</span>
          </div>
          <button
            className="relative h-6 w-11 rounded-full bg-muted transition-colors"
            role="switch"
            aria-checked="false"
          >
            <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-foreground transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
