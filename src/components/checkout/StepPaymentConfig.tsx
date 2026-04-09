import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, QrCode, FileText, Wallet } from "lucide-react";

interface PaymentConfig {
  pix_enabled: boolean;
  credit_card_enabled: boolean;
  boleto_enabled: boolean;
  mp_balance_enabled: boolean;
}

interface Props {
  paymentConfig: PaymentConfig;
  setPaymentConfig: (v: PaymentConfig) => void;
}

const methods = [
  { key: "pix_enabled" as const, label: "PIX", desc: "Pagamento instantâneo via QR Code", icon: QrCode, color: "text-emerald-500" },
  { key: "credit_card_enabled" as const, label: "Cartão de Crédito", desc: "Parcelamento em até 12x", icon: CreditCard, color: "text-primary" },
  { key: "boleto_enabled" as const, label: "Boleto Bancário", desc: "Vencimento em 3 dias úteis", icon: FileText, color: "text-orange-500" },
  { key: "mp_balance_enabled" as const, label: "Saldo MercadoPago", desc: "Pagamento com saldo da conta", icon: Wallet, color: "text-sky-500" },
];

export default function StepPaymentConfig({ paymentConfig, setPaymentConfig }: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">💳 Pagamento via MercadoPago</strong> — Configure quais formas de pagamento estarão disponíveis no checkout.
          A integração com MercadoPago deve estar ativa nas Configurações.
        </p>
      </div>

      <div className="space-y-3">
        {methods.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-secondary ${m.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </div>
              <Switch
                checked={paymentConfig[m.key]}
                onCheckedChange={(v) => setPaymentConfig({ ...paymentConfig, [m.key]: v })}
              />
            </div>
          );
        })}
      </div>

      {!Object.values(paymentConfig).some(Boolean) && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive font-medium">⚠️ Ative pelo menos uma forma de pagamento para o checkout funcionar.</p>
        </div>
      )}
    </div>
  );
}
