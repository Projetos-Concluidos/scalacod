import { useState, useEffect } from "react";
import { Eye, EyeOff, Copy, ExternalLink, Save, CheckCircle, Loader2, Send, Unplug, Facebook } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

const MetaTab = () => {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [loading, setLoading] = useState(false);
  const [instanceData, setInstanceData] = useState<any>(null);

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook?user_id=${user?.id || ""}&provider=meta`;
  const verifyToken = `scalaninja_verify_${user?.id?.slice(0, 8) || "token"}`;

  useEffect(() => {
    if (user) fetchInstance();
  }, [user]);

  const fetchInstance = async () => {
    const { data } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user!.id)
      .eq("provider", "meta")
      .maybeSingle();

    if (data) {
      setInstanceData(data);
      setAccessToken(data.meta_access_token || "");
      setPhoneNumberId(data.phone_number_id || "");
      setWabaId(data.waba_id || "");
      setStatus(data.status === "connected" ? "connected" : "disconnected");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleConnect = async () => {
    if (!accessToken.trim() || !phoneNumberId.trim() || !wabaId.trim()) {
      toast.error("Preencha Access Token, Phone Number ID e WABA ID");
      return;
    }

    setLoading(true);
    setStatus("connecting");

    try {
      const payload = {
        user_id: user!.id,
        provider: "meta" as const,
        instance_name: "Meta Cloud API",
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim(),
        meta_access_token: accessToken.trim(),
        status: "connected",
        webhook_url: webhookUrl,
        config: { app_secret: appSecret.trim(), verify_token: verifyToken },
      };

      if (instanceData) {
        await supabase.from("whatsapp_instances").update(payload).eq("id", instanceData.id);
      } else {
        await supabase.from("whatsapp_instances").insert(payload);
      }

      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("user_id", user!.id)
        .eq("type", "meta")
        .maybeSingle();

      const integrationPayload = {
        user_id: user!.id,
        type: "meta",
        config: {
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim(),
        },
        is_active: true,
      };

      if (existing) {
        await supabase.from("integrations").update(integrationPayload).eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert(integrationPayload);
      }

      setStatus("connected");
      toast.success("Meta Cloud API conectada com sucesso!");
      await fetchInstance();
    } catch {
      setStatus("disconnected");
      toast.error("Erro ao conectar Meta Cloud API");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!instanceData) return;
    setLoading(true);
    try {
      await supabase.from("whatsapp_instances").update({ status: "disconnected" }).eq("id", instanceData.id);
      await supabase.from("integrations").update({ is_active: false }).eq("user_id", user!.id).eq("type", "meta");
      setStatus("disconnected");
      setInstanceData({ ...instanceData, status: "disconnected" });
      toast.success("Meta Cloud API desconectada");
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!instanceData) return;
    setLoading(true);
    try {
      await supabase
        .from("whatsapp_instances")
        .update({
          meta_access_token: accessToken.trim(),
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim(),
          config: { app_secret: appSecret.trim(), verify_token: verifyToken },
        })
        .eq("id", instanceData.id);
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Embedded Signup CTA */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877F2]/10">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Embedded Signup (Recomendado)</h3>
              <InfoTooltip
                title="Como configurar a Meta Cloud API:"
                steps={[
                  <>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">developers.facebook.com <ExternalLink className="inline h-3 w-3" /></a></>,
                  "Crie um app do tipo Business e adicione o produto WhatsApp",
                  "Copie o Access Token permanente, Phone Number ID e WABA ID",
                  "Cole nos campos de Configuração Manual abaixo",
                ]}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Conecte automaticamente via Facebook Business. Requer configuração do Meta App ID.
            </p>
            <button
              disabled
              className="mt-3 flex items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
            >
              <Facebook className="h-4 w-4" /> Conectar via Facebook Business
              <span className="ml-1 text-[10px] opacity-75">(Em breve)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-success" : status === "connecting" ? "bg-primary" : "bg-warning"}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {status === "connected" ? "CONECTADO" : status === "connecting" ? "CONECTANDO..." : "DESCONECTADO"}
        </span>
      </div>

      {/* Connected state */}
      {status === "connected" && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="font-semibold text-foreground">Conexão ativa — Meta Cloud API</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Phone Number ID:</span>
              <p className="font-medium text-foreground">{phoneNumberId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">WABA ID:</span>
              <p className="font-medium text-foreground">{wabaId}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => toast.info("Envio de teste será implementado via edge function")}
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <Send className="h-4 w-4" /> Testar envio
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
              Desconectar
            </button>
          </div>
        </div>
      )}

      {/* Manual Token Form */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Configuração Manual</h3>
        <p className="text-xs text-muted-foreground mb-4">Para quem já tem o Access Token e dados da Meta.</p>
      </div>

      <div className="space-y-5">
        {/* Access Token */}
        <div>
          <label className="text-sm font-medium text-foreground">Access Token (permanente ou de longa duração)</label>
          <div className="relative mt-1.5">
            <input
              type={showToken ? "text" : "password"}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Seu Access Token da Meta"
              className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Gere em developers.facebook.com → Seu App → WhatsApp → API Setup
          </p>
        </div>

        {/* Phone Number ID */}
        <div>
          <label className="text-sm font-medium text-foreground">Phone Number ID</label>
          <input
            type="text"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="Ex: 123456789012345"
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Encontre em Meta Business Suite → WhatsApp → Números de telefone
          </p>
        </div>

        {/* WABA ID */}
        <div>
          <label className="text-sm font-medium text-foreground">WABA ID (WhatsApp Business Account ID)</label>
          <input
            type="text"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            placeholder="Ex: 987654321098765"
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Encontre em Meta Business Suite → Configurações da conta
          </p>
        </div>

        {/* App Secret */}
        <div>
          <label className="text-sm font-medium text-foreground">App Secret (para verificação do webhook)</label>
          <div className="relative mt-1.5">
            <input
              type={showSecret ? "text" : "password"}
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="App Secret do seu Meta App"
              className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Config */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Configuração do Webhook Meta</h3>
        <p className="text-xs text-muted-foreground">
          Na Meta: Developers → Seu App → WhatsApp → Configuração → Webhooks. Assine os eventos: <strong>messages</strong>, <strong>message_deliveries</strong>, <strong>message_reads</strong>.
        </p>

        <div>
          <label className="text-xs font-medium text-muted-foreground">URL do Webhook</label>
          <div className="relative mt-1">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-muted-foreground"
            />
            <button onClick={() => copyToClipboard(webhookUrl, "URL do Webhook")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Token de Verificação</label>
          <div className="relative mt-1">
            <input
              type="text"
              readOnly
              value={verifyToken}
              className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-muted-foreground"
            />
            <button onClick={() => copyToClipboard(verifyToken, "Token de Verificação")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {status !== "connected" ? (
          <button
            onClick={handleConnect}
            disabled={loading || !accessToken.trim() || !phoneNumberId.trim() || !wabaId.trim()}
            className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔗"}
            Conectar Meta Cloud API
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={loading}
            className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </button>
        )}
        <a
          href="https://developers.facebook.com/apps"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" /> Meta Developers
        </a>
      </div>
    </div>
  );
};

export default MetaTab;
