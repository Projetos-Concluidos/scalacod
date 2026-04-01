import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useHomeSettings } from "@/hooks/useHomeSettings";
import { supabase } from "@/integrations/supabase/client";
import { Star, Check, Menu, X, Zap, ShoppingCart, MessageSquare, BarChart3, CheckCircle, Monitor, Image as ImageIcon, Crown } from "lucide-react";
import heroMock from "@/assets/home-hero-mock.jpg";
import featureCheckout from "@/assets/home-feature-checkout.jpg";
import featureWhatsapp from "@/assets/home-feature-whatsapp.jpg";
import featureAnalytics from "@/assets/home-feature-analytics.jpg";

const featureIcons = [ShoppingCart, MessageSquare, BarChart3];
const featureFallbacks = [featureCheckout, featureWhatsapp, featureAnalytics];

export default function Home() {
  const { data: s, isLoading } = useHomeSettings();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => { if (data) setPlans(data); });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("revealed")),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isLoading]);

  if (isLoading || !s) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-['Sora',sans-serif]">
      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-emerald-500" />
            <span className="text-xl font-extrabold tracking-tight">{s.navbar.logo_text}</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            {s.navbar.links.map((link) => (
              <a key={link} href={link === "Login" ? "/login" : link === "Planos" ? "#pricing" : "#features"} className="text-sm font-medium text-gray-600 transition hover:text-emerald-600">
                {link}
              </a>
            ))}
            <button onClick={() => navigate("/register")} className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-white transition hover:bg-emerald-600">
              {s.navbar.cta_text}
            </button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden">
            {s.navbar.links.map((link) => (
              <a key={link} href={link === "Login" ? "/login" : "#"} className="block py-2 text-sm font-medium text-gray-600" onClick={() => setMenuOpen(false)}>
                {link}
              </a>
            ))}
            <button onClick={() => { navigate("/register"); setMenuOpen(false); }} className="mt-2 w-full rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-white">
              {s.navbar.cta_text}
            </button>
          </div>
        )}
      </nav>

      {/* HERO — Premium */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          {/* Social proof badge */}
          <div className="reveal mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
            <span className="flex -space-x-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-white" />
              ))}
            </span>
            <span className="text-sm font-semibold text-emerald-700">{s.hero.social_proof_text}</span>
          </div>

          <h1 className="reveal text-5xl font-black leading-[1.05] text-gray-900 sm:text-6xl md:text-7xl lg:text-8xl tracking-tight">
            {s.hero.title_line1}{" "}
            <span className="text-emerald-500">{s.hero.highlight_word}</span>
            <br />
            {s.hero.title_line2}
          </h1>

          <p className="reveal mx-auto mt-6 max-w-3xl text-lg text-gray-500 md:text-xl leading-relaxed">
            {s.hero.subtitle}
          </p>

          <div className="reveal mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/register")}
              className="rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
            >
              {s.hero.cta_primary}
            </button>
            <button className="rounded-2xl border-2 border-gray-200 px-8 py-4 text-lg font-medium text-gray-700 transition-all hover:border-emerald-300 hover:text-emerald-600">
              {s.hero.cta_secondary}
            </button>
          </div>

          <div className="reveal mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1 font-semibold text-gray-700">{s.hero.social_proof_rating}</span>
            </div>
          </div>

          {/* Hero screenshot */}
          <div className="reveal relative mt-14 max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-200/20 via-emerald-100/10 to-emerald-200/20 rounded-3xl blur-2xl pointer-events-none" />
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-300/50">
              <img
                src={s.hero.screenshot_url || heroMock}
                alt="ScalaNinja Dashboard"
                className="w-full"
                width={1200}
                height={700}
              />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <section className="border-y border-gray-100 bg-gray-50/50 py-12">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="reveal mb-8 text-sm font-medium uppercase tracking-wider text-gray-400">{s.logos.title}</p>
          <div className="reveal flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {s.logos.items.map((name) => (
              <span key={name} className="text-lg font-bold text-gray-300 transition hover:text-emerald-500">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — alternating with fallback images */}
      <section id="features" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 space-y-28">
          {s.features.items.map((feat, i) => {
            const Icon = featureIcons[i] || Zap;
            const isRight = feat.image_side === "right";
            const fallbackImg = featureFallbacks[i];
            return (
              <div key={i} className={`reveal flex flex-col items-center gap-12 lg:gap-16 md:flex-row ${isRight ? "md:flex-row-reverse" : ""}`}>
                <div className="flex-1">
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xl">
                    <img
                      src={feat.image_url || fallbackImg}
                      alt={feat.title}
                      className="w-full"
                      loading="lazy"
                      width={800}
                      height={600}
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-5">
                  <span className="text-xs font-bold text-emerald-600 tracking-wider uppercase">
                    {i === 0 ? "CHECKOUT INTELIGENTE" : i === 1 ? "WHATSAPP AUTOMATION" : "ANALYTICS COMPLETO"}
                  </span>
                  <h3 className="text-3xl font-black text-gray-900 leading-tight md:text-4xl">{feat.title}</h3>
                  <p className="text-base text-gray-500 leading-relaxed">{feat.description}</p>
                  <ul className="space-y-3">
                    {feat.bullets.map((b, j) => (
                      <li key={j} className="flex items-center gap-3 text-gray-700">
                        <CheckCircle className="h-[18px] w-[18px] text-emerald-500 flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="reveal text-3xl font-extrabold text-gray-900 md:text-4xl">{s.pricing.title}</h2>
          <p className="reveal mt-4 text-lg text-gray-500">{s.pricing.subtitle}</p>
          <div className="reveal mt-10">
            <button onClick={() => navigate("/register")} className="rounded-2xl bg-emerald-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600">
              {s.pricing.cta_text}
            </button>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {s.testimonials.items.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="reveal mb-12 text-center text-3xl font-extrabold text-gray-900">O que nossos clientes dizem</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {s.testimonials.items.map((t, i) => (
                <div key={i} className="reveal rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="mb-4 flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">"{t.quote}"</p>
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold text-gray-900">{t.author}</p>
                    <p className="text-xs text-gray-400">{t.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="bg-gray-900 py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="reveal text-3xl font-extrabold text-white md:text-5xl">{s.cta_final.title}</h2>
          <p className="reveal mt-4 text-lg text-gray-400">{s.cta_final.subtitle}</p>
          <div className="reveal mt-8">
            <button onClick={() => navigate("/register")} className="rounded-2xl bg-emerald-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 hover:-translate-y-0.5">
              {s.cta_final.cta_text}
            </button>
          </div>
          <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            {s.cta_final.bullets.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              <span className="text-lg font-extrabold">{s.footer.logo_text}</span>
            </div>
            <p className="mt-2 text-sm text-gray-400">{s.footer.tagline}</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-gray-900">{s.footer.col1_title}</h4>
            <ul className="space-y-2">
              {s.footer.col1_links.map((l) => (
                <li key={l}><a href="#" className="text-sm text-gray-400 hover:text-emerald-500">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-gray-900">{s.footer.col2_title}</h4>
            <ul className="space-y-2">
              {s.footer.col2_links.map((l) => (
                <li key={l}><a href="#" className="text-sm text-gray-400 hover:text-emerald-500">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-gray-900">Contato</h4>
            <a href={`mailto:${s.footer.email}`} className="text-sm text-gray-400 hover:text-emerald-500">{s.footer.email}</a>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-gray-100 px-4 pt-6 text-center text-xs text-gray-400">
          {s.footer.copyright}
        </div>
      </footer>
    </div>
  );
}
