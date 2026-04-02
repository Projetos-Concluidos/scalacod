import { Link } from "react-router-dom";
import { BookOpen, ShoppingCart, Package, MessageSquare, GitBranch, Settings, CreditCard, BarChart3 } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

const categories = [
  { icon: BookOpen, title: "Primeiros Passos", desc: "Como criar sua conta, configurar checkout e fazer sua primeira venda.", articles: 8 },
  { icon: ShoppingCart, title: "Checkouts", desc: "Configuração do checkout COD, checkout híbrido, pixels e personalização.", articles: 12 },
  { icon: Package, title: "Pedidos & Logística", desc: "Gerenciamento de pedidos, integração Logzz/Coinzz e rastreamento.", articles: 10 },
  { icon: MessageSquare, title: "WhatsApp", desc: "Conexão Evolution API/Meta Cloud, templates e automação de mensagens.", articles: 9 },
  { icon: GitBranch, title: "Fluxos & Automação", desc: "Flow Builder, triggers automáticos, condições e ações personalizadas.", articles: 7 },
  { icon: BarChart3, title: "Dashboard & Relatórios", desc: "Métricas, pixel Facebook/Google, CAPI e análise de performance.", articles: 6 },
  { icon: CreditCard, title: "Planos & Cobrança", desc: "Assinaturas, faturas, upgrade de plano e tokens.", articles: 5 },
  { icon: Settings, title: "Configurações & API", desc: "Webhooks, API tokens, integrações externas e configurações gerais.", articles: 8 },
];

export default function Ajuda() {
  return (
    <PublicLayout>
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">SUPORTE</span>
            <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">
              Central de Ajuda
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              Encontre respostas, tutoriais e guias para aproveitar ao máximo o ScalaCOD.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <div key={cat.title} className="group rounded-2xl border border-white/10 bg-gray-950 p-6 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <cat.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white">{cat.title}</h3>
                <p className="mt-2 text-sm text-gray-400">{cat.desc}</p>
                <p className="mt-3 text-xs text-gray-600">{cat.articles} artigos</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-gray-950 p-8">
              <h3 className="text-xl font-bold text-white">📧 Email</h3>
              <p className="mt-2 text-sm text-gray-400">Envie sua dúvida e responderemos em até 24h.</p>
              <p className="mt-4 text-sm font-semibold text-emerald-400">contato@scalacod.com</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gray-950 p-8">
              <h3 className="text-xl font-bold text-white">💬 WhatsApp</h3>
              <p className="mt-2 text-sm text-gray-400">Suporte rápido direto pelo WhatsApp durante horário comercial.</p>
              <p className="mt-4 text-sm font-semibold text-emerald-400">Seg-Sex, 9h-18h</p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">Não encontrou o que procura?</p>
            <Link to="/faq" className="mt-2 inline-block text-sm font-semibold text-emerald-400 transition hover:text-emerald-300">
              Confira nosso FAQ →
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
