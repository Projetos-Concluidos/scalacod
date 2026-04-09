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
import StepDeliveryConfig from "./StepDeliveryConfig";

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
const defaultDelivery = {
  delivery_method: "correios" as string,
  shipping_enabled: false,
  shipping_value: 0,
  scheduling_enabled: false,
  scheduling_config: {
    excluded_weekdays: [0] as number[], // Sunday
    skip_holidays: true,
    max_days_ahead: 14,
    min_days_ahead: 1,
  },
};

function initState(editData: any) {
  return {
    productType: editData?.product_type === "pedidos_manuais" ? "dropshipping" : (editData?.product_type || "dropshipping"),
    formName: editData?.name || "",
    productCoverUrl: editData?.product_cover_url || "",
    productPrice: editData?.product_price || 0,
    productOfferPrice: editData?.product_offer_price || 0,
    productDescription: editData?.product_description || "",
    selectedBumpIds: editData?.config?.selectedBumpIds || [],
    primaryColor: editData?.primary_color || "#6366f1",
    fontFamily: editData?.font_family || "Inter",
    ctaConfig: editData?.cta_config || { ...defaultCta },
    scarcityConfig: editData?.scarcity_timer_config || { ...defaultScarcity },
    bannerImages: editData?.banner_images || [],
    orderBumpEnabled: editData?.order_bump_enabled || false,
    upsellEnabled: editData?.upsell_enabled || false,
    bumps: editData?.config?.bumps || [],
    paymentConfig: editData?.config?.payment || { ...defaultPayment },
    pixelFacebook: editData?.pixel_facebook || "",
    metaCapiToken: editData?.meta_capi_token || "",
    googleAdsId: editData?.google_ads_id || "",
    googleConversionId: editData?.google_conversion_id || "",
    googleAnalyticsId: editData?.google_analytics_id || "",
    thankYouUrl: editData?.thank_you_page_url || "",
    downloadUrl: editData?.download_url || "",
    whatsappSupport: editData?.whatsapp_support || "",
    customCss: editData?.custom_css || "",
    deliveryConfig: editData?.config?.delivery || { ...defaultDelivery },
  };
}

