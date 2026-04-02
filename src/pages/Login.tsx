import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeSettings } from "@/hooks/useHomeSettings";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScalaCODLogo, { ScalaCODBrandName } from "@/components/ScalaCODLogo";

const Login = () => {
  const { signIn, user, loading: authLoading } = useAuth();
  const { data: settings } = useHomeSettings();
  const lp = settings?.login_page;
  const brand = settings?.brand;

  const phrases = lp?.phrases?.length ? lp.phrases : [
    "Seu COD no piloto automático.",
    "Logzz + Coinzz. Automático.",
    "Zero pedido perdido.",
    "WhatsApp que trabalha por você.",
    "Checkout que pensa.",
  ];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPhraseIndex((i) => (i + 1) % phrases.length), 3500);
    return () => clearInterval(interval);
  }, [phrases.length]);

  if (authLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#030712]">
      {/* Left — Form */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, #10B981 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[100px]" />

        <div className="relative w-full max-w-[420px]">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <ScalaCODLogo size={40} />
            <div>
              <h1 className="text-2xl font-black"><ScalaCODBrandName /></h1>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">{brand?.edition_label || "Obsidian Edition"}</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white">{lp?.title || "Bem-vindo de volta 🥷"}</h2>
          <p className="mt-1 text-sm text-gray-500">{lp?.subtitle || "Entre para acessar seu painel COD"}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-gray-900 px-4 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-400">Senha</label>
                <Link to="/forgot-password" className="text-xs text-emerald-400 hover:underline">Esqueceu a senha?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-gray-900 px-4 pr-10 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-black text-black transition-all hover:bg-emerald-400 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar →"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center"><span className="bg-[#030712] px-3 text-xs text-gray-600">ou continue com</span></div>
          </div>

          <p className="text-center text-sm text-gray-500">
            Novo por aqui?{" "}
            <Link to="/register" className="font-semibold text-emerald-400 hover:underline">Criar conta grátis →</Link>
          </p>
        </div>
      </div>

      {/* Right — Image (desktop) */}
      <div className="relative hidden flex-1 lg:flex">
        <img
          src={lp?.image_url || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80"}
          alt={lp?.image_alt || "Dashboard"}
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
          <p className="mt-2 text-sm text-gray-400">{lp?.bottom_text || "ScalaCOD — Automação COD"}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
