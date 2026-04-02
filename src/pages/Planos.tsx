import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

export default function Planos() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) setPlans(data);
    });
  }, []);

  return (
    <PublicLayout>
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">PLANOS & PREÇOS</span>
            <h1 className="mt-4 text-4xl font-black text-white md:text-6xl">
              Escolha o plano<br />
              <span className="text-gray-500">ideal para escalar.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
              Todos os planos incluem 7 dias grátis. Sem cartão de crédito para começar.
            </p>

            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/10 bg-gray-950 p-1">
              <button onClick={() => setBilling("monthly")} className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${billing === "monthly" ? "bg-emerald-500 text-black" : "text-gray-400"}`}>Mensal</button>
              <button onClick={() => setBilling("yearly")} className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${billing === "yearly" ? "bg-emerald-500 text-black" : "text-gray-400"}`}>Anual <span className="text-emerald-300">-20%</span></button>
            </div>
          </div>

          {plans.length > 0 && (
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {plans.map((plan) => {
                const planFeatures = Array.isArray(plan.features) ? plan.features as string[] : [];
                const price = billing === "yearly" && plan.price_yearly ? plan.price_yearly : plan.price_monthly;
                return (
                  <div key={plan.id} className={`relative rounded-2xl border p-8 transition-shadow hover:shadow-xl ${plan.is_featured ? "border-emerald-500/50 bg-gray-950 shadow-emerald-500/10 ring-1 ring-emerald-500/20" : "border-white/10 bg-gray-950"}`}>
                    {plan.is_featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-black">⭐ MAIS POPULAR</span>
                    )}
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <div className="mt-4 mb-6">
                      <span className="text-5xl font-black text-white">R$ {Number(price).toFixed(0)}</span>
                      <span className="text-gray-500">/mês</span>
                    </div>
                    <button onClick={() => navigate("/register")} className={`w-full rounded-xl py-3.5 text-sm font-bold transition ${plan.is_featured ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/25" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                      Começar grátis por 7 dias
                    </button>
                    <ul className="mt-8 space-y-3">
                      {planFeatures.map((f: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {/* Enterprise */}
          <div className="mt-12 rounded-2xl border border-white/10 bg-gray-950 p-8 text-center">
            <h3 className="text-2xl font-bold text-white">🏢 Empresarial</h3>
            <p className="mt-3 text-gray-400">Volume alto? Precisa de features customizadas? Fale com nosso time.</p>
            <button onClick={() => navigate("/ajuda")} className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-8 py-3 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/20">
              Falar com especialista
            </button>
          </div>

          {/* Qual escolher */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-black text-white">Qual plano escolher?</h2>
            <div className="mx-auto mt-8 grid max-w-3xl gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-gray-950 p-6 text-left">
                <h4 className="text-lg font-bold text-white">🚀 Iniciante</h4>
                <p className="mt-2 text-sm text-gray-400">Ideal para quem está começando no COD e quer validar produtos com automação básica e checkout inteligente.</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-gray-950 p-6 text-left">
                <h4 className="text-lg font-bold text-emerald-400">⚡ Escala</h4>
                <p className="mt-2 text-sm text-gray-400">Para quem já vende e quer escalar com automação avançada, remarketing, campanhas em massa e suporte prioritário.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