export default function CheckoutWizardGeneral({ open, onClose, onSave, saving, editData }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [state, setState] = useState(() => initState(editData));

  // Reset all state when open changes or editData changes
  useEffect(() => {
    if (open) {
      setStep(1);
      setState(initState(editData));
    }
  }, [open, editData]);

  const set = <K extends keyof ReturnType<typeof initState>>(key: K, value: ReturnType<typeof initState>[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

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

  const stepLabels = ["Produto", "Entrega", "Visual", "Order Bump", "Pagamento", "Tracking", "Links & Extras"];
  const totalSteps = stepLabels.length;

  const isPhysical = state.productType === "dropshipping";

  function handleSave() {
    if (!state.formName.trim()) return toast.error("Nome é obrigatório");
    if (!state.productType) return toast.error("Selecione um tipo de produto");
    if (!state.productPrice || state.productPrice <= 0) return toast.error("Preço é obrigatório");

    const slug = `${state.formName.trim()}-${Math.random().toString(36).slice(2, 9)}`
      .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 80);

    onSave({
      name: state.formName.trim(),
      slug,
      checkout_category: "general",
      product_type: state.productType,
      product_cover_url: state.productCoverUrl || null,
      product_price: state.productPrice || null,
      product_offer_price: state.productOfferPrice || null,
      product_description: state.productDescription || null,
      primary_color: state.primaryColor || null,
      font_family: state.fontFamily || null,
      cta_config: state.ctaConfig,
      scarcity_timer_config: state.scarcityConfig,
      banner_images: state.bannerImages,
      order_bump_enabled: state.orderBumpEnabled,
      upsell_enabled: state.upsellEnabled,
      config: {
        payment: state.paymentConfig,
        bumps: state.bumps,
        selectedBumpIds: state.selectedBumpIds,
        delivery: isPhysical ? state.deliveryConfig : null,
      },
      pixel_facebook: state.pixelFacebook || null,
      pixel_id: state.pixelFacebook || null,
      meta_capi_token: state.metaCapiToken || null,
      google_ads_id: state.googleAdsId || null,
      google_conversion_id: state.googleConversionId || null,
      google_analytics_id: state.googleAnalyticsId || null,
      thank_you_page_url: state.thankYouUrl || null,
      download_url: state.downloadUrl || null,
      whatsapp_support: state.whatsappSupport || null,
      custom_css: state.customCss || null,
      type: "standard",
    });
  }

  // For digital products, skip the delivery step
  function getActualStep(displayStep: number): number {
    if (!isPhysical && displayStep >= 2) return displayStep + 1;
    return displayStep;
  }

  function getDisplaySteps() {
    if (!isPhysical) {
      return stepLabels.filter((_, i) => i !== 1); // Remove "Entrega"
    }
    return stepLabels;
  }

  const displaySteps = getDisplaySteps();
  const displayTotalSteps = displaySteps.length;

  function renderStep() {
    const actualStep = isPhysical ? step : (step >= 2 ? step + 1 : step);

    switch (actualStep) {
      case 1:
        return (
          <StepProductType
            productType={state.productType} setProductType={(v) => set("productType", v)}
            formName={state.formName} setFormName={(v) => set("formName", v)}
            productCoverUrl={state.productCoverUrl} setProductCoverUrl={(v) => set("productCoverUrl", v)}
            productPrice={state.productPrice} setProductPrice={(v) => set("productPrice", v)}
            productOfferPrice={state.productOfferPrice} setProductOfferPrice={(v) => set("productOfferPrice", v)}
            productDescription={state.productDescription} setProductDescription={(v) => set("productDescription", v)}
            selectedBumpIds={state.selectedBumpIds} setSelectedBumpIds={(v) => set("selectedBumpIds", v)}
            availableBumps={availableBumps}
          />
        );
      case 2:
        return (
          <StepDeliveryConfig
            deliveryConfig={state.deliveryConfig}
            setDeliveryConfig={(v) => set("deliveryConfig", v)}
          />
        );
      case 3:
        return (
          <StepVisualCustomization
            primaryColor={state.primaryColor} setPrimaryColor={(v) => set("primaryColor", v)}
            fontFamily={state.fontFamily} setFontFamily={(v) => set("fontFamily", v)}
            ctaConfig={state.ctaConfig} setCtaConfig={(v) => set("ctaConfig", v)}
            scarcityConfig={state.scarcityConfig} setScarcityConfig={(v) => set("scarcityConfig", v)}
            bannerImages={state.bannerImages} setBannerImages={(v) => set("bannerImages", v)}
          />
        );
      case 4:
        return (
          <StepOrderBumpGeneral
            orderBumpEnabled={state.orderBumpEnabled} setOrderBumpEnabled={(v) => set("orderBumpEnabled", v)}
            upsellEnabled={state.upsellEnabled} setUpsellEnabled={(v) => set("upsellEnabled", v)}
            bumps={state.bumps} setBumps={(v) => set("bumps", v)}
          />
        );
      case 5:
        return <StepPaymentConfig paymentConfig={state.paymentConfig} setPaymentConfig={(v) => set("paymentConfig", v)} />;
      case 6:
        return (
          <StepTracking
            pixelFacebook={state.pixelFacebook} setPixelFacebook={(v) => set("pixelFacebook", v)}
            metaCapiToken={state.metaCapiToken} setMetaCapiToken={(v) => set("metaCapiToken", v)}
            googleAdsId={state.googleAdsId} setGoogleAdsId={(v) => set("googleAdsId", v)}
            googleConversionId={state.googleConversionId} setGoogleConversionId={(v) => set("googleConversionId", v)}
            googleAnalyticsId={state.googleAnalyticsId} setGoogleAnalyticsId={(v) => set("googleAnalyticsId", v)}
          />
        );
      case 7:
        return (
          <StepExtras
            thankYouUrl={state.thankYouUrl} setThankYouUrl={(v) => set("thankYouUrl", v)}
            downloadUrl={state.downloadUrl} setDownloadUrl={(v) => set("downloadUrl", v)}
            whatsappSupport={state.whatsappSupport} setWhatsappSupport={(v) => set("whatsappSupport", v)}
            customCss={state.customCss} setCustomCss={(v) => set("customCss", v)}
            formName={state.formName} productType={state.productType}
          />
        );
      default:
        return null;
    }
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
          {displaySteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i + 1)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${step >= i + 1 ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Passo {step} de {displayTotalSteps} — {displaySteps[step - 1]}
        </p>

        {renderStep()}

        <div className="flex justify-between mt-6">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="text-muted-foreground">
            {step > 1 ? "Voltar" : "Cancelar"}
          </Button>
          {step < displayTotalSteps ? (
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
