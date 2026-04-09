import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  pixelFacebook: string;
  setPixelFacebook: (v: string) => void;
  metaCapiToken: string;
  setMetaCapiToken: (v: string) => void;
  googleAdsId: string;
  setGoogleAdsId: (v: string) => void;
  googleConversionId: string;
  setGoogleConversionId: (v: string) => void;
  googleAnalyticsId: string;
  setGoogleAnalyticsId: (v: string) => void;
}

export default function StepTracking({
  pixelFacebook, setPixelFacebook, metaCapiToken, setMetaCapiToken,
  googleAdsId, setGoogleAdsId, googleConversionId, setGoogleConversionId,
  googleAnalyticsId, setGoogleAnalyticsId,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 mb-2">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">📊 Tracking & Pixels</strong> — Trackeie suas vendas de forma precisa e escale suas campanhas com dados reais.
        </p>
      </div>
      <div>
        <Label>Facebook Pixel ID</Label>
        <Input value={pixelFacebook} onChange={(e) => setPixelFacebook(e.target.value)} placeholder="Ex: 1234567890" className="bg-input border-border" />
        <p className="text-xs text-muted-foreground mt-1">Meta Business → Gerenciador de Eventos → Pixel</p>
      </div>
      <div>
        <Label>Meta CAPI Token (Conversions API)</Label>
        <Input value={metaCapiToken} onChange={(e) => setMetaCapiToken(e.target.value)} placeholder="EAAXXXXX..." type="password" className="bg-input border-border" />
        <p className="text-xs text-muted-foreground mt-1">Gerenciador de Eventos → Configurações → Token de acesso</p>
      </div>
      <div>
        <Label>Google Ads ID</Label>
        <Input value={googleAdsId} onChange={(e) => setGoogleAdsId(e.target.value)} placeholder="AW-XXXXXXXXXX" className="bg-input border-border" />
      </div>
      <div>
        <Label>Google Conversion ID</Label>
        <Input value={googleConversionId} onChange={(e) => setGoogleConversionId(e.target.value)} placeholder="XXXXXXXX" className="bg-input border-border" />
      </div>
      <div>
        <Label>Google Analytics ID</Label>
        <Input value={googleAnalyticsId} onChange={(e) => setGoogleAnalyticsId(e.target.value)} placeholder="G-XXXXXXXXXX" className="bg-input border-border" />
      </div>
    </div>
  );
}
