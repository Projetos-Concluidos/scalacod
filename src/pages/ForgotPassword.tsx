import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthLogo from "@/components/AuthLogo";
import { Loader2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[480px]">
        <AuthLogo />
        <div className="ninja-card">
          {sent ? (
            <div className="text-center">
              <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">E-mail enviado!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Se existe uma conta com <strong className="text-foreground">{email}</strong>, você receberá um link de recuperação.
              </p>
              <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
                Voltar para login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-xl font-bold text-foreground">Recuperar senha</h2>
              <p className="mb-6 text-sm text-muted-foreground">Informe seu e-mail para receber o link de recuperação.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-primary flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de recuperação"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Voltar para login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
