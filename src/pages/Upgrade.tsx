import { useState, useEffect } from "react";
import { Check, X, Star, Zap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number | null;
  is_featured: boolean;
  trial_days: number | null;
  features: string[];
  limits: Record<string, number | boolean>;
}

const planIcons: Record<string, React.ReactNode> = {
  starter: <Zap className="h-6 w-6" />,
  pro: <Star className="h-6 w-6" />,
  enterprise: <Crown className="h-6 w-6" />,
};

const Upgrade = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) {
          setPlans(
            data.map((p) => ({
              ...p,
              features: Array.isArray(p.features) ? (p.features as string[]) : [],
              limits: (p.limits as Record<string, number | boolean>) || {},
            }))
          );
        }
        setLoading(false);
      });
  }, []);

  const getPrice = (plan: Plan) => {
    if (billing === "yearly" && plan.price_yearly) {
      return plan.price_yearly / 12;
    }
    return plan.price_monthly;
  };

  const handleSelect = (plan: Plan) => {
    if (plan.slug === "enterprise") {
      window.open("https://wa.me/5511999999999?text=Quero%20saber%20mais%20sobre%20o%20plano%20Enterprise", "_blank");
      return;
    }
    toast.info("Integração de pagamento será configurada em breve.");
  };

  const isCurrentPlan = (plan: Plan) => profile?.plan_id === plan.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Escolha o plano ideal para o seu negócio
          </h1>
          <p className="mt-3 text-muted-foreground">
            Comece com 7 dias grátis. Cancele quando quiser.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                billing === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                billing === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                2 meses grátis
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[500px] animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-8 transition-shadow ${
                  plan.is_featured
                    ? "border-primary shadow-lg ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                {plan.is_featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                    ⭐ Mais Popular
                  </span>
                )}

                <div className="mb-6">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {planIcons[plan.slug] || <Zap className="h-6 w-6" />}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">
                      R$ {getPrice(plan).toFixed(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  {billing === "yearly" && plan.price_yearly && (
                    <p className="mt-1 text-xs text-muted-foreground line-through">
                      R$ {plan.price_monthly.toFixed(0)}/mês
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature, i) => {
                    const isDisabled = feature.startsWith("✗");
                    const text = feature.replace(/^[✓✗]\s?/, "");
                    return (
                      <div key={i} className="flex items-start gap-2">
                        {isDisabled ? (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                        ) : (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        )}
                        <span
                          className={`text-sm ${
                            isDisabled ? "text-muted-foreground/40" : "text-foreground"
                          }`}
                        >
                          {text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelect(plan)}
                  disabled={isCurrentPlan(plan)}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                    isCurrentPlan(plan)
                      ? "bg-muted text-muted-foreground cursor-default"
                      : plan.is_featured
                      ? "gradient-primary text-primary-foreground hover:opacity-90"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {isCurrentPlan(plan)
                    ? "Plano atual"
                    : plan.slug === "enterprise"
                    ? "Falar com o time"
                    : `Começar trial de ${plan.trial_days || 7} dias`}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Guarantee */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-8 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">Garantia de 7 dias</p>
              <p className="text-xs text-muted-foreground">
                Se não gostar, cancele sem custo durante o período de trial.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Posso trocar de plano a qualquer momento?",
                a: "Sim! Você pode fazer upgrade ou downgrade a qualquer momento. A diferença será calculada proporcionalmente.",
              },
              {
                q: "O que acontece quando meu trial acaba?",
                a: "Você será cobrado automaticamente pelo plano escolhido. Se não quiser continuar, cancele antes do fim do trial.",
              },
              {
                q: "Quais formas de pagamento são aceitas?",
                a: "Aceitamos cartão de crédito, boleto e Pix via Mercado Pago.",
              },
              {
                q: "Preciso de cartão de crédito para o trial?",
                a: "Não! Você pode começar o trial sem informar dados de pagamento.",
              },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <h4 className="text-sm font-bold text-foreground">{faq.q}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
