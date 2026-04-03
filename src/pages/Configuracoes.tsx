import { useState, useEffect } from "react";
import { Store, Clock, Save, Globe, Key, Webhook, Bell, Info, MessageSquare, Users } from "lucide-react";
import LogzzTab from "@/components/settings/LogzzTab";
import CoinzzTab from "@/components/settings/CoinzzTab";
import MercadoPagoTab from "@/components/settings/MercadoPagoTab";
import ApiTab from "@/components/settings/ApiTab";
import WebhooksTab from "@/components/settings/WebhooksTab";
import NotificacoesTab from "@/components/settings/NotificacoesTab";
import FilaWhatsAppTab from "@/components/settings/FilaWhatsAppTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/PageHeader";

const DAYS = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = String(Math.floor(i)).padStart(2, "0");
  return `${h}:00`;
});

interface BusinessHours {
  [key: string]: { enabled: boolean; start?: string; end?: string };
}

const defaultBusinessHours: BusinessHours = {
  monday: { enabled: true, start: "08:00", end: "18:00" },
  tuesday: { enabled: true, start: "08:00", end: "18:00" },
  wednesday: { enabled: true, start: "08:00", end: "18:00" },
  thursday: { enabled: true, start: "08:00", end: "18:00" },
  friday: { enabled: true, start: "08:00", end: "18:00" },
  saturday: { enabled: false },
  sunday: { enabled: false },
};

const Configuracoes = () => {
  const { user } = useAuth();
  const [storeName, setStoreName] = useState("Minha Loja");
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setStoreId(data.id);
        setStoreName(data.name);
        setBusinessHoursEnabled(data.business_hours_enabled ?? false);
        if (data.business_hours) {
          setBusinessHours(data.business_hours as unknown as BusinessHours);
        }
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: storeName,
        business_hours_enabled: businessHoursEnabled,
        business_hours: businessHours as any,
      };
      if (storeId) {
        await supabase.from("stores").update(payload).eq("id", storeId);
      } else {
        const { data } = await supabase.from("stores").insert(payload).select().single();
        if (data) setStoreId(data.id);
      }
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: string, field: string, value: any) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle={
          <>
            Gerencie sua loja, integrações e credenciais.{" "}
            <span className="text-primary">Alterações são salvas por aba.</span>
          </>
        }
        actions={
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        }
      />

      <Tabs defaultValue="loja" className="w-full">
        <TabsList className="mb-8 h-auto gap-6 rounded-none border-b border-border bg-transparent p-0">
          {[
            { value: "loja", icon: Store, label: "Loja" },
            { value: "integracoes", icon: Globe, label: "Integrações" },
            { value: "api", icon: Key, label: "API" },
            { value: "webhooks", icon: Webhook, label: "Webhooks" },
            { value: "notificacoes", icon: Bell, label: "Notificações" },
            { value: "fila", icon: MessageSquare, label: "Fila WhatsApp" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-0 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ABA LOJA */}
        <TabsContent value="loja" className="space-y-6">
          {/* Dados da Loja */}
          <div className="ninja-card">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Store className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Dados da Loja</h2>
                <p className="text-xs text-muted-foreground">Informações básicas que aparecem no painel</p>
              </div>
            </div>
            <div className="max-w-md">
              <label className="text-sm font-medium text-foreground">Nome da Loja</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">Aparece no painel e nos relatórios.</p>
            </div>
          </div>

          {/* Horário Comercial */}
          <div className="ninja-card">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Horário Comercial (Global)</h2>
                <p className="text-xs text-muted-foreground">Define o horário padrão de envio para todos os fluxos</p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-4 py-3">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Fluxos de automação só enviarão mensagens dentro do horário configurado. Cada fluxo pode ter seu próprio override.
              </p>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Horário comercial</span>
              </div>
              <Switch checked={businessHoursEnabled} onCheckedChange={setBusinessHoursEnabled} />
            </div>

            {businessHoursEnabled && (
              <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                {DAYS.map(({ key, label }) => {
                  const day = businessHours[key] || { enabled: false };
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className="flex w-28 items-center gap-2">
                        <Switch
                          checked={day.enabled}
                          onCheckedChange={(v) => updateDay(key, "enabled", v)}
                          className="scale-90"
                        />
                        <span className="text-sm text-foreground">{label}</span>
                      </div>
                      {day.enabled ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={day.start || "08:00"}
                            onValueChange={(v) => updateDay(key, "start", v)}
                          >
                            <SelectTrigger className="h-9 w-24 bg-input text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOURS.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-muted-foreground">até</span>
                          <Select
                            value={day.end || "18:00"}
                            onValueChange={(v) => updateDay(key, "end", v)}
                          >
                            <SelectTrigger className="h-9 w-24 bg-input text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOURS.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">— Fechado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Placeholder tabs */}
        <TabsContent value="integracoes" className="space-y-6">
          <LogzzTab />
          <CoinzzTab />
          <MercadoPagoTab />
        </TabsContent>
        <TabsContent value="api">
          <ApiTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
        <TabsContent value="notificacoes">
          <NotificacoesTab />
        </TabsContent>
        <TabsContent value="fila">
          <FilaWhatsAppTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
