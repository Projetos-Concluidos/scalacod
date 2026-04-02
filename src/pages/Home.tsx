import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useHomeSettings } from "@/hooks/useHomeSettings";
import { supabase } from "@/integrations/supabase/client";
import { Check, Menu, X, ChevronDown } from "lucide-react";
import { AnimatedGradientBackground } from "@/components/ui/animated-gradient-background";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { HeroAccordion } from "@/components/home/HeroAccordion";
import { motion, AnimatePresence } from "framer-motion";
import ScalaCODLogo, { ScalaCODBrandName } from "@/components/ScalaCODLogo";
import PublicFooter from "@/components/PublicFooter";

function FAQ({ q, a }: { q: string; a: string }) {
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

export default function Home() {
  const { data: s, isLoading } = useHomeSettings();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order").then(({ data }) => { if (data) setPlans(data); });
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("revealed")),
      { threshold: 0.05, rootMargin: "0px 0px 50px 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    // Fallback: reveal all after 3s in case observer doesn't trigger
    const fallback = setTimeout(() => {
      document.querySelectorAll(".reveal:not(.revealed)").forEach((el) => el.classList.add("revealed"));
    }, 3000);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [isLoading]);

  // Update SEO meta tags dynamically
  useEffect(() => {
    if (!s) return;
    const seo = s.seo;
    document.title = seo.meta_title;
    const updateMeta = (attr: string, val: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${val}"]`) as HTMLMetaElement;
      if (el) el.content = content;
    };
    updateMeta("name", "description", seo.meta_description);
    updateMeta("name", "keywords", seo.keywords);
    updateMeta("property", "og:title", seo.og_title);
    updateMeta("property", "og:description", seo.og_description);
    if (seo.og_image_url) updateMeta("property", "og:image", seo.og_image_url);
    updateMeta("name", "twitter:title", seo.og_title);
    updateMeta("name", "twitter:description", seo.og_description);
    if (seo.og_image_url) updateMeta("name", "twitter:image", seo.og_image_url);
  }, [s]);

  if (isLoading || !s) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const pp = s.pain_points;
  const cs = s.checkout_section;
  const tl = s.tools;
  const fq = s.faqs;
  const ft = s.footer;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 font-['Sora',sans-serif]">
      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full border-b border-emerald-900/30 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <ScalaCODLogo size={28} />
            <ScalaCODBrandName className="text-xl font-extrabold tracking-tight" />
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/funcionalidades" className="text-sm font-medium text-gray-400 transition hover:text-emerald-400">Recursos</Link>
            <Link to="/planos" className="text-sm font-medium text-gray-400 transition hover:text-emerald-400">Planos</Link>
            <Link to="/faq" className="text-sm font-medium text-gray-400 transition hover:text-emerald-400">FAQ</Link>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 animate-pulse">
              ⚡ Checkout COD híbrido
            </span>
            <Link to="/login" className="text-sm font-medium text-gray-300 transition hover:text-white">Login</Link>
            <button onClick={() => navigate("/register")} className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-black transition hover:bg-emerald-400">
              {s.navbar.cta_text}
            </button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-white md:hidden">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-gray-950 px-4 pb-4 md:hidden">
            <a href="#features" className="block py-2 text-sm text-gray-400" onClick={() => setMenuOpen(false)}>Recursos</a>
            <a href="#pricing" className="block py-2 text-sm text-gray-400" onClick={() => setMenuOpen(false)}>Planos</a>
            <Link to="/login" className="block py-2 text-sm text-gray-400" onClick={() => setMenuOpen(false)}>Login</Link>
            <button onClick={() => { navigate("/register"); setMenuOpen(false); }} className="mt-2 w-full rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-black">
              {s.navbar.cta_text}
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <AnimatedGradientBackground className="relative overflow-hidden pt-28 pb-16 md:pt-40 md:pb-28">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #10B981 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="reveal mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
                <span className="flex -space-x-1.5">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-5 w-5 rounded-full border-2 border-[#030712] bg-gradient-to-br from-emerald-400 to-emerald-600" />)}
                </span>
                <span className="text-sm font-semibold text-emerald-300">{s.hero.social_proof_text}</span>
              </div>

              <h1 className="reveal text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Seu COD no{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                  piloto automático.
                </span>
                <br />
                <span className="text-gray-500">Sem pedido perdido.</span>
              </h1>

              <p className="reveal mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
                {s.hero.subtitle}{" "}
                <span className="text-emerald-400">Zero decisão manual.</span>
              </p>

              <div className="reveal mt-8 flex gap-8">
                {[
                  { num: "98%", label: "Taxa de entrega", sub: "com Logzz ativa" },
                  { num: "3x", label: "Mais conversão", sub: "vs checkout manual" },
                  { num: "0", label: "Pedidos perdidos", sub: "no fallback Coinzz" },
                ].map((stat) => (
                  <div key={stat.num}>
                    <div className="text-2xl font-black text-emerald-400">{stat.num}</div>
                    <div className="text-xs font-semibold text-gray-300">{stat.label}</div>
                    <div className="text-[10px] text-gray-600">{stat.sub}</div>
                  </div>
                ))}
              </div>

              <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => navigate("/register")} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-base font-black text-black shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40 hover:-translate-y-0.5">
                  {s.hero.cta_primary || "Começar 7 dias grátis →"}
                </button>
                <button className="rounded-xl border border-white/10 px-8 py-4 text-base font-medium text-gray-300 transition hover:border-emerald-500/30 hover:text-white">
                  {s.hero.cta_secondary || "▶ Ver demonstração"}
                </button>
              </div>

              <div className="reveal mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                <span>✓ Sem cartão de crédito</span>
                <span>✓ Setup em 5 min</span>
                <span>✓ Suporte brasileiro</span>
              </div>
            </div>

            <div className="reveal hidden lg:block">
              <HeroAccordion />
            </div>
          </div>
        </div>
      </AnimatedGradientBackground>

      {/* LOGOS */}
      <section className="border-y border-white/5 bg-black/40 py-10">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-gray-600">{s.logos.title}</p>
        <InfiniteSlider>
          {s.logos.items.map((name) => (
            <span key={name} className="text-lg font-bold text-gray-600 transition hover:text-emerald-400">{name}</span>
          ))}
        </InfiniteSlider>
      </section>

      {/* PAIN POINTS */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">{pp.section_tag}</span>
            <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">
              {pp.section_title}<br /><span className="text-gray-500">{pp.section_subtitle}</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {pp.items.map((card) => (
              <div key={card.problem} className="reveal group relative rounded-2xl border border-white/10 bg-gray-950 p-6 transition-all hover:border-emerald-500/30">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="text-4xl">{card.emoji}</div>
                  <h3 className="mt-4 text-lg font-bold text-white">{card.problem}</h3>
                  <p className="mt-2 text-sm text-red-300/80">{card.pain}</p>
                  <div className="mt-4 flex items-start gap-2">
                    <span className="text-emerald-400">→</span>
                    <p className="text-sm text-emerald-300">{card.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHECKOUT HÍBRIDO */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <span className="reveal inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400">{cs.badge}</span>
          <h2 className="reveal mt-6 text-3xl font-black text-white md:text-5xl">
            {cs.title}<br /><span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">{cs.subtitle}</span>
          </h2>
          <p className="reveal mx-auto mt-6 max-w-2xl text-base text-gray-400">
            Seu cliente digita o CEP. O ScalaCOD verifica em tempo real.
            Logzz disponível? COD. Sem cobertura? Coinzz + Correios.{" "}
            <span className="font-bold text-emerald-400">{cs.highlight}</span>
          </p>

          <div className="reveal mt-14 grid gap-4 md:grid-cols-4">
            {cs.steps.map((step) => (
              <div key={step.step} className="rounded-xl border border-white/10 bg-gray-950/80 p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-xl">{step.icon}</div>
                <div className="text-sm font-bold text-white">{step.step}. {step.title}</div>
                <div className="mt-1 text-xs text-gray-500">{step.sub}</div>
              </div>
            ))}
          </div>

          <div className="reveal mt-10 inline-flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3">
            <span className="text-3xl font-black text-emerald-400">{cs.result_number}</span>
            <div className="text-left">
              <div className="text-sm font-bold text-white">{cs.result_title}</div>
              <div className="text-xs text-gray-400">{cs.result_subtitle}</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl space-y-24 px-4">
          {s.features.items.map((feat, i) => (
            <div key={i} className={`reveal flex flex-col items-center gap-12 lg:gap-16 md:flex-row ${feat.image_side === "left" ? "" : "md:flex-row-reverse"}`}>
              <div className="flex-1">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-950 p-1">
                  {feat.image_url ? (
                    <img src={feat.image_url} alt={feat.tag || feat.title} className="h-64 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="h-64 w-full rounded-xl bg-gradient-to-br from-emerald-950/50 to-gray-900 flex items-center justify-center text-gray-600 text-sm">
                      Screenshot {feat.tag}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-5">
                {feat.tag && <span className="text-xs font-bold tracking-widest text-emerald-400">{feat.tag}</span>}
                <h3 className="whitespace-pre-line text-3xl font-black leading-tight text-white md:text-4xl">{feat.title}</h3>
                <p className="text-base leading-relaxed text-gray-400">{feat.description}</p>
                <ul className="space-y-3">
                  {feat.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-sm text-gray-300">
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                      {b}
                    </li>
                  ))}
                </ul>
                {feat.highlight && <p className="text-sm font-semibold italic text-emerald-400">"{feat.highlight}"</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TOOLS SPOTLIGHT */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{tl.section_tag}</span>
            <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">
              {tl.section_title}<br /><span className="text-gray-500">{tl.section_subtitle}</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tl.items.map((tool) => (
              <SpotlightCard key={tool.name}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{tool.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{tool.name}</h4>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">{tool.badge}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">{tool.description}</p>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">RESULTADOS REAIS</span>
            <h2 className="mt-4 text-3xl font-black text-white">O que dizem os ninjas do COD</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {s.testimonials.items.map((t) => (
              <div key={t.author} className="reveal rounded-2xl border border-white/10 bg-gray-950 p-6">
                <div className="mb-3 flex gap-1">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400">★</span>)}
                </div>
                <p className="text-sm leading-relaxed text-gray-300">"{t.quote}"</p>
                {t.highlight && (
                  <div className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
                    Resultado: {t.highlight}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">{t.author[0]}</div>
                  <div>
                    <div className="text-sm font-bold text-white">{t.author}</div>
                    <div className="text-xs text-gray-500">{t.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">PLANOS</span>
            <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">
              {s.pricing.title || "Escolha o plano"}<br /><span className="text-gray-500">ideal para escalar.</span>
            </h2>
            <p className="mt-4 text-base text-gray-400">{s.pricing.subtitle}</p>
            <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-gray-950 p-1">
              <button onClick={() => setBilling("monthly")} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${billing === "monthly" ? "bg-emerald-500 text-black" : "text-gray-400"}`}>Mensal</button>
              <button onClick={() => setBilling("yearly")} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${billing === "yearly" ? "bg-emerald-500 text-black" : "text-gray-400"}`}>Anual -20%</button>
            </div>
          </div>

          {plans.length > 0 && (
            <div className="reveal mt-12 grid gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const planFeatures = Array.isArray(plan.features) ? plan.features as string[] : [];
                const price = billing === "yearly" && plan.price_yearly ? plan.price_yearly : plan.price_monthly;
                return (
                  <div key={plan.id} className={`relative rounded-2xl border p-6 transition-shadow hover:shadow-lg ${plan.is_featured ? "border-emerald-500/50 bg-gray-950 shadow-emerald-500/10 ring-1 ring-emerald-500/20" : "border-white/10 bg-gray-950"}`}>
                    {plan.is_featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-black">⭐ MAIS POPULAR</span>
                    )}
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <div className="mt-4 mb-6">
                      <span className="text-4xl font-black text-white">R$ {Number(price).toFixed(0)}</span>
                      <span className="text-gray-500">/mês</span>
                    </div>
                    <button onClick={() => navigate("/register")} className={`w-full rounded-xl py-3 text-sm font-bold transition ${plan.is_featured ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/25" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                      {s.pricing.cta_text || "Começar grátis por 7 dias"}
                    </button>
                    <ul className="mt-6 space-y-2">
                      {planFeatures.map((f: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="reveal mb-10 text-center text-3xl font-black text-white">{fq.title}</h2>
          {fq.items.map((faq) => <FAQ key={faq.q} q={faq.q} a={faq.a} />)}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/30 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <span className="reveal text-xs font-bold uppercase tracking-widest text-emerald-400">PRONTO PARA ESCALAR?</span>
          <h2 className="reveal mt-6 text-4xl font-black text-white md:text-6xl">
            {s.cta_final.title}<br /><span className="text-gray-500">Começa hoje.</span>
          </h2>
          <p className="reveal mt-6 text-base text-gray-400">
            {s.cta_final.subtitle}<br />
            Junte-se a +500 afiliados que já escalam com o ScalaCOD.
          </p>
          <button onClick={() => navigate("/register")} className="reveal mt-8 rounded-xl bg-emerald-500 px-10 py-4 text-lg font-black text-black shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:-translate-y-0.5">
            {s.cta_final.cta_text} 🥷
          </button>
          <div className="reveal mt-6 text-xs text-gray-500">
            {s.cta_final.bullets.map((b, i) => (
              <span key={i}>{i > 0 ? "  ·  " : ""}✓ {b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <PublicFooter />
    </div>
  );
}
