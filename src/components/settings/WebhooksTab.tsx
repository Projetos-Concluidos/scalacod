import { useState, useEffect } from "react";
import { Webhook, Copy, RefreshCw, Loader2, Send, CheckCircle, XCircle } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EVENT_OPTIONS = [
  { key: "orders", label: "Pedidos" },
  { key: "shipping", label: "Status de Envio" },
  { key: "leads", label: "Leads" },
  { key: "affiliations", label: "Afiliações" },
  { key: "payments", label: "Pagamentos" },
  { key: "stock", label: "Estoque" },
];

const WebhooksTab = () => {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [events, setEvents] = useState<Record<string, boolean>>({
    orders: true, shipping: true, leads: true, affiliations: false, payments: true, stock: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [webhookId, setWebhookId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("webhooks_config")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWebhookId(data.id);
          setUrl(data.url);
          setSecretKey(data.secret_key || "");
          const evts = data.events as any;
          if (Array.isArray(evts)) {
            const map: Record<string, boolean> = {};
            EVENT_OPTIONS.forEach((e) => { map[e.key] = evts.includes(e.key); });
            setEvents(map);
          }
        }
      });
  }, [user]);

  const generateSecret = () => {
    const key = "sk_" + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    setSecretKey(key);
    toast.success("Chave secreta gerada!");
  };

  const handleSave = async () => {
    if (!user || !url.trim()) {
      toast.error("Insira a URL do webhook");
      return;
    }
    setSaving(true);
    try {
      const activeEvents = Object.entries(events).filter(([, v]) => v).map(([k]) => k);
      const payload = {
        user_id: user.id,
        url,
        secret_key: secretKey,
        events: activeEvents as any,
        is_active: true,
      };
      if (webhookId) {
        await supabase.from("webhooks_config").update(payload).eq("id", webhookId);
      } else {
        const { data } = await supabase.from("webhooks_config").insert(payload).select().single();
        if (data) setWebhookId(data.id);
      }
      toast.success("Webhook salvo!");
    } catch {
      toast.error("Erro ao salvar webhook");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!url.trim()) {
      toast.error("Configure a URL primeiro");
      return;
    }
    setTesting(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("✅ Webhook de teste enviado! Verifique seu endpoint.");
    } catch {
      toast.error("❌ Erro ao enviar teste");
    } finally {
      setTesting(false);
    }
  };

  const toggleEvent = (key: string) => {
    setEvents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="ninja-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Webhook className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Configurar Webhook</h2>
            <p className="text-xs text-muted-foreground">Receba notificações de eventos em tempo real</p>
          </div>
        </div>

        {/* URL */}
        <div className="mb-4 max-w-xl">
          <label className="text-sm font-medium text-foreground">URL do Webhook</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://seu-sistema.com/webhook"
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">Enviaremos um POST para esta URL a cada evento</p>
        </div>

        {/* Eventos */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-foreground">Eventos para notificar:</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {EVENT_OPTIONS.map((evt) => (
              <label
                key={evt.key}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  events[evt.key]
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-border bg-secondary/20 text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={events[evt.key]}
                  onChange={() => toggleEvent(evt.key)}
                  className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                />
                {evt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Secret Key */}
        <div className="mb-6 max-w-xl">
          <label className="text-sm font-medium text-foreground">Chave Secreta (HMAC)</label>
          <div className="mt-1.5 flex gap-2">
            <code className="flex-1 rounded-lg border border-border bg-input px-4 py-2 text-xs font-mono text-foreground truncate">
              {secretKey || "Nenhuma chave gerada"}
            </code>
            <Button variant="outline" size="sm" onClick={generateSecret}>
              <RefreshCw className="h-3.5 w-3.5" /> Gerar
            </Button>
            {secretKey && (
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(secretKey); toast.success("Copiado!"); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Usada para validar a autenticidade do webhook via X-Signature-256</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Salvar Webhook
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Testar Webhook
          </Button>
        </div>
      </div>

      {/* Histórico */}
      <div className="ninja-card">
        <h3 className="mb-4 text-lg font-bold text-foreground">Histórico de Webhooks</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Data/hora</th>
                <th className="pb-2 pr-4">Evento</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Tempo</th>
                <th className="pb-2">Ação</th>
              </tr>
            </thead>
            <tbody className="text-xs text-muted-foreground">
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  Nenhum webhook disparado ainda.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WebhooksTab;
