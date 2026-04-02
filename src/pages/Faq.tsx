import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHomeSettings } from "@/hooks/useHomeSettings";
import PublicLayout from "@/components/PublicLayout";

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-5 text-left">
        <span className="pr-4 text-base font-semibold text-gray-100">{q}</span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 text-emerald-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pb-5 text-sm leading-relaxed text-gray-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const fallbackFaqs = [
  { q: "O que é COD (Cash on Delivery)?", a: "COD é o modelo de venda onde o cliente paga na entrega do produto. É o modelo mais usado por afiliados no Brasil para vender produtos físicos." },
  { q: "Preciso de CNPJ para usar o ScalaCOD?", a: "Não necessariamente. Você pode começar como pessoa física. Para volumes maiores, recomendamos ter um CNPJ para facilitar a logística." },
  { q: "Como funciona o checkout híbrido?", a: "O checkout detecta automaticamente se o CEP do cliente tem cobertura Logzz (COD). Se sim, processa como COD. Se não, redireciona para Coinzz + Correios com pagamento antecipado." },
  { q: "Posso testar antes de pagar?", a: "Sim! Todos os planos incluem 7 dias grátis sem precisar de cartão de crédito." },
  { q: "Como funciona a automação de WhatsApp?", a: "Você conecta seu WhatsApp via Evolution API ou Meta Cloud API. Depois, cria fluxos automáticos que enviam mensagens baseadas no status do pedido (confirmação, rastreio, follow-up, etc)." },
  { q: "Vocês integram com quais logísticas?", a: "Integramos nativamente com Logzz (para COD) e Coinzz (para expedição). Também suportamos webhooks para outras integrações." },
  { q: "O que acontece se o pedido não tiver cobertura COD?", a: "O checkout híbrido automaticamente redireciona para o modelo de expedição via Coinzz + Correios, garantindo que nenhum pedido seja perdido." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, você pode cancelar sua assinatura a qualquer momento sem multa ou taxa de cancelamento." },
];

export default function Faq() {
  const { data: s } = useHomeSettings();
  const faqs = s?.faqs?.items?.length ? s.faqs.items : fallbackFaqs;

  return (
    <PublicLayout>
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">FAQ</span>
            <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">
              Perguntas frequentes
            </h1>
            <p className="mt-4 text-lg text-gray-400">Tudo que você precisa saber sobre o ScalaCOD.</p>
          </div>

          <div className="mt-12">
            {faqs.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>

          <div className="mt-12 rounded-2xl border border-white/10 bg-gray-950 p-8 text-center">
            <h3 className="text-lg font-bold text-white">Ainda tem dúvidas?</h3>
            <p className="mt-2 text-sm text-gray-400">Nossa equipe está pronta para ajudar.</p>
            <a href="/ajuda" className="mt-4 inline-block rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-emerald-400">
              Central de Ajuda →
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
