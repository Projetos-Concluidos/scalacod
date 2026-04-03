import { useState, useEffect } from "react";
import { Bell, Mail, Smartphone, AlertTriangle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Prefs {
  email_new_order: boolean;
  email_delivered: boolean;
  email_frustrated: boolean;
  email_new_lead: boolean;
  email_weekly_report: boolean;
  push_enabled: boolean;
  push_new_order: boolean;
  push_payment_approved: boolean;
  push_delivered: boolean;
  push_frustrated: boolean;
  push_new_lead: boolean;
  alert_low_tokens: boolean;
  alert_frustrated_orders: boolean;
}

const defaults: Prefs = {
  email_new_order: true,
  email_delivered: true,
  email_frustrated: true,
  email_new_lead: true,
  email_weekly_report: false,
  push_enabled: false,
  push_new_order: true,
  push_payment_approved: true,
  push_delivered: true,
  push_frustrated: true,
  push_new_lead: true,
  alert_low_tokens: false,
  alert_frustrated_orders: false,
};

const NotificacoesTab = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setPrefs({
          email_new_order: d.email_new_order ?? true,
          email_delivered: d.email_delivered ?? true,
          email_frustrated: d.email_frustrated ?? true,
          email_new_lead: d.email_new_lead ?? true,
          email_weekly_report: d.email_weekly_report ?? false,
          push_enabled: d.push_enabled ?? false,
          push_new_order: d.push_new_order ?? true,
          push_payment_approved: d.push_payment_approved ?? true,
          push_delivered: d.push_delivered ?? true,
          push_frustrated: d.push_frustrated ?? true,
          push_new_lead: d.push_new_lead ?? true,
          alert_low_tokens: d.alert_low_tokens ?? false,
          alert_frustrated_orders: d.alert_frustrated_orders ?? false,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences" as any)
      .upsert({ user_id: user.id, ...prefs } as any, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar preferências");
      console.error(error);
    } else {
      toast.success("Preferências de notificação salvas!");
    }
  };

  const toggle = (key: keyof Prefs) => (v: boolean) =>
    setPrefs((p) => ({ ...p, [key]: v }));

  const testPush = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          const audio = new Audio("/sounds/notification_kiwify.mp3");
          audio.volume = 0.8;
          audio.play().catch(() => {});
          new Notification("ScalaCOD 🥷", { body: "Notificação push funcionando!", icon: "/favicon.svg" });
          toast.success("Notificação enviada!");
        } else {
          toast.error("Permissão de notificação negada pelo navegador.");
        }
      });
    } else {
      toast.error("Seu navegador não suporta notificações push.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const emailItems = [
    { key: "email_new_order" as const, label: "Novo pedido recebido" },
    { key: "email_delivered" as const, label: "Pedido entregue" },
    { key: "email_frustrated" as const, label: "Pedido frustrado / não entregue" },
    { key: "email_new_lead" as const, label: "Novo lead" },
    { key: "email_weekly_report" as const, label: "Relatório semanal de vendas" },
  ];

  const pushItems = [
    { key: "push_new_order" as const, label: "Novo pedido recebido 🔊", hint: "Toca áudio de alerta" },
    { key: "push_delivered" as const, label: "Pedido entregue" },
    { key: "push_frustrated" as const, label: "Pedido frustrado / não entregue" },
    { key: "push_new_lead" as const, label: "Novo lead" },
  ];

  return (
    <div className="space-y-6">
      {/* Email */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Notificações por E-mail</h2>
            <p className="text-xs text-muted-foreground">Receba alertas importantes no seu e-mail</p>
          </div>
        </div>
        <div className="space-y-3">
          {emailItems.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3">
              <span className="text-sm text-foreground">{label}</span>
              <Switch checked={prefs[key]} onCheckedChange={toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Push */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
            <Smartphone className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Notificações Push</h2>
            <p className="text-xs text-muted-foreground">Receba alertas diretamente no navegador com áudio</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3 mb-3">
          <span className="text-sm text-foreground font-medium">Ativar notificações push</span>
          <Switch checked={prefs.push_enabled} onCheckedChange={toggle("push_enabled")} />
        </div>

        {prefs.push_enabled && (
          <div className="space-y-3 mt-3">
            {pushItems.map(({ key, label, hint }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3">
                <div>
                  <span className="text-sm text-foreground">{label}</span>
                  {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
                </div>
                <Switch checked={prefs[key]} onCheckedChange={toggle(key)} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={testPush} className="mt-2">
              <Bell className="h-4 w-4 mr-1" /> Testar notificação com áudio
            </Button>
          </div>
        )}
      </div>

      {/* Alertas */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Alertas de Saldo</h2>
            <p className="text-xs text-muted-foreground">Receba avisos quando recursos estiverem baixos</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3">
            <span className="text-sm text-foreground">Alertar quando saldo de tokens de voz for baixo (&lt; 100)</span>
            <Switch checked={prefs.alert_low_tokens} onCheckedChange={toggle("alert_low_tokens")} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3">
            <span className="text-sm text-foreground">Alertar quando houver pedidos frustrados no dia</span>
            <Switch checked={prefs.alert_frustrated_orders} onCheckedChange={toggle("alert_frustrated_orders")} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Salvar Preferências
      </Button>
    </div>
  );
};

export default NotificacoesTab;
