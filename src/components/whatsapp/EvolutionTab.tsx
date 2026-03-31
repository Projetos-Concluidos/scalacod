import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Copy, ExternalLink, CheckCircle, Loader2, Send, Unplug, AlertTriangle, RefreshCw, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type ConnectionStatus = "disconnected" | "creating" | "qr_ready" | "connected";

const EvolutionTab = () => {
  const { user } = useAuth();
  const [serverUrl, setServerUrl] = useState("");
  const [apiKeyGlobal, setApiKeyGlobal] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState(60);
  const [instanceData, setInstanceData] = useState<any>(null);
  const [connectedPhone, setConnectedPhone] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook?user_id=${user?.id || ""}&provider=evolution`;

  useEffect(() => {
    if (user) fetchInstance();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    };
  }, [user]);

  const fetchInstance = async () => {
    const { data } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user!.id)
      .eq("provider", "evolution")
      .maybeSingle();

    if (data) {
      setInstanceData(data);
      setServerUrl(data.evolution_server_url || "");
      setApiKeyGlobal(data.api_key || "");
      setInstanceName(data.instance_name || "");
      setConnectedPhone(data.phone_number || "");
      setStatus(data.status === "connected" ? "connected" : "disconnected");
    }
  };

  const startQrTimer = () => {
    setQrExpiry(60);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    qrTimerRef.current = setInterval(() => {
      setQrExpiry((prev) => {
        if (prev <= 1) {
          if (qrTimerRef.current) clearInterval(qrTimerRef.current);
          setQrCode(null);
          toast.info("QR Code expirado. Gere um novo.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCreateInstance = async () => {
    if (!serverUrl.trim() || !apiKeyGlobal.trim() || !instanceName.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    setStatus("creating");

    try {
      const cleanUrl = serverUrl.trim().replace(/\/$/, "");

      // Simulate creating instance — in production this calls the Evolution API
      // For now, generate a placeholder QR and simulate the flow
      const mockQrBase64 = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="white"/><text x="128" y="128" text-anchor="middle" font-size="14" fill="#333">QR Code</text><text x="128" y="150" text-anchor="middle" font-size="10" fill="#666">${instanceName}</text></svg>`)}`;

      setQrCode(mockQrBase64);
      setStatus("qr_ready");
      startQrTimer();

      // Save instance to DB
      const payload = {
        user_id: user!.id,
        provider: "evolution" as const,
        instance_name: instanceName.trim(),
        evolution_server_url: cleanUrl,
        api_key: apiKeyGlobal.trim(),
        status: "qr_ready",
        webhook_url: webhookUrl,
        qr_code: mockQrBase64,
      };

      if (instanceData) {
        await supabase.from("whatsapp_instances").update(payload).eq("id", instanceData.id);
      } else {
        const { data } = await supabase.from("whatsapp_instances").insert(payload).select().single();
        if (data) setInstanceData(data);
      }

      // Start polling for connection status (simulated)
      startPolling(cleanUrl, apiKeyGlobal.trim(), instanceName.trim());

      toast.success("Instância criada! Escaneie o QR Code.");
    } catch {
      setStatus("disconnected");
      toast.error("Erro ao criar instância");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (url: string, key: string, name: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    // In production, this would poll `${url}/instance/connectionState/${name}`
    // For now, it's a placeholder that won't auto-connect
    pollingRef.current = setInterval(() => {
      // Production code would check status here
    }, 3000);

    // Auto-stop after 2 minutes
    setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }, 120000);
  };

  const handleSimulateConnect = async () => {
    // Dev helper: simulate successful connection
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);

    setStatus("connected");
    setQrCode(null);
    setConnectedPhone("+5511999999999");

    if (instanceData) {
      await supabase
        .from("whatsapp_instances")
        .update({ status: "connected", phone_number: "+5511999999999", qr_code: null })
        .eq("id", instanceData.id);

      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("user_id", user!.id)
        .eq("type", "evolution")
        .maybeSingle();

      const integrationPayload = {
        user_id: user!.id,
        type: "evolution",
        config: { server_url: serverUrl.trim(), instance_name: instanceName.trim() },
        is_active: true,
      };

      if (existing) {
        await supabase.from("integrations").update(integrationPayload).eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert(integrationPayload);
      }
    }

    toast.success("WhatsApp conectado via Evolution API!");
  };

  const handleDisconnect = async () => {
    if (!instanceData) return;
    setLoading(true);
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);

    try {
      await supabase.from("whatsapp_instances").update({ status: "disconnected", qr_code: null }).eq("id", instanceData.id);
      await supabase.from("integrations").update({ is_active: false }).eq("user_id", user!.id).eq("type", "evolution");
      setStatus("disconnected");
      setQrCode(null);
      setConnectedPhone("");
      setInstanceData({ ...instanceData, status: "disconnected" });
      toast.success("Evolution API desconectada");
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQr = () => {
    const mockQrBase64 = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="white"/><text x="128" y="128" text-anchor="middle" font-size="14" fill="#333">QR Code</text><text x="128" y="150" text-anchor="middle" font-size="10" fill="#666">${instanceName} (novo)</text></svg>`)}`;
    setQrCode(mockQrBase64);
    startQrTimer();
    toast.info("Novo QR Code gerado");
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-destructive">Atenção — API Não Oficial</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              A Evolution API usa o protocolo WhatsApp Web (Baileys) e <strong className="text-foreground">não é uma solução oficial da Meta</strong>.
              O uso pode violar os termos de serviço do WhatsApp e resultar em <strong className="text-destructive">banimento do número</strong>.
              Recomendamos usar esta opção apenas para testes ou integrações de baixo volume.
              Para uso em produção, prefira <strong className="text-foreground">YCloud</strong> ou <strong className="text-foreground">Meta Cloud API</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${
          status === "connected" ? "bg-success" : status === "qr_ready" ? "bg-primary animate-pulse" : status === "creating" ? "bg-primary" : "bg-warning"
        }`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {status === "connected" ? "CONECTADO" : status === "qr_ready" ? "AGUARDANDO SCAN" : status === "creating" ? "CRIANDO..." : "DESCONECTADO"}
        </span>
      </div>

      {/* Connected state */}
      {status === "connected" && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="font-semibold text-foreground">Conexão ativa — Evolution API</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Número conectado:</span>
              <p className="font-medium text-foreground">{connectedPhone}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Instância:</span>
              <p className="font-medium text-foreground">{instanceName}</p>
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
              onClick={() => toast.info("Reiniciar instância — em breve")}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" /> Reiniciar
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Desconectar
            </button>
          </div>
        </div>
      )}

      {/* QR Code Display */}
      {status === "qr_ready" && qrCode && (
        <div className="rounded-lg border border-primary/20 bg-card p-6 text-center space-y-4">
          <h3 className="font-semibold text-foreground">Escaneie o QR Code com o WhatsApp</h3>
          <div className="inline-block rounded-xl border border-border bg-white p-4">
            <img src={qrCode} alt="QR Code" className="h-56 w-56" />
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>1. Abra o WhatsApp no celular</p>
            <p>2. Toque em Mais opções (⋮) ou Configurações</p>
            <p>3. WhatsApp Web → Apontar câmera para o QR</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-muted-foreground">
              Aguardando conexão... ({qrExpiry}s)
            </span>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleRefreshQr}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" /> Gerar novo QR Code
            </button>
            <button
              onClick={handleSimulateConnect}
              className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-2 text-sm font-medium text-success hover:bg-success/10"
            >
              <CheckCircle className="h-4 w-4" /> Simular conexão (dev)
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {status !== "connected" && status !== "qr_ready" && (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground">URL do Servidor Evolution</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://seu-servidor.evolution-api.com"
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ex: https://api.seudominio.com.br (sem barra final)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">API Key Global</label>
            <div className="relative mt-1.5">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKeyGlobal}
                onChange={(e) => setApiKeyGlobal(e.target.value)}
                placeholder="Sua AUTHENTICATION_API_KEY"
                className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Configurada no seu servidor Evolution (AUTHENTICATION_API_KEY)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Nome da Instância</label>
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="minha_loja_scalaninja"
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Nome único para identificar esta conexão
            </p>
          </div>
        </div>
      )}

      {/* Webhook info */}
      {status !== "connected" && status !== "qr_ready" && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <label className="text-xs font-medium text-muted-foreground">URL de Webhook (configurada automaticamente)</label>
          <div className="relative mt-1">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="h-10 w-full rounded-lg border border-border bg-input pr-10 pl-4 text-sm text-muted-foreground"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada!"); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {status !== "connected" && status !== "qr_ready" && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateInstance}
            disabled={loading || !serverUrl.trim() || !apiKeyGlobal.trim() || !instanceName.trim()}
            className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "⚡"}
            Criar Instância e Conectar
          </button>
          <a
            href="https://doc.evolution-api.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Docs Evolution
          </a>
        </div>
      )}
    </div>
  );
};

export default EvolutionTab;
