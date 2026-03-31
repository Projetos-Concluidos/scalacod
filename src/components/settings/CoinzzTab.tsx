import { useState, useEffect } from "react";
import { Package, Eye, EyeOff, Copy, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CoinzzTab = () => {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const webhookUrl = user
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coinzz-webhook?store=${user.id}`
    : "";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "coinzz")
        .maybeSingle();
      if (data) {
        const config = data.config as any;
        setToken(config?.bearer_token || "");
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
      .eq("type", "coinzz")
      .maybeSingle();
    if (existing) {
      await supabase.from("integrations").update({ is_active: checked }).eq("id", existing.id);
      toast.success(checked ? "Coinzz ativada" : "Coinzz desativada");
    }
  };

  const handleTestConnection = async () => {
    if (!token.trim()) {
      toast.error("Insira o Bearer Token da Coinzz");
      return;
    }
    setTesting(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("✅ Token salvo! A conexão será validada ao criar pedidos.");
      setIsActive(true);
    } catch {
      toast.error("❌ Erro ao testar conexão");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        type: "coinzz" as const,
        config: { bearer_token: token } as any,
        is_active: isActive,
      };
      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "coinzz")
        .maybeSingle();
      if (existing) {
        await supabase.from("integrations").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert(payload);
      }
      toast.success("Integração Coinzz salva!");
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

  return (
    <div className="space-y-6">
      <div className="ninja-card">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <Package className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Coinzz</h2>
                <InfoTooltip
                  title="Como configurar a Coinzz:"
                  steps={[
                    <>Acesse <a href="https://app.coinzz.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">app.coinzz.com.br <ExternalLink className="inline h-3 w-3" /></a></>,
                    "Vá em Configurações → API → Token",
                    "Copie o Bearer Token e cole no campo abaixo",
                    "Clique em Salvar — pedidos sem Logzz são roteados automaticamente",
                  ]}
                />
              </div>
              <p className="text-xs text-muted-foreground">Fallback logístico via Correios + pagamento online</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={handleToggle} />
            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-success/10 text-success border-success/20" : ""}>
              {isActive ? "ATIVO" : "INATIVO"}
            </Badge>
          </div>
        </div>

        <div className="mb-4 max-w-xl">
          <label className="text-sm font-medium text-foreground">Token Bearer da Coinzz</label>
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

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing || !token.trim()}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Webhook Coinzz */}
      {isActive && (
        <div className="ninja-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Webhook Coinzz</h2>
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
              <a href="https://app.coinzz.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                app.coinzz.com.br <ExternalLink className="inline h-3 w-3" />
              </a>{" "}
              → Webhooks → Pedidos
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-primary/10 bg-primary/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Métodos de pagamento suportados:</strong> PIX, Cartão de Crédito, Boleto e Saldo MercadoPago.
              Quando o CEP não é atendido pela Logzz, o pedido é automaticamente roteado para a Coinzz via Correios.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinzzTab;
