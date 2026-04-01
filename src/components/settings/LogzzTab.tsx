import { useState, useEffect } from "react";
import { Truck, Eye, EyeOff, Copy, CheckCircle, XCircle, Loader2, MapPin, Package, ExternalLink, Circle, PauseCircle } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CepResult {
  available: boolean;
  operation?: string;
  city?: string;
  dates?: Array<{ date: string; type: string; price: number }>;
  error?: string;
}

const LogzzTab = () => {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [logzzWebhookUrl, setLogzzWebhookUrl] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cep, setCep] = useState("");
  const [checkingCep, setCheckingCep] = useState(false);
  const [cepResult, setCepResult] = useState<CepResult | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isConfigured = !!(token.trim() && logzzWebhookUrl.trim());

  const webhookUrl = user
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/logzz-webhook?store=${user.id}`
    : "";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "logzz")
        .maybeSingle();
      if (data) {
        const config = data.config as any;
        setToken(config?.bearer_token || "");
        setLogzzWebhookUrl(config?.logzz_webhook_url || "");
        setIsActive(data.is_active ?? false);
      }
    };
    load();
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    setIsActive(checked);
    if (!user) return;
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "logzz")
      .maybeSingle();
    if (existing) {
      await supabase.from("integrations").update({ is_active: checked }).eq("id", existing.id);
      toast.success(checked ? "Logzz ativada" : "Logzz desativada");
    }
  };

  const callCheckoutApi = async (action: string, extra: any = {}) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/checkout-api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, user_id: user?.id, ...extra }),
    });
    return res.json();
  };

  const handleTestConnection = async () => {
    if (!token.trim()) { toast.error("Insira o Bearer Token da Logzz"); return; }
    if (!logzzWebhookUrl.trim()) { toast.error("Insira a URL de Importação de Pedidos da Logzz"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      await handleSave(true);
      // Real test via edge function
      const { data, error } = await supabase.functions.invoke("test-integration", {
        body: { provider: "logzz_tenant", credentials: { bearer_token: token } },
      });
      if (error) throw error;
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
        setIsActive(true);
        const { data: existing } = await supabase
          .from("integrations").select("id").eq("user_id", user!.id).eq("type", "logzz").maybeSingle();
        if (existing) await supabase.from("integrations").update({ is_active: true }).eq("id", existing.id);
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

  const handleSave = async (forceActive?: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const autoActive = !!(token.trim() && logzzWebhookUrl.trim());
      const finalActive = forceActive !== undefined ? forceActive : (autoActive || isActive);
      
      const payload = {
        user_id: user.id,
        type: "logzz" as const,
        config: { bearer_token: token, logzz_webhook_url: logzzWebhookUrl } as any,
        is_active: finalActive,
      };

      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "logzz")
        .maybeSingle();

      if (existing) {
        await supabase.from("integrations").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert(payload);
      }
      
      setIsActive(finalActive);
      toast.success("Integração Logzz salva!");
    } catch {
      toast.error("Erro ao salvar integração");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckCep = async () => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) { toast.error("CEP inválido"); return; }
    setCheckingCep(true);
    setCepResult(null);
    try {
      const data = await callCheckoutApi("check_delivery", { cep: clean });
      if (data.provider === "logzz" && data.dates?.length > 0) {
        setCepResult({ available: true, operation: "Logzz", city: "", dates: data.dates });
      } else {
        setCepResult({ available: false, error: data.message || "CEP não atendido pela Logzz" });
      }
    } catch {
      setCepResult({ available: false, error: "Erro ao verificar CEP" });
    } finally {
      setCheckingCep(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };

  return (
    <div className="space-y-6">
      {/* Card Principal Logzz */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Logzz</h2>
                <InfoTooltip
                  title="Como configurar a Logzz:"
                  steps={[
                    <>Acesse <a href="https://app.logzz.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">app.logzz.com.br <ExternalLink className="inline h-3 w-3" /></a></>,
                    "Vá em Configurações → API e copie o Bearer Token",
                    "Vá em Remapeamento → URL de webhook e copie a URL de importação",
                    "Cole os valores nos campos abaixo e clique em Testar Conexão",
                  ]}
                />
              </div>
              <p className="text-xs text-muted-foreground">Logística para vendas COD</p>
              {renderStatus()}
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={handleToggle} />
            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-success/10 text-success border-success/20" : ""}>
              {isActive ? "ATIVO" : "INATIVO"}
            </Badge>
          </div>
        </div>

        {/* Formulário Token */}
        <div className="mb-4 max-w-xl">
          <label className="text-sm font-medium text-foreground">Bearer Token da Logzz</label>
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

        {/* URL de Importação Logzz */}
        <div className="mb-4 max-w-xl">
          <label className="text-sm font-medium text-foreground">URL de Importação de Pedidos (Logzz)</label>
          <div className="relative mt-1.5 flex gap-2">
            <input
              type="text"
              value={logzzWebhookUrl}
              onChange={(e) => setLogzzWebhookUrl(e.target.value)}
              placeholder="https://app.logzz.com.br/api/importacao-de-pedidos/webhook/..."
              className="h-10 flex-1 rounded-lg border border-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            {logzzWebhookUrl && (
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(logzzWebhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cole a URL de importação/webhook da Logzz. Usada para enviar pedidos do ScalaNinja para a Logzz.
          </p>
        </div>

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

      {/* Verificação de CEP */}
      {isActive && (
        <div className="ninja-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <MapPin className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Verificação de CEP</h2>
              <p className="text-xs text-muted-foreground">Verifique a cobertura de entrega por CEP</p>
            </div>
          </div>

          <div className="flex max-w-md items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(formatCep(e.target.value))}
                placeholder="01310-100"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <Button onClick={handleCheckCep} disabled={checkingCep}>
              {checkingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
            </Button>
          </div>

          {cepResult && (
            <div className={`mt-4 rounded-lg border p-4 ${cepResult.available ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"}`}>
              {cepResult.available ? (
                <>
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">CEP atendido pela Logzz</span>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">{cepResult.operation} — {cepResult.city}</p>
                  <p className="mb-2 text-xs font-medium text-foreground">Datas disponíveis:</p>
                  <div className="space-y-1">
                    {cepResult.dates?.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>•</span>
                        <span>{d.date} ({d.type} — R$ {d.price.toFixed(2)})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{cepResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Webhook */}
      {isActive && (
        <div className="ninja-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Webhook Logzz</h2>
              <p className="text-xs text-muted-foreground">Configure na Logzz para receber atualizações de pedidos</p>
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
              <a href="https://app.logzz.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                app.logzz.com.br <ExternalLink className="inline h-3 w-3" />
              </a>{" "}
              → Configurações → Webhook → Eventos: Pedidos, Expedição Tradicional
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogzzTab;
