import { useState } from "react";
import { Bell, Mail, Smartphone, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const NotificacoesTab = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [emailNotifs, setEmailNotifs] = useState({
    newOrder: true,
    delivered: true,
    frustrated: true,
    newLead: true,
    weeklyReport: false,
  });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [alerts, setAlerts] = useState({
    lowTokens: false,
    frustratedOrders: false,
  });

  const handleSave = () => {
    toast.success("Preferências de notificação salvas!");
  };

  const testPush = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification("ScalaCOD 🥷", { body: "Notificação push funcionando!" });
          toast.success("Notificação enviada!");
        } else {
          toast.error("Permissão de notificação negada pelo navegador.");
        }
      });
    } else {
      toast.error("Seu navegador não suporta notificações push.");
    }
  };

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

        <div className="mb-4 max-w-md">
          <label className="text-sm font-medium text-foreground">E-mail de destino</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          {[
            { key: "newOrder", label: "Novo pedido recebido" },
            { key: "delivered", label: "Pedido entregue" },
            { key: "frustrated", label: "Pedido frustrado / não entregue" },
            { key: "newLead", label: "Novo lead" },
            { key: "weeklyReport", label: "Relatório semanal de vendas" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3">
              <span className="text-sm text-foreground">{label}</span>
              <Switch
                checked={(emailNotifs as any)[key]}
                onCheckedChange={(v) => setEmailNotifs((prev) => ({ ...prev, [key]: v }))}
              />
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
            <p className="text-xs text-muted-foreground">Receba alertas diretamente no navegador</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3 mb-3">
          <span className="text-sm text-foreground">Ativar notificações push</span>
          <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
        </div>

        {pushEnabled && (
          <Button variant="outline" size="sm" onClick={testPush}>
            <Bell className="h-4 w-4" /> Testar notificação
          </Button>
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
            <Switch checked={alerts.lowTokens} onCheckedChange={(v) => setAlerts((p) => ({ ...p, lowTokens: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3">
            <span className="text-sm text-foreground">Alertar quando houver pedidos frustrados no dia</span>
            <Switch checked={alerts.frustratedOrders} onCheckedChange={(v) => setAlerts((p) => ({ ...p, frustratedOrders: v }))} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
        Salvar Preferências
      </Button>
    </div>
  );
};

export default NotificacoesTab;
