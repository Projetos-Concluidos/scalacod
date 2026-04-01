import { useState, useEffect } from "react";
import { CreditCard, Eye, EyeOff, CheckCircle, XCircle, Loader2, ExternalLink, Circle, PauseCircle } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MercadoPagoTab = () => {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "mercadopago")
        .maybeSingle();
      if (data) {
        const config = data.config as any;
        setAccessToken(config?.access_token || "");
        setPublicKey(config?.public_key || "");
        setIsActive(data.is_active ?? false);
      }
    };
    load();
  }, [user]);

  const isConfigured = !!(accessToken.trim() && publicKey.trim());

  const handleToggle = async (checked: boolean) => {
    setIsActive(checked);
    if (!user) return;
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "mercadopago")
      .maybeSingle();
    if (existing) {
      await supabase.from("integrations").update({ is_active: checked }).eq("id", existing.id);
      toast.success(checked ? "MercadoPago ativado" : "MercadoPago desativado");
    }
  };

  const handleTestConnection = async () => {
    if (!accessToken.trim()) {
      toast.error("Insira o Access Token do MercadoPago");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Save first
      await handleSave(true);
      // Then test via edge function
      const { data, error } = await supabase.functions.invoke("test-integration", {
        body: { provider: "mercadopago_tenant", credentials: { access_token: accessToken } },
      });
      if (error) throw error;
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
        setIsActive(true);
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
        type: "mercadopago" as const,
        config: { access_token: accessToken, public_key: publicKey } as any,
        is_active: isActive,
      };
      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "mercadopago")
        .maybeSingle();
      if (existing) {
        await supabase.from("integrations").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert(payload);
      }
      if (!silent) toast.success("Integração MercadoPago salva!");
    } catch {
      toast.error("Erro ao salvar integração");
    } finally {
      setSaving(false);
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

  return (
    <div className="ninja-card">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(210,100%,50%)]/10">
            <CreditCard className="h-5 w-5 text-[hsl(210,100%,50%)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">MercadoPago</h2>
              <InfoTooltip
                title="Como configurar o MercadoPago:"
                steps={[
                  <>Acesse <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">mercadopago.com.br/developers <ExternalLink className="inline h-3 w-3" /></a></>,
                  "Vá em Suas Integrações → Crie ou selecione uma aplicação",
                  "Em Credenciais de Produção, copie o Access Token e a Public Key",
                  "Cole os valores nos campos abaixo e clique em Salvar",
                ]}
                warning="⚠️ Use credenciais de produção, não de teste. O Access Token começa com APP_USR-"
              />
            </div>
            <p className="text-xs text-muted-foreground">Processador de pagamentos para pedidos Coinzz</p>
            {renderStatus()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={handleToggle} />
          <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-success/10 text-success border-success/20" : ""}>
            {isActive ? "ATIVO" : "INATIVO"}
          </Badge>
        </div>
      </div>

      {/* Access Token */}
      <div className="mb-4 max-w-xl">
        <label className="text-sm font-medium text-foreground">Access Token (produção)</label>
        <div className="relative mt-1.5">
          <input
            type={showAccessToken ? "text" : "password"}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="APP_USR-..."
            className="h-10 w-full rounded-lg border border-border bg-input px-4 pr-10 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowAccessToken(!showAccessToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Encontre em <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mercadopago.com.br/developers</a> → Sua aplicação → Credenciais de produção
        </p>
      </div>

      {/* Public Key */}
      <div className="mb-6 max-w-xl">
        <label className="text-sm font-medium text-foreground">Public Key</label>
        <input
          type="text"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Usada no frontend para tokenizar o cartão de crédito do comprador (Bricks SDK).
        </p>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${testResult.success ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
          {testResult.success ? <CheckCircle className="inline h-4 w-4 mr-1" /> : <XCircle className="inline h-4 w-4 mr-1" />}
          {testResult.message}
        </div>
      )}

      <div className="mb-6 flex gap-3">
        <Button variant="outline" onClick={handleTestConnection} disabled={testing || !accessToken.trim()}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Testar Conexão
        </Button>
        <Button onClick={() => handleSave()} disabled={saving} className="gradient-primary text-primary-foreground">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Info sobre métodos */}
      <div className="rounded-lg border border-primary/10 bg-primary/5 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-foreground">Métodos de pagamento disponíveis no checkout Coinzz:</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { emoji: "📱", name: "PIX", desc: "QR Code + Copia e Cola" },
            { emoji: "💳", name: "Cartão", desc: "Bricks SDK (PCI)" },
            { emoji: "📄", name: "Boleto", desc: "3 dias úteis" },
            { emoji: "💰", name: "Saldo MP", desc: "Redirect checkout" },
          ].map((m) => (
            <div key={m.name} className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
              <span className="text-lg">{m.emoji}</span>
              <div>
                <p className="text-xs font-medium text-foreground">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MercadoPagoTab;
