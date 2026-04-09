import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StepProductType from "./StepProductType";
import StepVisualCustomization from "./StepVisualCustomization";
import StepOrderBumpGeneral from "./StepOrderBumpGeneral";
import StepPaymentConfig from "./StepPaymentConfig";
import StepTracking from "./StepTracking";
import StepExtras from "./StepExtras";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
  editData?: any;
}

const defaultCta = { title: "COMPRAR AGORA", icon: "🛒", bg_color: "#22c55e", text_color: "#ffffff", font_size: "lg", border_radius: "lg" };
const defaultScarcity = { enabled: false, duration_minutes: 15, bg_color: "#ef4444", text_color: "#ffffff", text: "🔥 OFERTA EXPIRA EM:" };
const defaultPayment = { pix_enabled: true, credit_card_enabled: true, boleto_enabled: false, mp_balance_enabled: false };

export default function CheckoutWizardGeneral({ open, onClose, onSave, saving, editData }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1
  const [productType, setProductType] = useState(editData?.product_type || "dropshipping");
  const [formName, setFormName] = useState(editData?.name || "");
  const [productCoverUrl, setProductCoverUrl] = useState(editData?.product_cover_url || "");
  const [productPrice, setProductPrice] = useState<number>(editData?.product_price || 0);
  const [productOfferPrice, setProductOfferPrice] = useState<number>(editData?.product_offer_price || 0);
  const [productDescription, setProductDescription] = useState(editData?.product_description || "");
  const [selectedBumpIds, setSelectedBumpIds] = useState<string[]>([]);

  // Step 2
  const [primaryColor, setPrimaryColor] = useState(editData?.primary_color || "#6366f1");
  const [fontFamily, setFontFamily] = useState(editData?.font_family || "Inter");
  const [ctaConfig, setCtaConfig] = useState(editData?.cta_config || { ...defaultCta });
  const [scarcityConfig, setScarcityConfig] = useState(editData?.scarcity_timer_config || { ...defaultScarcity });
  const [bannerImages, setBannerImages] = useState<string[]>(editData?.banner_images || []);

  // Step 3
  const [orderBumpEnabled, setOrderBumpEnabled] = useState(editData?.order_bump_enabled || false);
  const [upsellEnabled, setUpsellEnabled] = useState(editData?.upsell_enabled || false);
  const [bumps, setBumps] = useState<any[]>(editData?.config?.bumps || []);

  // Step 4
  const [paymentConfig, setPaymentConfig] = useState(editData?.config?.payment || { ...defaultPayment });

  // Step 5
  const [pixelFacebook, setPixelFacebook] = useState(editData?.pixel_facebook || "");
  const [metaCapiToken, setMetaCapiToken] = useState(editData?.meta_capi_token || "");
  const [googleAdsId, setGoogleAdsId] = useState(editData?.google_ads_id || "");
  const [googleConversionId, setGoogleConversionId] = useState(editData?.google_conversion_id || "");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(editData?.google_analytics_id || "");

  // Step 6
  const [thankYouUrl, setThankYouUrl] = useState(editData?.thank_you_page_url || "");
  const [downloadUrl, setDownloadUrl] = useState(editData?.download_url || "");
  const [whatsappSupport, setWhatsappSupport] = useState(editData?.whatsapp_support || "");
  const [customCss, setCustomCss] = useState(editData?.custom_css || "");

  // Fetch available bumps for selection in step 1
  const { data: availableBumps = [] } = useQuery({
    queryKey: ["available-bumps-for-general"],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_bumps").select("id, name, price, current_price, label_bump, description, image_url").eq("is_active", true);
      if (error) throw error;
      return (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        price: b.current_price || b.price || 0,
        label_bump: b.label_bump || "OFERTA ESPECIAL",
        description: b.description || "",
        image_url: b.image_url || "",
      }));
    },
    enabled: open && !!user,
  });

  const stepLabels = ["Produto", "Visual", "Order Bump", "Pagamento", "Tracking", "Links & Extras"];

  function handleSave() {
    if (!formName.trim()) return toast.error("Nome é obrigatório");
    if (!productType) return toast.error("Selecione um tipo de produto");
    if (!productPrice || productPrice <= 0) return toast.error("Preço é obrigatório");

    const slug = `${formName.trim()}-${Math.random().toString(36).slice(2, 9)}`
      .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 80);

    onSave({
      name: formName.trim(),
      slug,
      checkout_category: "general",
      product_type: productType,
      product_cover_url: productCoverUrl || null,
      product_price: productPrice || null,
      product_offer_price: productOfferPrice || null,
      product_description: productDescription || null,
      primary_color: primaryColor || null,
      font_family: fontFamily || null,
      cta_config: ctaConfig,
      scarcity_timer_config: scarcityConfig,
      banner_images: bannerImages,
      order_bump_enabled: orderBumpEnabled,
      upsell_enabled: upsellEnabled,
      config: { payment: paymentConfig, bumps, selectedBumpIds },
      pixel_facebook: pixelFacebook || null,
      pixel_id: pixelFacebook || null,
      meta_capi_token: metaCapiToken || null,
      google_ads_id: googleAdsId || null,
      google_conversion_id: googleConversionId || null,
      google_analytics_id: googleAnalyticsId || null,
      thank_you_page_url: thankYouUrl || null,
      download_url: downloadUrl || null,
      whatsapp_support: whatsappSupport || null,
      custom_css: customCss || null,
      type: "standard",
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">PM</span>
            {editData ? "Editar Checkout PM" : "Novo Checkout PM"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 mb-2">
          {stepLabels.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i + 1)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${step >= i + 1 ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Passo {step} de 6 — {stepLabels[step - 1]}
        </p>

        {step === 1 && (
          <StepProductType
            productType={productType} setProductType={setProductType}
            formName={formName} setFormName={setFormName}
            productCoverUrl={productCoverUrl} setProductCoverUrl={setProductCoverUrl}
            productPrice={productPrice} setProductPrice={setProductPrice}
            productOfferPrice={productOfferPrice} setProductOfferPrice={setProductOfferPrice}
            productDescription={productDescription} setProductDescription={setProductDescription}
            selectedBumpIds={selectedBumpIds} setSelectedBumpIds={setSelectedBumpIds}
            availableBumps={availableBumps}
          />
        )}
        {step === 2 && (
          <StepVisualCustomization
            primaryColor={primaryColor} setPrimaryColor={setPrimaryColor}
            fontFamily={fontFamily} setFontFamily={setFontFamily}
            ctaConfig={ctaConfig} setCtaConfig={setCtaConfig}
            scarcityConfig={scarcityConfig} setScarcityConfig={setScarcityConfig}
            bannerImages={bannerImages} setBannerImages={setBannerImages}
          />
        )}
        {step === 3 && (
          <StepOrderBumpGeneral
            orderBumpEnabled={orderBumpEnabled} setOrderBumpEnabled={setOrderBumpEnabled}
            upsellEnabled={upsellEnabled} setUpsellEnabled={setUpsellEnabled}
            bumps={bumps} setBumps={setBumps}
          />
        )}
        {step === 4 && (
          <StepPaymentConfig paymentConfig={paymentConfig} setPaymentConfig={setPaymentConfig} />
        )}
        {step === 5 && (
          <StepTracking
            pixelFacebook={pixelFacebook} setPixelFacebook={setPixelFacebook}
            metaCapiToken={metaCapiToken} setMetaCapiToken={setMetaCapiToken}
            googleAdsId={googleAdsId} setGoogleAdsId={setGoogleAdsId}
            googleConversionId={googleConversionId} setGoogleConversionId={setGoogleConversionId}
            googleAnalyticsId={googleAnalyticsId} setGoogleAnalyticsId={setGoogleAnalyticsId}
          />
        )}
        {step === 6 && (
          <StepExtras
            thankYouUrl={thankYouUrl} setThankYouUrl={setThankYouUrl}
            downloadUrl={downloadUrl} setDownloadUrl={setDownloadUrl}
            whatsappSupport={whatsappSupport} setWhatsappSupport={setWhatsappSupport}
            customCss={customCss} setCustomCss={setCustomCss}
            formName={formName} productType={productType}
          />
        )}

        <div className="flex justify-between mt-6">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="text-muted-foreground">
            {step > 1 ? "Voltar" : "Cancelar"}
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep(step + 1)} className="gradient-primary text-primary-foreground">Próximo</Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? "Salvando..." : "Salvar e Publicar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
