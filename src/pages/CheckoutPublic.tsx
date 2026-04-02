import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ShieldCheck, Package, MapPin, Calendar, CreditCard,
  CheckCircle, User, Truck, Copy, QrCode, ChevronDown, Pencil,
  Lock, MessageCircle, FileText, AlertTriangle, XCircle, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { trackPixelEvent, FacebookPixel, GoogleAds, captureUTM, getUTM, getCookie } from "@/lib/pixel";

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CheckoutData {
  id: string; name: string; slug: string; type: string; offer_id: string;
  order_bump_enabled: boolean; config: any; custom_css: string | null; user_id: string;
  pixel_facebook?: string | null; meta_capi_token?: string | null;
  google_ads_id?: string | null; google_conversion_id?: string | null;
  google_analytics_id?: string | null; thank_you_page_url?: string | null;
  whatsapp_support?: string | null;
}
interface OfferData { id: string; name: string; price: number; original_price: number | null; product_id: string; hash: string | null; }
interface ProductData { id: string; name: string; main_image_url: string | null; }
interface DeliveryDate { date: string; type: string; price: number; }
interface OrderBump { id: string; name: string; description: string | null; price: number | null; current_price: number | null; }

const maskCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
const maskCep = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
const validateCpf = (cpf: string) => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11; if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11; if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
};

const extractQty = (name: string): number => {
  const match = name.match(/kit\s*(\d+)/i) || name.match(/^(\d+)\s/);
  return parseInt(match?.[1] || "1", 10);
};

const generateOrderNumber = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

const formatDeliveryDate = (dateStr: string) => {
  const date = new Date(dateStr + "T12:00:00");
  return {
    weekday: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    day: date.getDate(),
    month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
  };
};
const stepVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } },
};

const collapseVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto", transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
};

const CheckoutPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState<"logzz" | "coinzz" | null>(null);
  const [deliveryDates, setDeliveryDates] = useState<DeliveryDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<DeliveryDate | null>(null);
  const [deliveryChecked, setDeliveryChecked] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "boleto" | "wallet">("pix");
  const [orderNumber, setOrderNumber] = useState("");
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [cpfValidating, setCpfValidating] = useState(false);
  const [cpfResult, setCpfResult] = useState<{ valid: boolean; status: string; message: string; source?: string; customer_name?: string | null } | null>(null);
  const [pixData, setPixData] = useState<{ pixQrCode: string; pixQrCodeBase64: string; paymentId: string } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [bricksReady, setBricksReady] = useState(false);
  const cardFormRef = useRef<HTMLDivElement>(null);
  const bricksControllerRef = useRef<any>(null);
  const fbPixelRef = useRef<FacebookPixel | null>(null);
  const gAdsRef = useRef<GoogleAds | null>(null);

  const [form, setForm] = useState({
    name: "", cpf: "", phone: "",
    cep: "", street: "", number: "", complement: "", district: "", city: "", state: "",
  });

  // Debounced CPF validation via Logzz
  useEffect(() => {
    const digits = form.cpf.replace(/\D/g, "");
    if (digits.length !== 11) {
      setCpfResult(null);
      return;
    }
    if (!validateCpf(form.cpf)) {
      setCpfResult({ valid: false, status: "invalid", message: "CPF inválido" });
      return;
    }
    if (!checkout) return;

    setCpfValidating(true);
    const timer = setTimeout(async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/checkout-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "validate_cpf", user_id: checkout.user_id, cpf: digits }),
        });
        const data = await res.json();
        setCpfResult(data);
      } catch {
        setCpfResult({ valid: true, status: "approved", message: "CPF válido", source: "local" });
      }
      setCpfValidating(false);
    }, 600);

    return () => { clearTimeout(timer); setCpfValidating(false); };
  }, [form.cpf, checkout]);

  const track = (event: string, meta: Record<string, any> = {}) => {
    if (checkout) trackPixelEvent(checkout.user_id, checkout.id, event, meta);
  };

  // Capture UTM on mount
  useEffect(() => { captureUTM(); }, []);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase.from("checkouts").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCheckout(c as any);
      trackPixelEvent(c.user_id, c.id, "pageview");

      // Initialize Facebook Pixel
      if ((c as any).pixel_facebook) {
        const fbp = new FacebookPixel((c as any).pixel_facebook);
        fbp.init();
        fbp.pageView();
        fbPixelRef.current = fbp;
      }

      // Initialize Google Ads / Analytics
      const gId = (c as any).google_ads_id || (c as any).google_analytics_id;
      if (gId) {
        const gads = new GoogleAds(gId, (c as any).google_conversion_id || "");
        gads.init();
        gads.pageView();
        gAdsRef.current = gads;
      }

      if (c.offer_id) {
        const { data: o } = await supabase.from("offers").select("*").eq("id", c.offer_id).single();
        if (o) {
          setOffer(o as any);
          const { data: p } = await supabase.from("products").select("*").eq("id", o.product_id).single();
          if (p) setProduct(p as any);
          if (c.order_bump_enabled) {
            const { data: bumps } = await supabase.from("order_bumps").select("*").eq("offer_id", c.offer_id).eq("is_active", true);
            if (bumps) setOrderBumps(bumps as any);
          }
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  // Fetch MP public key when checkout loads (for coinzz card payments)
  useEffect(() => {
    if (!checkout) return;
    const fetchKey = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/checkout-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_mp_public_key", user_id: checkout.user_id }),
        });
        const data = await res.json();
        if (data.public_key) setMpPublicKey(data.public_key);
      } catch { /* no MP configured */ }
    };
    fetchKey();
  }, [checkout]);

  

  const [interactionTracked, setInteractionTracked] = useState(false);
  const trackInteraction = () => {
    if (!interactionTracked && checkout) { track("interaction"); setInteractionTracked(true); }
  };

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const lookupCep = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    track("cep_check", { cep });
    await checkDeliveryProvider(cep);
    setCepLoading(false);
  };

  const checkDeliveryProvider = async (cep: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/checkout-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_delivery", user_id: checkout?.user_id, cep: cep.replace(/\D/g, "") }),
      });
      const data = await res.json();
      if (import.meta.env.DEV) console.log("[Checkout] Response da edge function checkout-api:", JSON.stringify(data));
      if (import.meta.env.DEV) console.log("[Checkout] Provider:", data?.provider, "Datas:", data?.dates?.length);

      // Auto-fill address from edge function response (ViaCEP enrichment)
      if (data.street || data.neighborhood || data.city || data.state) {
        if (import.meta.env.DEV) console.log("[Checkout] Preenchendo endereço:", data.street, data.neighborhood, data.city, data.state);
        setForm((prev) => ({
          ...prev,
          street: data.street || prev.street,
          district: data.neighborhood || prev.district,
          city: data.city || prev.city,
          state: data.state || prev.state,
        }));
      }

      if (data.provider === "logzz" && data.dates?.length > 0) {
        setProvider("logzz"); setDeliveryDates(data.dates);
      } else {
        setProvider("coinzz"); setDeliveryDates([]);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("[Checkout] Erro ao verificar CEP:", err);
      // Fallback: try ViaCEP directly
      try {
        const viaCepRes = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`);
        const viaCepData = await viaCepRes.json();
        if (!viaCepData.erro) {
          setForm((prev) => ({ ...prev, street: viaCepData.logradouro || "", district: viaCepData.bairro || "", city: viaCepData.localidade || "", state: viaCepData.uf || "" }));
        }
      } catch { /* ignore */ }
      setProvider("coinzz"); setDeliveryDates([]);
    }
    setDeliveryChecked(true);
  };

  const toggleBump = (id: string) => {
    setSelectedBumps((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const [mpFeePercent, setMpFeePercent] = useState(0);

  // Fetch MP processing fee
  useEffect(() => {
    if (!checkout) return;
    const fetchFees = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/checkout-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_mp_fees", user_id: checkout.user_id }),
        });
        const data = await res.json();
        if (data.processing_fee_percent) setMpFeePercent(Number(data.processing_fee_percent));
      } catch { /* no fee configured */ }
    };
    fetchFees();
  }, [checkout]);

  const bumpsTotal = orderBumps.filter((b) => selectedBumps.has(b.id)).reduce((sum, b) => sum + (b.current_price || b.price || 0), 0);
  const shippingPrice = 0; // Frete grátis
  const basePrice = (offer?.price || 0) + bumpsTotal + shippingPrice;
  const mpFeeAmount = provider === "coinzz" && mpFeePercent > 0 ? Math.round(basePrice * mpFeePercent) / 100 : 0;
  const totalPrice = basePrice + mpFeeAmount;

  // Initialize MercadoPago Bricks when credit_card is selected on step 3
  useEffect(() => {
    if (step !== 3 || provider !== "coinzz" || paymentMethod !== "credit_card" || !mpPublicKey || !offer) return;

    setBricksReady(false);

    const waitForMPSDK = (): Promise<void> => {
      return new Promise((resolve) => {
        if (window.MercadoPago) { resolve(); return; }
        if (import.meta.env.DEV) console.log("[Cartão] Aguardando SDK MercadoPago carregar...");
        let attempts = 0;
        const check = setInterval(() => {
          attempts++;
          if (window.MercadoPago) { clearInterval(check); resolve(); }
          if (attempts > 50) { clearInterval(check); resolve(); } // 5s max
        }, 100);
      });
    };

    const initBricks = async () => {
      await waitForMPSDK();
      if (!window.MercadoPago) {
        if (import.meta.env.DEV) console.error("[Cartão] SDK MercadoPago não carregou após 5s");
        toast.error("Erro ao carregar SDK de pagamento. Recarregue a página.");
        return;
      }

      try {
        if (bricksControllerRef.current) {
          try { bricksControllerRef.current.unmount(); } catch {}
          bricksControllerRef.current = null;
        }
        const container = document.getElementById("cardPaymentBrick_container");
        if (container) container.innerHTML = "";

        if (import.meta.env.DEV) console.log("[Cartão] Inicializando Bricks com publicKey:", mpPublicKey.substring(0, 15) + "...");
        const mp = new window.MercadoPago(mpPublicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        const controller = await bricksBuilder.create("cardPayment", "cardPaymentBrick_container", {
          initialization: {
            amount: totalPrice,
            payer: {
              email: "comprador@checkout.com",
              firstName: form.name.split(" ")[0] || "",
              lastName: form.name.split(" ").slice(1).join(" ") || "",
              identification: { type: "CPF", number: form.cpf.replace(/\D/g, "") },
            },
          },
          customization: {
            paymentMethods: { minInstallments: 1, maxInstallments: 12 },
            visual: {
              style: {
                theme: "default",
                customVariables: { formBackgroundColor: "#ffffff", baseColor: "#10B981" },
              },
            },
          },
          callbacks: {
            onReady: () => {
              if (import.meta.env.DEV) console.log("[Cartão] Bricks pronto!");
              setBricksReady(true);
            },
            onSubmit: async (cardFormData: any) => {
              if (import.meta.env.DEV) console.log("[Cartão] Formulário submetido, token:", !!cardFormData.token);
              await processPayment(cardFormData.token, cardFormData.installments);
            },
            onError: (error: any) => {
              if (import.meta.env.DEV) console.error("[Cartão] Bricks error:", error);
              toast.error("Erro no formulário de pagamento");
            },
          },
        });

        bricksControllerRef.current = controller;
        if (import.meta.env.DEV) console.log("[Cartão] Bricks controller criado com sucesso");
      } catch (err) {
        if (import.meta.env.DEV) console.error("[Cartão] Failed to init Bricks:", err);
        toast.error("Erro ao inicializar formulário de cartão");
      }
    };

    const timer = setTimeout(initBricks, 300);
    return () => {
      clearTimeout(timer);
      if (bricksControllerRef.current) {
        try { bricksControllerRef.current.unmount(); } catch {}
        bricksControllerRef.current = null;
      }
    };
  }, [step, provider, paymentMethod, mpPublicKey, totalPrice]);

  const totalSteps = provider === "logzz" ? 3 : 4;
  const progressPercent = provider === "logzz"
    ? step >= 4 ? 100 : step === 3 ? 75 : step === 2 ? 50 : 25
    : (step / totalSteps) * 100;

  const cpfValid = validateCpf(form.cpf);
  const cpfApproved = cpfValid && cpfResult?.valid === true && cpfResult?.status !== "blocked";
  const step1Valid = form.name.length >= 2 && form.phone.replace(/\D/g, "").length >= 10 && cpfApproved && !cpfValidating;
  const step2Valid = form.cep.replace(/\D/g, "").length === 8 && form.street && form.number && form.district && form.city && form.state && deliveryChecked;

  const goToStep = (s: number) => {
    if (s === 2 && !step1Valid) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (s === 3 && !step2Valid) { toast.error("Preencha o endereço completo"); return; }
    track("step_" + s);

    // FB Pixel step events
    if (s === 2 && fbPixelRef.current) fbPixelRef.current.initiateCheckout(offer?.price || 0);
    if (s === 3 && fbPixelRef.current) fbPixelRef.current.addPaymentInfo();

    setStep(s);
  };

  const createOrder = async (): Promise<string | null> => {
    if (!checkout || !offer) return null;
    try {
      const num = generateOrderNumber();
      setOrderNumber(num);
      const utm = getUTM();
      
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/checkout-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          user_id: checkout.user_id,
          order_data: {
            order_number: num,
            checkout_id: checkout.id,
            offer_id: offer.id,
            client_name: form.name,
            client_email: null,
            client_document: form.cpf.replace(/\D/g, "") || null,
            client_phone: form.phone.replace(/\D/g, ""),
            client_zip_code: form.cep.replace(/\D/g, ""),
            client_address: form.street,
            client_address_number: form.number,
            client_address_comp: form.complement || null,
            client_address_district: form.district,
            client_address_city: form.city,
            client_address_state: form.state,
            order_final_price: totalPrice,
            shipping_value: shippingPrice,
            status: "Aguardando",
            logistics_type: provider || "logzz",
            delivery_date: provider === "logzz" && selectedDate ? selectedDate.date : null,
            payment_method: provider === "logzz" ? "afterpay" : paymentMethod,
            utm_source: utm.utm_source || null,
            utm_medium: utm.utm_medium || null,
            utm_campaign: utm.utm_campaign || null,
            utm_content: utm.utm_content || null,
            utm_term: utm.utm_term || null,
            utm_id: utm.utm_id || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao criar pedido");
      const orderId = data.order_id;

      track("order_confirmed", { order_number: num });

      // FB Pixel Purchase (client-side)
      if (fbPixelRef.current) fbPixelRef.current.purchase(totalPrice, "BRL", num);

      // Google Ads Conversion
      if (gAdsRef.current) gAdsRef.current.trackConversion(totalPrice, "BRL", num);

      // FB CAPI (server-side — more reliable)
      if (checkout.pixel_facebook && checkout.meta_capi_token) {
        supabase.functions.invoke("fb-capi", {
          body: {
            event: "Purchase",
            pixelId: checkout.pixel_facebook,
            capiToken: checkout.meta_capi_token,
            eventSourceUrl: window.location.href,
            userData: {
              email: form.email, phone: form.phone,
              firstName: form.name.split(" ")[0],
              lastName: form.name.split(" ").slice(1).join(" "),
              fbp: getCookie("_fbp"), fbc: getCookie("_fbc"),
            },
            customData: { value: totalPrice, currency: "BRL", order_id: num },
          },
        }).catch(() => {}); // fire-and-forget
      }

      // FB Lead event
      if (fbPixelRef.current) fbPixelRef.current.lead(totalPrice);

      return orderId || null;
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar pedido");
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!checkout || !offer) return;
    setSubmitting(true);
    track("order_submitted");
    if (provider === "logzz") {
      const oid = await createOrder();
      if (oid) setStep(4);
    } else {
      // For coinzz, just move to step 3 (payment) — order created on payment
      setStep(3);
    }
    setSubmitting(false);
  };

  const processPayment = async (bricksCardToken?: string, bricksInstallments?: number) => {
    if (!checkout || !offer) return;
    setPaymentLoading(true);
    try {
      // Create order first
      if (import.meta.env.DEV) console.log("[Payment] Criando pedido...");
      const oid = await createOrder();
      if (!oid) { if (import.meta.env.DEV) console.error("[Payment] Falha ao criar pedido"); setPaymentLoading(false); return; }
      if (import.meta.env.DEV) console.log("[Payment] Pedido criado:", oid);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      if (import.meta.env.DEV) console.log(`[Payment] Chamando create-payment. Method: ${paymentMethod}, Store: ${checkout.user_id}, Amount: ${totalPrice}`);
      
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/create-payment?store=${checkout.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: oid,
          method: paymentMethod,
          cardToken: paymentMethod === "credit_card" ? bricksCardToken : undefined,
          installments: bricksInstallments || 1,
          payerEmail: form.email || "comprador@scalaninja.com",
          payerDocument: form.cpf,
          payerName: form.name,
        }),
      });
      const data = await res.json();
      if (import.meta.env.DEV) console.log("[Payment] Response:", JSON.stringify(data));

      if (!res.ok || data.error) {
        if (import.meta.env.DEV) console.error("[Payment] Erro:", data.error, data.details);
        toast.error(data.error || "Erro ao processar pagamento");
        setPaymentLoading(false);
        return;
      }

      if (data.status === "approved") {
        if (import.meta.env.DEV) console.log("[Payment] ✅ Pagamento aprovado imediatamente");
        track("payment_approved", { method: paymentMethod });
        setStep(4);
      } else if (paymentMethod === "pix") {
        if (import.meta.env.DEV) console.log("[Payment] PIX gerado. QR:", !!data.pixQrCode, "Base64:", !!data.pixQrCodeBase64, "PaymentId:", data.paymentId);
        if (!data.pixQrCodeBase64) {
          toast.error("Erro: QR Code PIX não foi gerado. Verifique as credenciais MercadoPago.");
          if (import.meta.env.DEV) console.error("[Payment] pixQrCodeBase64 ausente na resposta:", data);
        } else {
          setPixData({ pixQrCode: data.pixQrCode, pixQrCodeBase64: data.pixQrCodeBase64, paymentId: data.paymentId });
          startPixPolling(data.paymentId);
        }
      } else if (paymentMethod === "boleto") {
        if (import.meta.env.DEV) console.log("[Payment] Boleto gerado:", data.boletoUrl);
        if (data.boletoUrl) window.open(data.boletoUrl, "_blank");
        toast.success("Boleto gerado! Aguardando pagamento.");
        startPixPolling(data.paymentId);
      } else if (paymentMethod === "wallet" && data.walletRedirectUrl) {
        if (import.meta.env.DEV) console.log("[Payment] Redirecionando para wallet:", data.walletRedirectUrl);
        window.location.href = data.walletRedirectUrl;
      } else {
        if (import.meta.env.DEV) console.log("[Payment] Pagamento pendente, polling...", data);
        toast.info("Pagamento em processamento...");
        startPixPolling(data.paymentId);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar pagamento");
    }
    setPaymentLoading(false);
  };

  const startPixPolling = (paymentId: string) => {
    if (!checkout) return;
    setPaymentStatus("polling");
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/check-payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, storeId: checkout!.user_id }),
        });
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(interval);
          setPaymentStatus("approved");
          track("payment_approved", { method: paymentMethod });
          setStep(4);
        } else if (data.status === "rejected" || data.status === "cancelled") {
          clearInterval(interval);
          setPaymentStatus("failed");
          toast.error("Pagamento recusado. Tente novamente.");
        }
      } catch { /* retry */ }
    }, 4000);
    setTimeout(() => { clearInterval(interval); }, 30 * 60 * 1000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout não encontrado</h1>
          <p className="text-gray-500">Este checkout pode estar inativo ou não existe.</p>
        </div>
      </div>
    );
  }

  const quantity = extractQty(checkout.name);

  // ── STEP 4: CONFIRMATION PAGE ──
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50">
        {checkout.custom_css && <style>{checkout.custom_css}</style>}
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-gray-200"><div className="h-full w-full bg-emerald-500" /></div>
        <motion.div className="mx-auto max-w-lg px-4 py-12" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
            <motion.div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}>
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Pedido Confirmado!</h1>
            <p className="text-sm text-gray-500 mb-6">Você receberá uma mensagem no WhatsApp com os detalhes.</p>
            <div className="mb-6 inline-block rounded-lg bg-gray-100 px-4 py-2 font-mono text-lg font-bold text-gray-900">
              Nº {orderNumber}
            </div>

            {/* Product */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-left mb-2">
              {product?.main_image_url ? (
                <img src={product.main_image_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200"><Package className="h-5 w-5 text-gray-400" /></div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{product?.name}</p>
                <p className="text-xs text-gray-500">{quantity} {quantity === 1 ? "unidade" : "unidades"}</p>
              </div>
              <p className="text-sm font-bold text-emerald-600">R$ {Number(offer?.price || 0).toFixed(2)}</p>
            </div>

            {/* Order Bumps purchased */}
            {orderBumps.filter(b => selectedBumps.has(b.id)).length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-left mb-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Itens adicionais
                </p>
                {orderBumps.filter(b => selectedBumps.has(b.id)).map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1 border-t border-emerald-100 first:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-500">1 unidade</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">R$ {(b.current_price || b.price || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Total breakdown */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-left mb-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Produto principal</span><span className="text-gray-800">R$ {Number(offer?.price || 0).toFixed(2)}</span></div>
                {bumpsTotal > 0 && (
                  <div className="flex justify-between"><span className="text-gray-500">Itens adicionais</span><span className="text-gray-800">R$ {bumpsTotal.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">Frete</span><span className="text-emerald-600 font-medium">Grátis</span></div>
                {mpFeeAmount > 0 && (
                  <div className="flex justify-between"><span className="text-gray-500">Taxa de processamento</span><span className="text-gray-800">R$ {mpFeeAmount.toFixed(2)}</span></div>
                )}
                <div className="h-px bg-gray-200 my-1" />
                <div className="flex justify-between font-bold text-base"><span className="text-gray-900">Total</span><span className="text-emerald-600">R$ {totalPrice.toFixed(2)}</span></div>
              </div>
            </div>

            {/* Client data */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-left text-sm space-y-2 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dados do Cliente</p>
              <p className="text-gray-700">👤 {form.name}</p>
              <p className="text-gray-700">📱 {form.phone}</p>
              {form.cpf && <p className="text-gray-700">🪪 {form.cpf}</p>}
            </div>

            {/* Address */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-left text-sm space-y-2 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Endereço de Entrega</p>
              <p className="text-gray-700">📍 {form.street}, {form.number}</p>
              <p className="text-gray-700">🏘️ {form.district} - {form.city}/{form.state}</p>
              <p className="text-gray-700">📮 CEP: {form.cep}</p>
            </div>

            {/* Delivery info */}
            {provider === "logzz" && (
              <>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm mb-3">
                  <p className="text-emerald-700 font-medium">🚚 Entrega via Logzz</p>
                  <p className="text-emerald-600 text-xs">PAGAMENTO NA ENTREGA</p>
                </div>
                {selectedDate && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm mb-4">
                    <p className="text-emerald-700 font-medium">📅 Entrega: {selectedDate.date}</p>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  const supportPhone = checkout?.whatsapp_support || "5599999999999";
                  const msg = encodeURIComponent(`Olá! Preciso de ajuda com o pedido #${orderNumber}`);
                  window.open(`https://wa.me/${supportPhone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Falar com Suporte
              </button>
              <button 
                onClick={() => {
                  // Generate receipt HTML and trigger print
                  const bumpsList = orderBumps.filter(b => selectedBumps.has(b.id));
                  const bumpsHtml = bumpsList.map(b => `
                    <tr><td style="padding:6px 0;border-bottom:1px solid #eee">${b.name} (1x)</td><td style="padding:6px 0;text-align:right;border-bottom:1px solid #eee">R$ ${(b.current_price || b.price || 0).toFixed(2)}</td></tr>
                  `).join("");
                  const receiptHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibo #${orderNumber}</title>
                    <style>body{font-family:Arial,sans-serif;max-width:400px;margin:20px auto;padding:20px;font-size:14px}
                    h1{text-align:center;font-size:18px;margin-bottom:4px}
                    .subtitle{text-align:center;color:#666;font-size:12px;margin-bottom:20px}
                    .section{margin-bottom:16px;padding:12px;border:1px solid #eee;border-radius:8px}
                    .section-title{font-size:11px;text-transform:uppercase;color:#999;font-weight:bold;margin-bottom:8px}
                    table{width:100%;border-collapse:collapse}
                    .total-row{font-weight:bold;font-size:16px;border-top:2px solid #333}
                    .total-row td{padding-top:8px}
                    .footer{text-align:center;font-size:10px;color:#999;margin-top:24px}
                    @media print{body{margin:0;padding:10px}}
                    </style></head><body>
                    <h1>✅ Pedido Confirmado</h1>
                    <p class="subtitle">Recibo Nº ${orderNumber}</p>
                    <div class="section"><p class="section-title">Produto</p>
                    <table><tr><td>${product?.name} (1x)</td><td style="text-align:right">R$ ${Number(offer?.price || 0).toFixed(2)}</td></tr>
                    ${bumpsHtml}
                    ${bumpsTotal > 0 ? `<tr><td style="padding:6px 0;color:#666">Subtotal itens adicionais</td><td style="padding:6px 0;text-align:right;color:#666">R$ ${bumpsTotal.toFixed(2)}</td></tr>` : ""}
                    <tr><td style="padding:6px 0">Frete</td><td style="padding:6px 0;text-align:right;color:#10B981">Grátis</td></tr>
                    <tr class="total-row"><td>Total</td><td style="text-align:right;color:#10B981">R$ ${totalPrice.toFixed(2)}</td></tr>
                    </table></div>
                    <div class="section"><p class="section-title">Cliente</p>
                    <p>👤 ${form.name}</p><p>📱 ${form.phone}</p>${form.cpf ? `<p>🪪 ${form.cpf}</p>` : ""}</div>
                    <div class="section"><p class="section-title">Endereço</p>
                    <p>📍 ${form.street}, ${form.number}</p><p>🏘️ ${form.district} - ${form.city}/${form.state}</p><p>📮 CEP: ${form.cep}</p></div>
                    ${provider === "logzz" && selectedDate ? `<div class="section"><p class="section-title">Entrega</p><p>🚚 Entrega via Logzz · Pagamento na entrega</p><p>📅 ${selectedDate.date}</p></div>` : ""}
                    <p class="footer">Compra 100% segura • ScalaNinja</p>
                    </body></html>`;
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    printWindow.document.write(receiptHtml);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 500);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-4 w-4" /> Baixar Recibo
              </button>
            </div>
          </div>
          <p className="mt-6 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Compra 100% segura • ScalaNinja
          </p>
        </motion.div>
      </div>
    );
  }

  // ── MAIN CHECKOUT (Steps 1-3) ──

  const OrderSummary = ({ className = "" }: { className?: string }) => (
    <div className={`checkout-summary ${className}`}>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sticky top-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">🎁 Resumo do pedido</h3>

        {/* Product */}
        {offer && (
          <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-100">
            {product?.main_image_url ? (
              <img src={product.main_image_url} alt={product.name} className="h-24 w-24 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100 flex-shrink-0"><Package className="h-10 w-10 text-gray-400" /></div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">{product?.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-md bg-emerald-500 text-white text-sm font-bold">
                  {quantity}x
                </span>
                <span className="text-xs text-gray-500">{quantity === 1 ? "unidade" : "unidades"}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {offer.original_price && offer.original_price > offer.price && (
                  <span className="text-xs text-gray-400 line-through">R$ {Number(offer.original_price).toFixed(2)}</span>
                )}
                <span className="text-base font-black text-emerald-600">R$ {Number(offer.price).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bumps in summary */}
        {orderBumps.filter(b => selectedBumps.has(b.id)).map(b => (
          <div key={b.id} className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 truncate">{b.name}</span>
            <span className="text-gray-900 font-medium">R$ {(b.current_price || b.price || 0).toFixed(2)}</span>
          </div>
        ))}

        {/* Totals */}
        <div className="space-y-2 text-sm pt-3 border-t border-gray-100 mt-3">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-900">R$ {Number(offer?.price || 0).toFixed(2)}</span></div>
          {bumpsTotal > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">Itens adicionais</span><span className="text-gray-900">R$ {bumpsTotal.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Frete</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <Truck className="h-3 w-3" /> Grátis
            </span>
          </div>
          {mpFeeAmount > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">Taxa de processamento</span><span className="text-gray-900">R$ {mpFeeAmount.toFixed(2)}</span></div>
          )}
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between items-center font-bold text-lg pt-1">
            <span className="text-gray-900">Total</span>
            <span className="text-emerald-600">R$ {totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Provider badge */}
        {deliveryChecked && provider === "logzz" && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 font-medium text-center">
            🚚 Entrega via Logzz
          </div>
        )}

        {/* Trust */}
        <div className="checkout-trust-badges mt-4 space-y-2 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500"><Lock className="h-3.5 w-3.5 text-emerald-400" /> Proteção SSL 256-bit</div>
          <div className="flex items-center gap-2 text-xs text-gray-500"><Truck className="h-3.5 w-3.5 text-emerald-400" /> Entrega Garantida</div>
          <div className="flex items-center gap-2 text-xs text-gray-500"><CreditCard className="h-3.5 w-3.5 text-emerald-400" /> Pague na Entrega</div>
          <div className="flex items-center gap-2 text-xs text-gray-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> 7 dias de garantia</div>
        </div>
      </div>
    </div>
  );

  // Collapsed step card
  const CollapsedStep = ({ num, title, children, onEdit }: { num: number; title: string; children: React.ReactNode; onEdit: () => void }) => (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">
            <CheckCircle className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
          <Pencil className="h-3 w-3" /> Editar
        </button>
      </div>
      <div className="text-xs text-gray-600 space-y-0.5 pl-8">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" onClick={trackInteraction}>
      {checkout.custom_css && <style>{checkout.custom_css}</style>}

      {/* Secure header */}
      <header className="checkout-header bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-700">Compra 100% Segura</span>
          </div>
          <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[200px]">{product?.name || checkout.name}</span>
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] text-gray-400 font-medium">SSL</span>
          </div>
        </div>
        {/* Progress bar inside header */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header with product name */}
        <div className="mb-4 text-center">
          <h1 className="text-lg font-bold text-gray-900">{checkout.name}</h1>
        </div>

        {/* Social proof + trust badges */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
            <span className="text-base">🔥</span>
            <p className="text-xs text-orange-800"><strong>{Math.floor(Math.random() * 30 + 25)} pessoas</strong> estão vendo este produto agora</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: "🔒", title: "Site Seguro", sub: "SSL 256-bit" },
              { icon: "🚚", title: "Entrega Garantida", sub: "Rastreio em tempo real" },
              { icon: "💰", title: "Pague na Entrega", sub: "Sem risco" },
              { icon: "↩️", title: "7 dias de garantia", sub: "Devolução garantida" },
            ].map((badge) => (
              <div key={badge.title} className="flex flex-col items-center text-center p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xl mb-0.5">{badge.icon}</span>
                <p className="text-[10px] font-semibold text-gray-800 leading-tight">{badge.title}</p>
                <p className="text-[9px] text-gray-500">{badge.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* EXPRESS CHECKOUT — single step */}
        {checkout.type === "express" ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="checkout-form flex-1">
              <motion.div variants={stepVariants} initial="initial" animate="animate">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">⚡</div>
                    <h2 className="text-sm font-bold text-gray-900">Checkout Rápido</h2>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Nome completo *</Label>
                      <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Seu nome completo" className="mt-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">Telefone / WhatsApp *</Label>
                        <Input value={form.phone} onChange={(e) => updateField("phone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="mt-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">CPF *</Label>
                        <Input value={form.cpf} onChange={(e) => updateField("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" className="mt-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">CEP *</Label>
                      <div className="mt-1 flex gap-2">
                        <Input value={form.cep} onChange={(e) => updateField("cep", maskCep(e.target.value))} onBlur={lookupCep} placeholder="00000-000" className="flex-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                        <button onClick={lookupCep} disabled={cepLoading} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                          {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                        </button>
                      </div>
                    </div>
                    {form.street && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">Rua</Label>
                          <Input value={form.street} onChange={(e) => updateField("street", e.target.value)} className="mt-1 border-gray-200 bg-white" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Número *</Label>
                          <Input value={form.number} onChange={(e) => updateField("number", e.target.value)} className="mt-1 border-gray-200 bg-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!step1Valid) { toast.error("Preencha nome, telefone e CPF válido"); return; }
                      if (!step2Valid) { toast.error("Preencha o CEP e número"); return; }
                      setSubmitting(true);
                      track("order_submitted");
                      const oid = await createOrder();
                      if (oid) setStep(4);
                      setSubmitting(false);
                    }}
                    disabled={submitting || !step1Valid || !step2Valid}
                    className={`checkout-btn-primary mt-5 w-full rounded-2xl py-4 text-base font-bold text-white transition-all flex items-center justify-center gap-2 ${
                      step1Valid && step2Valid ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-[0.98]" : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Processando...</> : <><Lock className="h-5 w-5" /> Confirmar Pedido → R$ {totalPrice.toFixed(2)}</>}
                  </button>
                </div>
              </motion.div>
            </div>
            <OrderSummary className="hidden lg:block w-[340px] flex-shrink-0" />
          </div>
        ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: Form Column */}
          <div className="checkout-form flex-1 space-y-4">

            {/* ── STEP 1: Suas Informações ── */}
            <AnimatePresence mode="wait">
            {step > 1 ? (
              <motion.div key="step1-collapsed" variants={collapseVariants} initial="initial" animate="animate" exit="exit">
                <CollapsedStep num={1} title="Suas Informações" onEdit={() => setStep(1)}>
                  <p>👤 {form.name.toUpperCase()}</p>
                  <p>📱 {form.phone}</p>
                  {form.cpf && <p>🪪 {form.cpf}</p>}
                </CollapsedStep>
              </motion.div>
            ) : (
              <motion.div key="step1-form" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="checkout-step rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">1</div>
                    <h2 className="text-sm font-bold text-gray-900">Suas Informações</h2>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Nome completo *</Label>
                      <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Seu nome completo" className="mt-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">Telefone / WhatsApp *</Label>
                        <Input value={form.phone} onChange={(e) => updateField("phone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="mt-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">CPF *</Label>
                        <div className="relative">
                          <Input
                            value={form.cpf}
                            onChange={(e) => updateField("cpf", maskCpf(e.target.value))}
                            placeholder="000.000.000-00"
                            className={`mt-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500 pr-10 transition-colors ${
                              cpfResult?.valid === true ? "border-emerald-400 bg-emerald-50/30" :
                              cpfResult?.valid === false ? "border-red-400 bg-red-50/30" : ""
                            }`}
                          />
                          {/* Animated icon indicator */}
                          <AnimatePresence mode="wait">
                            {cpfValidating && (
                              <motion.div
                                key="cpf-loading"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5"
                              >
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                              </motion.div>
                            )}
                            {!cpfValidating && cpfResult?.valid === true && (
                              <motion.div
                                key="cpf-valid"
                                initial={{ opacity: 0, scale: 0, rotate: -90 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5"
                              >
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              </motion.div>
                            )}
                            {!cpfValidating && cpfResult?.valid === false && (
                              <motion.div
                                key="cpf-invalid"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5"
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Animated feedback message */}
                        <AnimatePresence mode="wait">
                          {cpfValidating && (
                            <motion.p
                              key="cpf-msg-loading"
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="mt-1.5 text-xs font-medium text-gray-500 flex items-center gap-1"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" /> Verificando CPF na Logzz...
                            </motion.p>
                          )}
                          {!cpfValidating && cpfResult?.valid === true && (
                            <motion.div
                              key="cpf-msg-valid"
                              initial={{ opacity: 0, y: -5, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -5, height: 0 }}
                              className="mt-1.5"
                            >
                              <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {cpfResult.message}
                                {cpfResult.source === "logzz" && (
                                  <span className="ml-1 inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                    Logzz ✓
                                  </span>
                                )}
                              </p>
                              {cpfResult.customer_name && (
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.2 }}
                                  className="text-[11px] text-gray-500 mt-0.5"
                                >
                                  Cliente: {cpfResult.customer_name}
                                </motion.p>
                              )}
                            </motion.div>
                          )}
                          {!cpfValidating && cpfResult?.valid === false && (
                            <motion.p
                              key="cpf-msg-invalid"
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              {cpfResult.status === "blocked" ? "⚠️ " : ""}
                              {cpfResult.message}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">E-mail</Label>
                      <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} type="email" placeholder="seu@email.com" className="mt-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                    </div>
                  </div>
                  <button
                    onClick={() => goToStep(2)}
                    disabled={!step1Valid}
                    className={`checkout-btn-primary mt-5 w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${step1Valid ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-[0.98]" : "bg-gray-300 cursor-not-allowed"}`}
                  >
                    <Lock className="h-4 w-4" /> Continuar com segurança →
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* ── STEP 2: Endereço e Entrega ── */}
            <AnimatePresence mode="wait">
            {step > 2 ? (
              <motion.div key="step2-collapsed" variants={collapseVariants} initial="initial" animate="animate" exit="exit">
                <CollapsedStep num={2} title="Endereço e Entrega" onEdit={() => setStep(2)}>
                  <p>📍 {form.street}, {form.number}</p>
                  <p>🏘️ {form.district} - {form.city}/{form.state}</p>
                  <p>📮 CEP: {form.cep}</p>
                </CollapsedStep>
              </motion.div>
            ) : step >= 2 ? (
              <motion.div key="step2-form" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">2</div>
                    <h2 className="text-sm font-bold text-gray-900">Endereço e Entrega</h2>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">CEP *</Label>
                      <div className="mt-1 flex gap-2">
                        <Input value={form.cep} onChange={(e) => updateField("cep", maskCep(e.target.value))} onBlur={lookupCep} placeholder="00000-000" className="flex-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                        <button onClick={lookupCep} disabled={cepLoading} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                          {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                        </button>
                      </div>
                    </div>
                    {form.street && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
                        📍 {form.street}, {form.district}<br />
                        {form.city} - {form.state} - CEP: {form.cep}
                      </motion.div>
                    )}
                    {deliveryChecked && provider === "logzz" && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        ✅ Entrega disponível — Pagamento na entrega (COD)
                      </motion.div>
                    )}
                    {deliveryChecked && provider === "coinzz" && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">📦</span>
                          <div>
                            <p className="font-semibold text-amber-800 text-sm">Entrega pelos Correios</p>
                            <p className="text-amber-700 text-xs mt-0.5">
                              Este endereço é atendido pelos Correios. O pagamento será realizado online (PIX, Cartão ou Boleto).
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-600">Rua *</Label>
                      <Input value={form.street} onChange={(e) => updateField("street", e.target.value)} className="mt-1 border-gray-200 bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">Bairro *</Label>
                        <Input value={form.district} onChange={(e) => updateField("district", e.target.value)} className="mt-1 border-gray-200 bg-white" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Número *</Label>
                        <Input value={form.number} onChange={(e) => updateField("number", e.target.value)} className="mt-1 border-gray-200 bg-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">Cidade *</Label>
                        <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} className="mt-1 border-gray-200 bg-white" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">UF *</Label>
                        <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} maxLength={2} className="mt-1 border-gray-200 bg-white" />
                      </div>
                    </div>
                  </div>
                  {/* Referência / Ponto de referência */}
                  <div>
                    <Label className="text-xs text-gray-600">Referência (opcional)</Label>
                    <textarea
                      value={form.complement}
                      onChange={(e) => updateField("complement", e.target.value)}
                      placeholder="Ex: Casa amarela, portão branco, próximo ao mercado..."
                      className="mt-1 w-full p-2.5 border border-gray-200 rounded-xl text-sm resize-none bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      rows={2}
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Ajude o entregador a encontrar seu endereço</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!step2Valid) { toast.error("Preencha o endereço completo e aguarde a verificação do CEP"); return; }
                      goToStep(3);
                    }}
                    disabled={!step2Valid}
                    className={`mt-5 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all ${step2Valid ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" : "bg-gray-300 cursor-not-allowed"}`}
                  >
                    Confirmar endereço →
                  </button>
                </div>
              </motion.div>
            ) : null}
            </AnimatePresence>

            {/* ── STEP 3: Date (Logzz) or Payment (Coinzz) ── */}
            <AnimatePresence mode="wait">
            {step === 3 && provider === "logzz" && (
              <motion.div key="step3-logzz" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 rounded-xl bg-emerald-500 px-4 py-3 text-white text-sm font-semibold flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Entrega via Logzz | PAGAMENTO NA ENTREGA
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">3</div>
                    <h2 className="text-sm font-bold text-gray-900">Escolha a Data de Entrega</h2>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Selecione a melhor data para receber seu pedido:</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {deliveryDates.map((dd, i) => {
                      const fmt = formatDeliveryDate(dd.date);
                      const isSelected = selectedDate === dd;
                      return (
                        <motion.button
                          key={i}
                          onClick={() => setSelectedDate(dd)}
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ y: -2 }}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
                          className={`relative rounded-xl border-2 p-3 text-center transition-colors ${
                            isSelected ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          {i === 0 && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white uppercase">Melhor</span>
                          )}
                          <p className="text-xs font-semibold text-gray-900 capitalize mt-1">{fmt.weekday}</p>
                          <p className="text-2xl font-bold text-gray-900">{fmt.day}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase">{fmt.month}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{dd.type}</p>
                        </motion.button>
                      );
                    })}
                  </div>

                  {orderBumps.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">⚡ Adicione ao seu pedido!</h3>
                      <div className="space-y-2">
                        {orderBumps.map((bump) => {
                          const isSelected = selectedBumps.has(bump.id);
                          return (
                            <button
                              key={bump.id}
                              onClick={() => toggleBump(bump.id)}
                              className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                                isSelected ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10" : "border-dashed border-gray-200 bg-white hover:border-emerald-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  {(bump as any).label_bump && (
                                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold inline-block mb-1">
                                      {(bump as any).label_bump}
                                    </span>
                                  )}
                                  <p className="text-sm font-semibold text-gray-900">{bump.name}</p>
                                  {bump.description && <p className="text-xs text-gray-500 mt-0.5">{bump.description}</p>}
                                  <p className="text-emerald-600 font-bold mt-1">+ R$ {Number(bump.current_price || bump.price || 0).toFixed(2)}</p>
                                </div>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isSelected ? "bg-emerald-500 text-white" : "border-2 border-gray-300"
                                }`}>
                                  {isSelected ? <CheckCircle className="h-4 w-4" /> : <Plus className="h-4 w-4 text-gray-400" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      track("order_submitted");
                      const oid = await createOrder();
                      if (oid) setStep(4);
                      setSubmitting(false);
                    }}
                    disabled={submitting || !selectedDate}
                    className={`w-full rounded-2xl py-4 font-bold text-base text-white flex items-center justify-center gap-2 transition-all ${
                      selectedDate ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 active:scale-[0.98]" : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Processando...</>
                    ) : (
                      <><Lock className="h-5 w-5" /> Confirmar Pedido Seguro → R$ {totalPrice.toFixed(2)}</>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> Dados protegidos</span>
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-emerald-400" /> Compra segura</span>
                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-400" /> Confirmação imediata</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && provider === "coinzz" && (
              <motion.div key="step3-coinzz" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">3</div>
                    <h2 className="text-sm font-bold text-gray-900">Forma de Pagamento</h2>
                  </div>

                  <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl border border-gray-200 overflow-hidden">
                    {(["pix", "credit_card", "boleto", "wallet"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setPaymentMethod(m); setPixData(null); setPaymentStatus(null); }}
                        className={`px-2 py-2.5 text-xs font-medium transition-colors ${
                          paymentMethod === m ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500" : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        {m === "pix" ? "📱 PIX" : m === "credit_card" ? "💳 Cartão" : m === "boleto" ? "📄 Boleto" : "💰 Saldo MP"}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {paymentMethod === "pix" && !pixData && (
                      <motion.div key="pix-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                          <QrCode className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-700 font-medium">Pagamento instantâneo via PIX</p>
                          <p className="text-xs text-gray-500">O QR Code será gerado ao clicar abaixo</p>
                        </div>
                      </motion.div>
                    )}

                    {paymentMethod === "pix" && pixData && (
                      <motion.div key="pix-qr" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                        <img src={`data:image/png;base64,${pixData.pixQrCodeBase64}`} className="mx-auto w-48 h-48 rounded-xl" alt="QR Code PIX" />
                        <p className="text-sm font-medium text-gray-700">Escaneie o QR Code para pagar</p>
                        <div className="flex gap-2">
                          <input value={pixData.pixQrCode} readOnly className="flex-1 text-[10px] p-2 border border-gray-200 rounded-lg bg-gray-50 truncate" />
                          <button onClick={() => { navigator.clipboard.writeText(pixData.pixQrCode); toast.success("Código copiado!"); }}
                            className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copiar
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-medium">
                          <Loader2 className="h-3 w-3 animate-spin" /> Aguardando pagamento...
                        </div>
                      </motion.div>
                    )}

                    {paymentMethod === "credit_card" && (
                      <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                        {!mpPublicKey ? (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Carregando formulário de pagamento...</p>
                          </div>
                        ) : (
                          <div id="cardPaymentBrick_container" ref={cardFormRef} />
                        )}
                        {!bricksReady && mpPublicKey && (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Inicializando pagamento seguro...</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {paymentMethod === "boleto" && (
                      <motion.div key="boleto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                          <p className="text-sm text-gray-900 font-medium mb-1">Boleto Bancário</p>
                          <p className="text-xs text-gray-500">O boleto será gerado e aberto em nova aba. Validade: 3 dias úteis.</p>
                        </div>
                      </motion.div>
                    )}

                    {paymentMethod === "wallet" && (
                      <motion.div key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                          <p className="text-2xl mb-2">💰</p>
                          <p className="text-sm text-gray-900 font-medium mb-1">Saldo MercadoPago</p>
                          <p className="text-xs text-gray-500">Você será redirecionado para o MercadoPago para concluir o pagamento com seu saldo disponível.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Only show pay button if not already showing PIX QR and not credit_card (Bricks handles its own submit) */}
                  {!(paymentMethod === "pix" && pixData) && paymentMethod !== "credit_card" && (
                    <button onClick={() => processPayment()} disabled={paymentLoading || submitting}
                      className="mt-5 w-full rounded-2xl bg-emerald-500 py-4 font-bold text-base text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {paymentLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                      {paymentMethod === "pix" ? "Gerar QR Code PIX" : paymentMethod === "boleto" ? "Gerar Boleto" : paymentMethod === "wallet" ? "Pagar com Saldo MP" : "Pagar"} → R$ {totalPrice.toFixed(2)}
                    </button>
                  )}

                  <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> Dados protegidos</span>
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-emerald-400" /> Compra segura</span>
                  </div>

                  <button onClick={() => setStep(2)} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-2 mt-2">← Voltar para endereço</button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Order Summary (desktop) */}
          <OrderSummary className="hidden lg:block w-[340px] flex-shrink-0" />
        </div>
        )}  {/* end express ternary */}

        {/* Mobile: Collapsible summary */}
        <div className="lg:hidden mt-4">
          <button
            onClick={() => setShowMobileSummary(!showMobileSummary)}
            className="w-full flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
          >
            <span className="text-sm font-semibold text-gray-900">🎁 Resumo do pedido</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-600">R$ {totalPrice.toFixed(2)}</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showMobileSummary ? "rotate-180" : ""}`} />
            </div>
          </button>
          {showMobileSummary && <OrderSummary className="mt-2" />}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Compra 100% segura • ScalaNinja
        </p>
      </div>
    </div>
  );
};

export default CheckoutPublic;
