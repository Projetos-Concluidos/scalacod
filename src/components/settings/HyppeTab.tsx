import { useState, useEffect } from "react";
import { Package, Eye, EyeOff, Copy, CheckCircle, XCircle, Loader2, ExternalLink, Circle, PauseCircle } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const HyppeTab = () => {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const webhookUrl = user
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyppe-webhook?store=${user.id}`
    : "";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "hyppe")
        .maybeSingle();
      if (data) {
        const config = data.config as any;
        setToken(config?.api_token || "");
        setIsActive(data.is_active ?? false);
      }
    };
    load();
  }, [user]);

  const isConfigured = !!token.trim();

  const handleToggle = async (checked: boolean) => {
    setIsActive(checked);
    if (!user) return;
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "hyppe")
      .maybeSingle();
    if (existing) {
      await supabase.from("integrations").update({ is_active: checked }).eq("id", existing.id);
      toast.success(checked ? "Hyppe ativada" : "Hyppe desativada");
    }
  };

  const handleTestConnection = async () => {
    if (!token.trim()) {
      toast.error("Insira o API Token da Hyppe");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await handleSave(true);
      const { data, error } = await supabase.functions.invoke("test-integration", {
        body: { provider: "hyppe_tenant", credentials: { api_token: token } },
      });
      if (error) throw error;
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
        setIsActive(true);
        const { data: existing } = await supabase
          .from("integrations")
          .select("id")
          .eq("user_id", user!.id)
          .eq("type", "hyppe")
          .maybeSingle();
        if (existing) {
          await supabase.from("integrations").update({ is_active: true }).eq("id", existing.id);
        }
      } else {
        toast.error(data.message);
      }
    } catch (e: any) {
      const result = { success: false, message: e.message || "Erro ao testar conexão" };
      setTestResult(result);
      toast.error(result.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (silent?: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        type: "hyppe" as const,
        config: { api_token: token } as any,
        is_active: isActive,
      };
      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "hyppe")
        .maybeSingle();
      if (existing) {
        await supabase.from("integrations").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert(payload);
      }
      if (!silent) toast.success("Integração Hyppe salva!");
    } catch {
      toast.error("Erro ao salvar integração");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const renderStatus = () => {
    if (!isConfigured) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className="h-2 w-2" /> Não configurado
        </span>
      );
    }
    if (!isActive) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-warning">
          <PauseCircle className="h-3 w-3" /> Configurado mas inativo
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle className="h-3 w-3" /> Ativo e configurado
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="ninja-card">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
              <Package className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Hyppe</h2>
                <InfoTooltip
                  title="Como configurar a Hyppe:"
                  steps={[
                    <>Acesse <a href="https://app.hyppe.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">app.hyppe.com.br <ExternalLink className="inline h-3 w-3" /></a></>,
                    "Vá em Integrações → API → Token de Acesso",
                    "Copie o API Token e cole no campo abaixo",
                    "Clique em Testar Conexão para validar o token",
                  ]}
                />
              </div>
              <p className="text-xs text-muted-foreground">Plataforma híbrida: COD + Antecipado (Correios)</p>
              {renderStatus()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={handleToggle} />
            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : ""}>
              {isActive ? "ATIVO" : "INATIVO"}
            </Badge>
          </div>
        </div>

        <div className="mb-4 max-w-xl">
          <label className="text-sm font-medium text-foreground">API Token da Hyppe</label>
          <div className="relative mt-1.5">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole seu token aqui..."
              className="h-10 w-full rounded-lg border border-border bg-input px-4 pr-10 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${testResult.success ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
            {testResult.success ? <CheckCircle className="inline h-4 w-4 mr-1" /> : <XCircle className="inline h-4 w-4 mr-1" />}
            {testResult.message}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing || !token.trim()}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Testar Conexão
          </Button>
          <Button onClick={() => handleSave()} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Webhook Hyppe */}
      {isActive && (
        <div className="ninja-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
              <Package className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Webhook Hyppe</h2>
              <p className="text-xs text-muted-foreground">Receba atualizações de pedidos automaticamente</p>
            </div>
          </div>

          <div className="max-w-xl">
            <label className="text-sm font-medium text-foreground">URL do Webhook</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="h-10 flex-1 rounded-lg border border-border bg-input px-4 text-xs text-muted-foreground"
              />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure em{" "}
              <a href="https://app.hyppe.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                app.hyppe.com.br <ExternalLink className="inline h-3 w-3" />
              </a>{" "}
              → Webhooks → Pedidos
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-orange-500/10 bg-orange-500/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Modos suportados:</strong> COD (pagamento na entrega) e Antecipado (pagamento online + Correios).
              A Hyppe é uma plataforma híbrida que suporta ambos os modelos em um único checkout.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HyppeTab;
