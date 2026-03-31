import { Cloud, Eye, EyeOff, Copy, ExternalLink, Save } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const WhatsAppCloud = () => {
  return (
    <div>
      {/* Hero */}
      <div className="ninja-card mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Cloud className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Cloud</h1>
          <p className="text-sm text-muted-foreground">Conecte e gerencie sua API oficial da Meta</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          <Save className="h-4 w-4" /> Salvar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="ninja-card lg:col-span-2">
          <h2 className="text-xl font-bold text-foreground mb-1">Conexão Rápida</h2>
          <p className="text-sm text-muted-foreground mb-6">Escolha o método de integração do WhatsApp Business.</p>

          <div className="flex items-center gap-2 mb-6">
            <span className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desconectado</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <button className="gradient-primary rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">☁ YCloud</button>
            <button className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground" disabled>
              🌐 Facebook <span className="text-[10px]">(Em breve)</span>
            </button>
          </div>

          <div className="mb-6 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
            <span className="text-primary">ℹ</span>
            <p className="text-xs text-muted-foreground">
              A <strong className="text-foreground">YCloud</strong> é uma plataforma parceira que facilita a integração com a API oficial do WhatsApp.{" "}
              <a href="#" className="text-primary hover:underline">Criar conta na YCloud →</a>
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground">API Key da YCloud</label>
              <div className="relative mt-1.5">
                <input
                  type="password"
                  placeholder="Sua API Key da YCloud"
                  className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Encontre em YCloud Dashboard → Settings → API Keys.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Número do WhatsApp (remetente)</label>
              <input
                type="text"
                placeholder="+5511999999999"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">O número vinculado à sua conta YCloud, em formato internacional.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">URL de Webhook (cole na YCloud)</label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  readOnly
                  value="https://api.scalaninja.com/v1/whatsapp-webhook?store=..."
                  className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-muted-foreground"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Na YCloud, vá em Settings → Webhooks e cole esta URL para receber mensagens.</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              🔗 Conectar YCloud
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted">
              <ExternalLink className="h-4 w-4" /> Abrir YCloud
            </button>
          </div>
        </div>

        <div className="ninja-card h-fit">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 mb-4">
            <Cloud className="h-6 w-6 text-success" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">API Oficial</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Utilize a infraestrutura oficial da Meta para garantir 100% de entrega e evitar banimentos. Suporte a botões, listas e fluxos interativos nativos.
          </p>
          <div className="space-y-2 text-xs text-primary">
            <a href="#" className="flex items-center gap-1 hover:underline">📄 Documentação da Meta</a>
            <a href="#" className="flex items-center gap-1 hover:underline">☁ YCloud - WhatsApp BSP</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppCloud;
