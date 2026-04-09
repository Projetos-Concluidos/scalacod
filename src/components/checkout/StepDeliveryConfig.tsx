import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Truck, Bike, Calendar, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DeliveryConfig {
  delivery_method: string;
  shipping_enabled: boolean;
  shipping_value: number;
  scheduling_enabled: boolean;
  scheduling_config: {
    excluded_weekdays: number[];
    skip_holidays: boolean;
    max_days_ahead: number;
    min_days_ahead: number;
  };
}

interface Props {
  deliveryConfig: DeliveryConfig;
  setDeliveryConfig: (v: DeliveryConfig) => void;
}

const deliveryMethods = [
  { value: "correios", label: "Correios", icon: Truck, desc: "Entrega via Correios" },
  { value: "motoboy", label: "Motoboy", icon: Bike, desc: "Entrega local via motoboy" },
];

const weekdays = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export default function StepDeliveryConfig({ deliveryConfig, setDeliveryConfig }: Props) {
  const update = (partial: Partial<DeliveryConfig>) => setDeliveryConfig({ ...deliveryConfig, ...partial });
  const updateScheduling = (partial: Partial<DeliveryConfig["scheduling_config"]>) =>
    update({ scheduling_config: { ...deliveryConfig.scheduling_config, ...partial } });

  function toggleWeekday(day: number) {
    const excluded = deliveryConfig.scheduling_config.excluded_weekdays;
    if (excluded.includes(day)) {
      updateScheduling({ excluded_weekdays: excluded.filter((d) => d !== day) });
    } else {
      updateScheduling({ excluded_weekdays: [...excluded, day] });
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">🚚 Entrega & Frete</strong> — Configure o método de entrega, frete e agendamento para produtos físicos.
        </p>
      </div>

      {/* Delivery Method */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Método de Entrega</Label>
        <div className="grid grid-cols-2 gap-3">
          {deliveryMethods.map((m) => {
            const Icon = m.icon;
            const selected = deliveryConfig.delivery_method === m.value;
            return (
              <button
                key={m.value}
                onClick={() => update({ delivery_method: m.value })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-secondary/30 hover:border-primary/30 hover:bg-secondary/60"
                }`}
              >
                <Icon className={`h-6 w-6 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{m.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Shipping */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Cobrar Frete?</p>
            <p className="text-xs text-muted-foreground">Se desativado, frete grátis será exibido no checkout</p>
          </div>
          <Switch checked={deliveryConfig.shipping_enabled} onCheckedChange={(v) => update({ shipping_enabled: v })} />
        </div>
        {deliveryConfig.shipping_enabled && (
          <div>
            <Label>Valor do Frete (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={deliveryConfig.shipping_value || ""}
              onChange={(e) => update({ shipping_value: Number(e.target.value) })}
              placeholder="15.00"
              className="bg-input border-border mt-1"
            />
          </div>
        )}
        {!deliveryConfig.shipping_enabled && (
          <Badge variant="outline" className="text-xs border-success/30 text-success">🎉 Frete Grátis</Badge>
        )}
      </div>

      {/* Scheduling */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Agendamento de Entrega</p>
              <p className="text-xs text-muted-foreground">Permitir que o cliente escolha a data de entrega</p>
            </div>
          </div>
          <Switch checked={deliveryConfig.scheduling_enabled} onCheckedChange={(v) => update({ scheduling_enabled: v })} />
        </div>

        {deliveryConfig.scheduling_enabled && (
          <div className="space-y-4 pt-2 border-t border-border">
            {/* Days ahead range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mín. dias à frente</Label>
                <Input
                  type="number"
                  min="0"
                  value={deliveryConfig.scheduling_config.min_days_ahead}
                  onChange={(e) => updateScheduling({ min_days_ahead: Number(e.target.value) })}
                  className="bg-input border-border mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Máx. dias à frente</Label>
                <Input
                  type="number"
                  min="1"
                  value={deliveryConfig.scheduling_config.max_days_ahead}
                  onChange={(e) => updateScheduling({ max_days_ahead: Number(e.target.value) })}
                  className="bg-input border-border mt-1"
                />
              </div>
            </div>

            {/* Excluded weekdays */}
            <div>
              <Label className="text-xs mb-2 block">Dias excluídos da entrega</Label>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((day) => {
                  const excluded = deliveryConfig.scheduling_config.excluded_weekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      onClick={() => toggleWeekday(day.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        excluded
                          ? "border-destructive/30 bg-destructive/10 text-destructive line-through"
                          : "border-border bg-secondary/50 text-foreground hover:border-primary/30"
                      }`}
                    >
                      {excluded && <Ban className="h-3 w-3 inline mr-1" />}
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Clique para excluir/incluir dias de entrega</p>
            </div>

            {/* Skip holidays */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Pular feriados nacionais</p>
                <p className="text-[10px] text-muted-foreground">Domingos e feriados são automaticamente excluídos</p>
              </div>
              <Switch
                checked={deliveryConfig.scheduling_config.skip_holidays}
                onCheckedChange={(v) => updateScheduling({ skip_holidays: v })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
