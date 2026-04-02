import PublicLayout from "@/components/PublicLayout";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { ShoppingCart, MessageSquare, GitBranch, BarChart3, Truck, Users, RefreshCw, Code } from "lucide-react";

const features = [
  { icon: ShoppingCart, title: "Checkout COD Híbrido", desc: "Checkout inteligente que detecta automaticamente se o CEP tem cobertura Logzz (COD) ou redireciona para Coinzz + Correios. Sem pedido perdido.", color: "from-emerald-400 to-emerald-600" },
  { icon: MessageSquare, title: "Automação WhatsApp", desc: "Envie mensagens automáticas de confirmação, rastreio, follow-up e remarketing direto pelo WhatsApp. Integração com Evolution API e Meta Cloud.", color: "from-green-400 to-teal-500" },
  { icon: GitBranch, title: "Flow Builder Visual", desc: "Crie fluxos de automação arrastando e soltando. Configure triggers por status de pedido, tempo e condições. Sem código.", color: "from-teal-400 to-cyan-500" },
  { icon: BarChart3, title: "Dashboard & Pixel", desc: "Acompanhe métricas em tempo real: vendas, taxa de entrega, ROI. Pixel integrado para Facebook/Google com CAPI server-side.", color: "from-blue-400 to-indigo-500" },
  { icon: Truck, title: "Logística Integrada", desc: "Integração nativa com Logzz para COD e Coinzz para expedição. Geração automática de etiquetas, rastreio e status em tempo real.", color: "from-amber-400 to-orange-500" },
  { icon: Users, title: "Leads & CRM", desc: "Capture leads no checkout e gerencie seu funil de vendas. Tags, segmentação e histórico completo de cada cliente.", color: "from-purple-400 to-pink-500" },
  { icon: RefreshCw, title: "Remarketing Automático", desc: "Recupere carrinhos abandonados e faça follow-up com clientes inativos. Campanhas segmentadas por comportamento.", color: "from-rose-400 to-red-500" },
  { icon: Code, title: "Webhooks & API", desc: "API completa para integração com qualquer sistema. Webhooks para eventos em tempo real. Documentação completa.", color: "from-gray-400 to-gray-500" },
];

export default function Funcionalidades() {
  return (
    <PublicLayout>
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">FUNCIONALIDADES</span>
            <h1 className="mt-4 text-4xl font-black text-white md:text-6xl">
              Tudo que você precisa<br />
              <span className="text-gray-500">para escalar no COD.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
              Uma plataforma completa para gerenciar checkout, logística, WhatsApp e remarketing — tudo no piloto automático.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <SpotlightCard key={f.title}>
                <div className="space-y-4 p-1">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} bg-opacity-10`}>
                    <f.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{f.desc}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
