import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ShurikenLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="shuriken-reg" x1="0" y1="0" x2="32" y2="32">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>
    <path d="M16 2L20 12L30 16L20 20L16 30L12 20L2 16L12 12Z" fill="url(#shuriken-reg)" />
    <circle cx="16" cy="16" r="3" fill="#030712" />
  </svg>
);

const phrases = [
  "Comece em 5 minutos.",
  "COD automático te espera.",
  "Logzz + Coinzz unificados.",
  "Zero pedido perdido.",
  "Escale sem parar.",
];

const Register = () => {
  const { signUp, user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPhraseIndex((i) => (i + 1) % phrases.length), 3500);
    return () => clearInterval(interval);
  }, []);

  if (authLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    if (!terms) { setError("Você precisa aceitar os termos de uso"); return; }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    if (error) setError(error.message); else setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] px-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="text-xl font-bold text-white">Verifique seu e-mail</h2>
          <p className="mt-2 text-sm text-gray-400">
            Enviamos um link de confirmação para <strong className="text-white">{email}</strong>. Clique no link para ativar sua conta.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-emerald-400 hover:underline">
            Voltar para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#030712]">
      {/* Left — Form */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, #10B981 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[100px]" />

        <div className="relative w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3">
            <ShurikenLogo size={40} />
            <div>
              <h1 className="text-2xl font-black text-white">ScalaCOD</h1>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">Obsidian Edition</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white">Crie sua conta ninja. 🥷</h2>
          <p className="mt-1 text-sm text-gray-500">7 dias grátis. Sem cartão de crédito.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Nome completo</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required
                className="h-11 w-full rounded-xl border border-white/10 bg-gray-900 px-4 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required
                className="h-11 w-full rounded-xl border border-white/10 bg-gray-900 px-4 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Senha</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required
                  className="h-11 w-full rounded-xl border border-white/10 bg-gray-900 px-4 pr-10 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-700 accent-emerald-500" />
              <span className="text-xs text-gray-500">
                Aceito os <a href="#" className="text-emerald-400 hover:underline">Termos de Uso</a> e a{" "}
                <a href="#" className="text-emerald-400 hover:underline">Política de Privacidade</a>
              </span>
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-black text-black transition-all hover:bg-emerald-400 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta grátis →"}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-6 flex justify-center gap-6">
            {[
              { icon: "⚡", text: "Setup em 5 min" },
              { icon: "🔒", text: "Dados seguros" },
              { icon: "💬", text: "Suporte BR" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
          </div>

          <p className="text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-emerald-400 hover:underline">Entrar →</Link>
          </p>
        </div>
      </div>

      {/* Right — Image (desktop) */}
      <div className="relative hidden flex-1 lg:flex">
        <img
          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80"
          alt="Analytics dashboard"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-[#030712]/60 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <AnimatePresence mode="wait">
            <motion.p
              key={phraseIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="text-2xl font-black text-white"
            >
              {phrases[phraseIndex]}
            </motion.p>
          </AnimatePresence>
          <p className="mt-2 text-sm text-gray-400">ScalaCOD — Automação COD</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
