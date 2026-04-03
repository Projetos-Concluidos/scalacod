import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeamRoleBadge from "@/components/TeamRoleBadge";

type Status = "loading" | "success" | "error" | "no-token";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>(token ? "loading" : "no-token");
  const [role, setRole] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (!token || !user || processed) return;

    const accept = async () => {
      setStatus("loading");
      try {
        const { data, error } = await supabase.functions.invoke("team-invite", {
          body: { token },
        });

        if (error) {
          setStatus("error");
          setErrorMsg(error.message || "Erro ao processar convite");
          return;
        }

        if (data?.error) {
          setStatus("error");
          setErrorMsg(data.error);
          return;
        }

        setRole(data?.role || "viewer");
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMsg("Erro de conexão. Tente novamente.");
      }
      setProcessed(true);
    };

    accept();
  }, [token, user, processed]);

  // Still checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in → redirect to login with return URL
  if (!user) {
    const redirect = `/accept-invite?token=${encodeURIComponent(token || "")}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (status === "no-token") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Token não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">O link de convite está incompleto ou inválido.</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-6">
            Ir para o Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Processando convite…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Aguarde enquanto validamos seu convite.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Convite aceito! 🎉</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você foi adicionado à equipe como:
            </p>
            <div className="mt-3 flex justify-center">
              <TeamRoleBadge role={role as any} />
            </div>
            <Button onClick={() => navigate("/dashboard")} className="mt-6 w-full">
              <Users className="mr-2 h-4 w-4" />
              Ir para o Dashboard
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Erro no convite</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="mt-6">
              Ir para o Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
