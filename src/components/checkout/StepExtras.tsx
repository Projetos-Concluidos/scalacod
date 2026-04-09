import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  thankYouUrl: string;
  setThankYouUrl: (v: string) => void;
  downloadUrl: string;
  setDownloadUrl: (v: string) => void;
  whatsappSupport: string;
  setWhatsappSupport: (v: string) => void;
  customCss: string;
  setCustomCss: (v: string) => void;
  formName: string;
  productType: string;
}

export default function StepExtras({
  thankYouUrl, setThankYouUrl, downloadUrl, setDownloadUrl,
  whatsappSupport, setWhatsappSupport, customCss, setCustomCss,
  formName, productType,
}: Props) {
  const showDownload = productType === "curso" || productType === "info_produto";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">🔗 Links & Extras</strong> — Configure links de pós-compra, suporte e personalização avançada.
        </p>
      </div>

      <div>
        <Label>URL Página de Obrigado</Label>
        <Input value={thankYouUrl} onChange={(e) => setThankYouUrl(e.target.value)} placeholder="https://seusite.com/obrigado" className="bg-input border-border" />
        <p className="text-xs text-muted-foreground mt-1">Redireciona o cliente após pagamento confirmado</p>
      </div>

      {showDownload && (
        <div>
          <Label>Link de Download / Acesso</Label>
          <Input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://seusite.com/area-de-membros" className="bg-input border-border" />
          <p className="text-xs text-muted-foreground mt-1">
            {productType === "curso" ? "Link de acesso ao curso enviado após confirmação" : "Link de download do produto digital"}
          </p>
        </div>
      )}

      <div>
        <Label>WhatsApp Suporte</Label>
        <Input value={whatsappSupport} onChange={(e) => setWhatsappSupport(e.target.value)} placeholder="5511999999999" className="bg-input border-border" />
        <p className="text-xs text-muted-foreground mt-1">Exibido no checkout como botão de suporte</p>
      </div>

      <div>
        <Label>CSS Customizado</Label>
        <Textarea
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
          placeholder=".checkout-container { ... }"
          className="bg-input border-border font-mono text-xs min-h-[120px]"
        />
      </div>

      {formName && (
        <div className="rounded-lg border border-border bg-secondary/50 p-4">
          <p className="text-xs text-muted-foreground mb-1">Preview da URL</p>
          <p className="text-sm text-primary font-mono">
            {window.location.origin}/c/{formName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}
          </p>
        </div>
      )}
    </div>
  );
}
