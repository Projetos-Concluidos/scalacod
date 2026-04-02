import { useState, useEffect } from "react";
import { Key, Copy, RefreshCw, Loader2, ExternalLink, Clock } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGate, UpgradePrompt } from "@/hooks/useFeatureGate";

const ENDPOINTS = [
  { method: "POST", path: "/api/v1/orders", desc: "Criar pedido" },
  { method: "GET", path: "/api/v1/orders", desc: "Listar pedidos" },
  { method: "GET", path: "/api/v1/orders/:id", desc: "Detalhes do pedido" },
  { method: "GET", path: "/api/v1/leads", desc: "Listar leads" },
  { method: "POST", path: "/api/v1/leads", desc: "Criar lead" },
  { method: "GET", path: "/api/v1/delivery-options/:cep", desc: "Opções de entrega por CEP" },
];

const methodColor: Record<string, string> = {
  GET: "bg-success/10 text-success border-success/20",
  POST: "bg-primary/10 text-primary border-primary/20",
};

const ApiTab = () => {
  const { user } = useAuth();
  const gate = useFeatureGate("api_access");
  const [tokens, setTokens] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("api_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTokens(data);
      });
  }, [user]);

  const generateToken = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      // Deactivate existing tokens
      if (tokens.length > 0) {
        await supabase
          .from("api_tokens")
          .update({ is_active: false })
          .eq("user_id", user.id);
      }
      const { data, error } = await supabase
        .from("api_tokens")
        .insert({ user_id: user.id, name: "API Token" })
        .select()
        .single();
      if (error) throw error;
      if (data) setTokens([data]);
      toast.success("Novo token gerado!");
    } catch {
      toast.error("Erro ao gerar token");
    } finally {
      setGenerating(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copiado!");
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  const formatRelative = (d: string | null) => {
    if (!d) return "Nunca";
    const diff = Date.now() - new Date(d).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "há poucos minutos";
    if (hours < 24) return `há ${hours}h`;
    return `há ${Math.floor(hours / 24)} dias`;
  };

  const activeToken = tokens[0];

  if (!gate.allowed) return <UpgradePrompt reason={gate.reason} />;

  return (
    <div className="space-y-6">
      {/* Token */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Token de Autenticação</h2>
              <InfoTooltip
                title="Como usar a API:"
                steps={[
                  "Gere um token clicando no botão abaixo",
                  "Copie o token e adicione no header Authorization: Bearer <token>",
                  "Use os endpoints listados na documentação para integrar",
                ]}
              />
            </div>
            <p className="text-xs text-muted-foreground">Use este token para autenticar requisições à API do ScalaCOD</p>
          </div>
        </div>

        {activeToken ? (
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Token Ativo:</p>
            <div className="mb-3 flex items-center gap-2">
              <code className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground font-mono truncate">
                {activeToken.token}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyToken(activeToken.token)}>
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={generateToken} disabled={generating}>
                <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
                Regenerar
              </Button>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span>Criado em: {formatDate(activeToken.created_at)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Última utilização: {formatRelative(activeToken.last_used_at)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="mb-3 text-sm text-muted-foreground">Nenhum token ativo. Gere um para começar.</p>
            <Button onClick={generateToken} disabled={generating} className="gradient-primary text-primary-foreground">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Gerar Novo Token
            </Button>
          </div>
        )}
      </div>

      {/* Documentação */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
            <ExternalLink className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Documentação da API</h2>
            <p className="text-xs text-muted-foreground">Endpoints disponíveis para integração</p>
          </div>
        </div>

        <div className="space-y-2">
          {ENDPOINTS.map((ep) => (
            <div key={ep.path + ep.method} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`font-mono text-[10px] px-2 py-0.5 ${methodColor[ep.method] || ""}`}>
                  {ep.method}
                </Badge>
                <code className="text-xs font-mono text-foreground">{ep.path}</code>
                <span className="text-xs text-muted-foreground">— {ep.desc}</span>
              </div>
              <button className="text-xs text-primary hover:underline">Ver documentação</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApiTab;
