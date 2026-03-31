import { useState, useEffect } from "react";
import { Cloud, Eye, EyeOff, Copy, ExternalLink, Save, CheckCircle, AlertCircle, Loader2, Send, Unplug, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import MetaTab from "@/components/whatsapp/MetaTab";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

const WhatsAppCloud = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"ycloud" | "meta" | "evolution">("ycloud");
  const [apiKey, setApiKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [instanceData, setInstanceData] = useState<any>(null);

  const webhookUrl = `https://ufjnertaawuubdvfvgkf.supabase.co/functions/v1/whatsapp-webhook?user_id=${user?.id || ""}`;

  useEffect(() => {
    if (user) fetchInstance();
  }, [user]);

  const fetchInstance = async () => {
    const { data } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user!.id)
      .eq("provider", "ycloud")
      .maybeSingle();

    if (data) {
      setInstanceData(data);
      setApiKey(data.ycloud_api_key || "");
      setPhoneNumber(data.phone_number || "");
      setStatus(data.status === "connected" ? "connected" : "disconnected");
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
  };

  const handleConnect = async () => {
    if (!apiKey.trim() || !phoneNumber.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    setStatus("connecting");

    try {
      const payload = {
        user_id: user!.id,
        provider: "ycloud" as const,
        instance_name: "YCloud Principal",
        phone_number: phoneNumber.trim(),
        ycloud_api_key: apiKey.trim(),
        status: "connected",
        webhook_url: webhookUrl,
      };

      if (instanceData) {
        await supabase
          .from("whatsapp_instances")
          .update(payload)
          .eq("id", instanceData.id);
      } else {
        await supabase.from("whatsapp_instances").insert(payload);
      }

      // Also upsert integrations table
      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("user_id", user!.id)
        .eq("type", "ycloud")
        .maybeSingle();

      const integrationPayload = {
        user_id: user!.id,
        type: "ycloud",
        config: { api_key: apiKey.trim(), phone_number: phoneNumber.trim() },
        is_active: true,
      };

      if (existing) {
        await supabase.from("integrations").update(integrationPayload).eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert(integrationPayload);
      }

      setStatus("connected");
      toast.success("YCloud conectada com sucesso!");
      await fetchInstance();
    } catch {
      setStatus("disconnected");
      toast.error("Erro ao conectar YCloud");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!instanceData) return;
    setLoading(true);
    try {
      await supabase
        .from("whatsapp_instances")
        .update({ status: "disconnected" })
        .eq("id", instanceData.id);

      await supabase
        .from("integrations")
        .update({ is_active: false })
        .eq("user_id", user!.id)
        .eq("type", "ycloud");

      setStatus("disconnected");
      setInstanceData({ ...instanceData, status: "disconnected" });
      toast.success("YCloud desconectada");
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (instanceData) {
        await supabase
          .from("whatsapp_instances")
          .update({
            ycloud_api_key: apiKey.trim(),
            phone_number: phoneNumber.trim(),
          })
          .eq("id", instanceData.id);
      }
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    toast.info("Envio de teste será implementado via edge function");
  };

  const tabs = [
    { id: "ycloud" as const, label: "☁ YCloud", active: true },
    { id: "meta" as const, label: "🌐 Facebook/Meta", active: true },
    { id: "evolution" as const, label: "⚡ Evolution API", active: false },
  ];

  const statusConfig = {
    disconnected: { color: "bg-warning", label: "DESCONECTADO" },
    connecting: { color: "bg-primary", label: "CONECTANDO..." },
    connected: { color: "bg-success", label: "CONECTADO" },
  };

  const currentStatus = statusConfig[status];

  return (
    <div>
      {/* Hero */}
      <div className="ninja-card mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Cloud className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Cloud</h1>
          <p className="text-sm text-muted-foreground">Conecte e gerencie sua API oficial da Meta</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="ninja-card lg:col-span-2">
          <h2 className="text-xl font-bold text-foreground mb-1">Conexão Rápida</h2>
          <p className="text-sm text-muted-foreground mb-6">Escolha o método de integração do WhatsApp Business.</p>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`h-2 w-2 rounded-full ${currentStatus.color}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {currentStatus.label}
            </span>
          </div>

          {/* Provider tabs */}
          <div className="flex items-center gap-3 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.active && setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "gradient-primary text-primary-foreground"
                    : tab.active
                    ? "border border-border text-muted-foreground hover:bg-muted"
                    : "border border-border text-muted-foreground/50 cursor-not-allowed"
                }`}
                disabled={!tab.active}
              >
                {tab.label}
                {!tab.active && <span className="ml-1 text-[10px]">(Em breve)</span>}
              </button>
            ))}
          </div>

          {activeTab === "ycloud" && (
            <>
              {/* YCloud info banner */}
              <div className="mb-6 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
                <span className="text-primary">ℹ</span>
                <p className="text-xs text-muted-foreground">
                  A <strong className="text-foreground">YCloud</strong> é uma plataforma parceira que facilita a integração com a API oficial do WhatsApp.{" "}
                  <a href="https://ycloud.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Criar conta na YCloud →
                  </a>
                </p>
              </div>

              {/* Connected state */}
              {status === "connected" && (
                <div className="mb-6 rounded-lg border border-success/20 bg-success/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="font-semibold text-foreground">Conexão ativa</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Número conectado:</span>
                      <p className="font-medium text-foreground">{phoneNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Provider:</span>
                      <p className="font-medium text-foreground">YCloud</p>
                    </div>
                    {instanceData?.waba_id && (
                      <div>
                        <span className="text-muted-foreground">WABA ID:</span>
                        <p className="font-medium text-foreground">{instanceData.waba_id}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleTestSend}
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

              {/* Form */}
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground">API Key da YCloud</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Sua API Key da YCloud"
                      className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Encontre em YCloud Dashboard → Settings → API Keys.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Número do WhatsApp (remetente)</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+5511999999999"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    O número vinculado à sua conta YCloud, em formato internacional.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">URL de Webhook (cole na YCloud)</label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-muted-foreground"
                    />
                    <button
                      onClick={copyWebhook}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Na YCloud, vá em Settings → Webhooks e cole esta URL para receber mensagens.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex items-center gap-3">
                {status !== "connected" ? (
                  <button
                    onClick={handleConnect}
                    disabled={loading || !apiKey.trim() || !phoneNumber.trim()}
                    className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "🔗"
                    )}
                    Conectar YCloud
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar alterações
                  </button>
                )}
                <a
                  href="https://ycloud.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" /> Abrir YCloud
                </a>
              </div>
            </>
          )}

          {activeTab === "meta" && <MetaTab />}

          {activeTab === "evolution" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-3">⚡</span>
              <h3 className="text-lg font-semibold text-foreground mb-1">Evolution API</h3>
              <p className="text-sm text-muted-foreground">Em breve — conexão via QR Code com Evolution API.</p>
            </div>
          )}
