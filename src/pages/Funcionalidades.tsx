import PublicLayout from "@/components/PublicLayout";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { ShoppingCart, MessageSquare, GitBranch, BarChart3, Truck, Users, RefreshCw, Code, Megaphone, Package, UserPlus, Zap } from "lucide-react";

const features = [
  { icon: ShoppingCart, title: "Checkout COD Híbrido", desc: "Checkout inteligente com 3 providers (Logzz, Coinzz, Hyppe). Detecta cobertura por CEP e roteia automaticamente com prioridade configurável. Zero pedido perdido.", color: "from-emerald-400 to-emerald-600" },
  { icon: MessageSquare, title: "Automação WhatsApp", desc: "Envie mensagens automáticas de confirmação, rastreio, follow-up e remarketing direto pelo WhatsApp. Integração com Evolution API e Meta Cloud.", color: "from-green-400 to-teal-500" },
  { icon: GitBranch, title: "Flow Builder Visual", desc: "Crie fluxos de automação arrastando e soltando. Configure triggers por status de pedido, tempo e condições. Sem código.", color: "from-teal-400 to-cyan-500" },
  { icon: BarChart3, title: "Dashboard & Pixel", desc: "Acompanhe métricas em tempo real: vendas, taxa de entrega, ROI. Pixel integrado para Facebook/Google com CAPI server-side.", color: "from-blue-400 to-indigo-500" },
  { icon: Truck, title: "Logística Integrada", desc: "Integração nativa com Logzz (COD), Coinzz (expedição) e Hyppe. Geração automática de etiquetas, rastreio e status em tempo real.", color: "from-amber-400 to-orange-500" },
  { icon: Users, title: "Leads & CRM", desc: "Capture leads no checkout e gerencie seu funil de vendas. Tags, segmentação e histórico completo de cada cliente.", color: "from-purple-400 to-pink-500" },
  { icon: RefreshCw, title: "Remarketing Automático", desc: "Recupere vendas frustradas com cadência de 30 dias (D1 a D25). Desconto progressivo, link de checkout personalizado e detecção automática do provider.", color: "from-rose-400 to-red-500" },
  { icon: Code, title: "Webhooks & API", desc: "API completa para integração com qualquer sistema. Webhooks para eventos em tempo real. Documentação completa.", color: "from-gray-400 to-gray-500" },
  { icon: Megaphone, title: "Disparos em Massa", desc: "Campanhas WhatsApp segmentadas por status, tags e comportamento. Agendamento, relatório de entrega e templates personalizados.", color: "from-sky-400 to-blue-500" },
  { icon: Package, title: "Hyppe Logística", desc: "Terceiro provider de logística totalmente integrado. Mais opções de entrega COD para seus clientes.", color: "from-orange-400 to-amber-500" },
  { icon: UserPlus, title: "Equipe & Permissões", desc: "Convide membros por e-mail e defina papéis (admin/membro). Gestão colaborativa com controle de acesso.", color: "from-violet-400 to-purple-500" },
  { icon: Zap, title: "Vozes com IA", desc: "Clone sua voz e envie áudios personalizados via WhatsApp. Integração nativa com ElevenLabs.", color: "from-yellow-400 to-orange-500" },
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
