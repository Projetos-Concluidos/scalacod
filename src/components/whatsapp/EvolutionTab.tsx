import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, Loader2, Send, RefreshCw, LogOut, AlertTriangle, Wifi, WifiOff, Copy, HeartPulse, ShieldAlert } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type ConnectionStatus = "disconnected" | "creating" | "qr_ready" | "connected";
type HealthStatus = "unknown" | "healthy" | "degraded" | "check_failed" | "checking";

const EvolutionTab = () => {
  const { user } = useAuth();
  const [instanceName, setInstanceName] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState(60);
  const [instanceData, setInstanceData] = useState<any>(null);
  const [connectedPhone, setConnectedPhone] = useState("");
  const [profileName, setProfileName] = useState("");
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("unknown");
  const [healthChecking, setHealthChecking] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) {
      const generatedName = `scalaninja_${user.id.substring(0, 8)}`;
      setInstanceName(generatedName);
      fetchGlobalConfig();
      fetchInstance();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    };
  }, [user]);

  const fetchGlobalConfig = async () => {
    const { data } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["integration_evolution_url", "integration_evolution_api_key"]);

    const url = data?.find(d => d.key === "integration_evolution_url")?.value;
    const key = data?.find(d => d.key === "integration_evolution_api_key")?.value;
    const urlStr = typeof url === "string" ? url : "";
    const keyStr = typeof key === "string" ? key : "";
    setApiConfigured(!!urlStr.trim() && !!keyStr.trim());
  };

  const fetchInstance = async () => {
    const { data, error } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user!.id)
      .eq("provider", "evolution")
      .maybeSingle();

    if (data) {
      setInstanceData(data);
      if (data.instance_name) setInstanceName(data.instance_name);
      setConnectedPhone(data.phone_number || "");

      if (data.status !== "connected" && data.instance_name) {
        try {
          const res = await supabase.functions.invoke("evolution-instance", {
            body: { action: "status", instance_name: data.instance_name },
          });
          const liveStatus = res.data;
          if (liveStatus?.connected) {
            setStatus("connected");
            setProfileName(liveStatus.profileName || "");
            setConnectedPhone(liveStatus.phoneNumber || data.phone_number || "");
            setHealthStatus(liveStatus.sessionHealthy ? "healthy" : liveStatus.healthCheckResult === "degraded" ? "degraded" : "unknown");
            const { data: refreshed } = await supabase
              .from("whatsapp_instances")
              .select("*")
              .eq("user_id", user!.id)
              .eq("provider", "evolution")
              .maybeSingle();
            if (refreshed) {
              setInstanceData(refreshed);
              setConnectedPhone(refreshed.phone_number || "");
            }
            return;
          }
        } catch (e) {
          // Instance may not exist yet
        }
      }

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

  const callEvolutionFunction = useCallback(async (action: string, extraBody?: Record<string, any>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão expirada");

    const res = await supabase.functions.invoke("evolution-instance", {
      body: { action, instance_name: instanceName, ...extraBody },
    });

    if (res.error) throw new Error(res.error.message);
    return res.data;
  }, [instanceName]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const data = await callEvolutionFunction("status");
        if (data.connected) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (qrTimerRef.current) clearInterval(qrTimerRef.current);
          setStatus("connected");
          setQrCode(null);
          setProfileName(data.profileName || "");
          setHealthStatus(data.sessionHealthy ? "healthy" : "unknown");
          await fetchInstance();
          toast.success("WhatsApp conectado via Evolution API!");
        }
      } catch (e) {
        // polling error
      }
    }, 4000);

    setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }, 120000);
  }, [callEvolutionFunction]);

  const handleHealthCheck = async () => {
    setHealthChecking(true);
    setHealthStatus("checking");
    try {
      const data = await callEvolutionFunction("health", { test_phone: connectedPhone });
      if (data.sessionHealthy === true) {
        setHealthStatus("healthy");
        toast.success("Sessão Baileys operacional ✓");
      } else if (data.sessionHealthy === false) {
        setHealthStatus("degraded");
        toast.warning("Sessão Baileys degradada — recomenda-se reconectar o WhatsApp");
      } else {
        setHealthStatus("unknown");
        toast.info(data.message || "Não foi possível verificar");
      }
    } catch (err: any) {
      setHealthStatus("check_failed");
      toast.error(err.message || "Erro ao verificar saúde da sessão");
    } finally {
      setHealthChecking(false);
    }
  };

  const handleCreateInstance = async () => {
    setLoading(true);
    setStatus("creating");

    try {
      const data = await callEvolutionFunction("create");

      if (data.qrcode) {
        const qrSrc = data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
        setQrCode(qrSrc);
        setStatus("qr_ready");
        startQrTimer();
        startPolling();
        toast.success("Instância criada! Escaneie o QR Code.");
      } else {
        setStatus("disconnected");
        toast.warning("QR Code não retornado. Tente gerar novo QR.");
      }
    } catch (err: any) {
      setStatus("disconnected");
      toast.error(err.message || "Erro ao criar instância");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    setLoading(true);
    try {
      const data = await callEvolutionFunction("connect");
      if (data.qrcode) {
        const qrSrc = data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
        setQrCode(qrSrc);
        startQrTimer();
        startPolling();
        toast.info("Novo QR Code gerado");
      } else {
        toast.warning("QR Code não disponível. Tente novamente.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar QR Code");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!instanceData) return;
    setLoading(true);
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);

    try {
      await callEvolutionFunction("disconnect");
      setStatus("disconnected");
      setQrCode(null);
      setConnectedPhone("");
      setProfileName("");
      setHealthStatus("unknown");
      setInstanceData({ ...instanceData, status: "disconnected" });
      toast.success("Evolution API desconectada");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      await callEvolutionFunction("restart");
      toast.success("Instância reiniciada");
      // After restart, re-check health
      setTimeout(() => handleHealthCheck(), 3000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao reiniciar");
    } finally {
      setLoading(false);
    }
  };

  const healthBadge = () => {
    if (status !== "connected") return null;

    const config: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: React.ReactNode }> = {
      healthy: { label: "Sessão Saudável", variant: "default", icon: <HeartPulse className="h-3 w-3" /> },
      degraded: { label: "Sessão Degradada", variant: "destructive", icon: <ShieldAlert className="h-3 w-3" /> },
      check_failed: { label: "Verificação Falhou", variant: "secondary", icon: <ShieldAlert className="h-3 w-3" /> },
      checking: { label: "Verificando...", variant: "outline", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      unknown: { label: "Não Verificado", variant: "outline", icon: <HeartPulse className="h-3 w-3" /> },
    };

    const c = config[healthStatus] || config.unknown;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1 text-[10px]">
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-destructive">Atenção — API Não Oficial</h3>
              <InfoTooltip
                title="Como conectar via Evolution API:"
                steps={[
                  "Clique em 'Criar Instância e Conectar'",
                  "Escaneie o QR Code com o WhatsApp do celular",
                  "Aguarde a confirmação de conexão",
                ]}
                warning="⚠️ API não oficial da Meta — risco de banimento do número"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              A Evolution API usa o protocolo WhatsApp Web (Baileys) e <strong className="text-foreground">não é uma solução oficial da Meta</strong>.
              O uso pode violar os termos de serviço do WhatsApp e resultar em <strong className="text-destructive">banimento do número</strong>.
              Para uso em produção, prefira <strong className="text-foreground">YCloud</strong> ou <strong className="text-foreground">Meta Cloud API</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${
            status === "connected" ? "bg-success" : status === "qr_ready" ? "bg-primary animate-pulse" : status === "creating" ? "bg-primary" : "bg-warning"
          }`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {status === "connected" ? "CONECTADO" : status === "qr_ready" ? "AGUARDANDO SCAN" : status === "creating" ? "CRIANDO..." : "DESCONECTADO"}
          </span>
        </div>
        {apiConfigured !== null && (
          <Badge variant={apiConfigured ? "default" : "destructive"} className="flex items-center gap-1 text-[10px]">
            {apiConfigured ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {apiConfigured ? "API Ativa" : "API Inativa"}
          </Badge>
        )}
        {healthBadge()}
      </div>

      {/* Webhook URL */}
      {user && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            URL de Webhook (configurada automaticamente)
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=${user.id}&provider=evolution`}
              className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground ring-offset-background focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=${user.id}&provider=evolution`;
                navigator.clipboard.writeText(url);
                toast.success("URL copiada!");
              }}
              className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 hover:bg-muted"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* API not configured warning */}
      {apiConfigured === false && status !== "connected" && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-warning font-medium">
            ⚠️ Evolution API não configurada pelo administrador da plataforma.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Solicite ao administrador que configure a URL e API Key da Evolution API nas configurações globais.
          </p>
        </div>
      )}

      {/* Session degraded warning */}
      {status === "connected" && healthStatus === "degraded" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-destructive text-sm">Sessão Baileys Degradada</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                A instância aparece como conectada, mas a verificação de números não está funcionando corretamente.
                Isso causa falhas nos disparos (erro "exists: false"). <strong className="text-foreground">Recomenda-se desconectar e reconectar o WhatsApp.</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connected state */}
      {status === "connected" && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="font-semibold text-foreground">Conexão ativa — Evolution API</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Número conectado:</span>
              <p className="font-medium text-foreground">{connectedPhone || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Instância:</span>
              <p className="font-mono text-sm font-medium text-foreground">{instanceName}</p>
            </div>
            {profileName && (
              <div>
                <span className="text-muted-foreground">Perfil:</span>
                <p className="font-medium text-foreground">{profileName}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2 flex-wrap">
            <button
              onClick={handleHealthCheck}
              disabled={healthChecking}
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {healthChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
              Verificar Saúde
            </button>
            <button
              onClick={handleRestart}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reiniciar
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
            <span className="text-muted-foreground">Aguardando conexão... ({qrExpiry}s)</span>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleRefreshQr}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Gerar novo QR Code
            </button>
          </div>
        </div>
      )}

      {/* Instance info + action button — disconnected state */}
      {status !== "connected" && status !== "qr_ready" && apiConfigured && (
        <>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Sua instância será criada automaticamente como:
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">{instanceName}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateInstance}
              disabled={loading}
              className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "⚡"}
              Criar Instância e Conectar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EvolutionTab;
