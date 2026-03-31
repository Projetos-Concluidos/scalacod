import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ShieldCheck, Package, MapPin, Calendar, CreditCard,
  CheckCircle, User, Truck, Copy, QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { trackPixelEvent } from "@/lib/pixel";

interface CheckoutData {
  id: string; name: string; slug: string; type: string; offer_id: string;
  order_bump_enabled: boolean; config: any; custom_css: string | null; user_id: string;
}
interface OfferData { id: string; name: string; price: number; original_price: number | null; product_id: string; hash: string | null; }
interface ProductData { id: string; name: string; main_image_url: string | null; }
interface DeliveryDate { date: string; type: string; price: number; }
interface OrderBump { id: string; name: string; description: string | null; price: number | null; current_price: number | null; }

// Masks
const maskCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
const maskCep = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

const generateOrderNumber = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `SN-${date}-${rand}`;
};

const STEPS = [
  { label: "Dados", icon: User },
  { label: "Entrega", icon: Truck },
  { label: "Pagamento", icon: CreditCard },
  { label: "Confirmação", icon: CheckCircle },
];

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
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "boleto">("pix");
  const [orderNumber, setOrderNumber] = useState("");

  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "",
    cep: "", street: "", number: "", complement: "", district: "", city: "", state: "",
  });

  // Pixel tracking helper
  const track = (event: string, meta: Record<string, any> = {}) => {
    if (checkout) trackPixelEvent(checkout.user_id, checkout.id, event, meta);
  };

  // Load checkout data
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase.from("checkouts").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCheckout(c as any);
      // Track pageview
      trackPixelEvent(c.user_id, c.id, "pageview");
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

  // Track first interaction
  const [interactionTracked, setInteractionTracked] = useState(false);
  const trackInteraction = () => {
    if (!interactionTracked && checkout) {
      track("interaction");
      setInteractionTracked(true);
    }
  };

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const lookupCep = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({ ...prev, street: data.logradouro || "", district: data.bairro || "", city: data.localidade || "", state: data.uf || "" }));
      }
    } catch { /* ignore */ }
    // Track CEP check
    track("cep_check", { cep });
    await checkDeliveryProvider(cep);
    setCepLoading(false);
  };

  const checkDeliveryProvider = async (cep: string) => {
    try {
      // Simulate Logzz check — in production this goes through edge function
      // For now, simulate: CEPs starting with 0-3 → Logzz, rest → Coinzz
      const firstDigit = parseInt(cep[0]);
      if (firstDigit <= 3) {
        setProvider("logzz");
        setDeliveryDates([
          { date: getNextBusinessDay(1), type: "Express", price: 29.98 },
          { date: getNextBusinessDay(2), type: "Padrão", price: 24.98 },
          { date: getNextBusinessDay(3), type: "Padrão", price: 22.98 },
        ]);
      } else {
        throw new Error("Logzz indisponível");
      }
    } catch {
      setProvider("coinzz");
      setDeliveryDates([]);
      toast.info("Entrega via Correios — pagamento online necessário");
    }
    setDeliveryChecked(true);
  };

  const getNextBusinessDay = (daysAhead: number) => {
    const d = new Date();
    let count = 0;
    while (count < daysAhead) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    }
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  };

  const toggleBump = (id: string) => {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bumpsTotal = orderBumps.filter((b) => selectedBumps.has(b.id)).reduce((sum, b) => sum + (b.current_price || b.price || 0), 0);
  const shippingPrice = provider === "logzz" && selectedDate ? selectedDate.price : 0;
  const totalPrice = (offer?.price || 0) + bumpsTotal + shippingPrice;

  const validateStep1 = () => {
    if (!form.name || !form.phone || !form.cep || !form.street || !form.number || !form.district || !form.city || !form.state) {
      toast.error("Preencha todos os campos obrigatórios");
      return false;
    }
    if (!deliveryChecked) {
      toast.error("Aguarde a verificação do CEP");
      return false;
    }
    return true;
  };

  const goToStep2 = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!checkout || !offer) return;
    setSubmitting(true);
    track("order_submitted");
    try {
      const num = generateOrderNumber();
      setOrderNumber(num);
      const { error } = await supabase.from("orders").insert({
        user_id: checkout.user_id,
        order_number: num,
        checkout_id: checkout.id,
        offer_id: offer.id,
        client_name: form.name,
        client_email: form.email || null,
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
      });
      if (error) throw error;

      // Upsert lead
      await supabase.from("leads").upsert({
        user_id: checkout.user_id,
        name: form.name,
        phone: form.phone.replace(/\D/g, ""),
        email: form.email || null,
        document: form.cpf.replace(/\D/g, "") || null,
        status: "Confirmado",
      }, { onConflict: "user_id,phone" }).select();

      track("order_confirmed", { order_number: num });
      setStep(provider === "coinzz" ? 3 : 4);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar pedido");
    }
    setSubmitting(false);
  };

  // For Coinzz: after "payment" simulation, go to confirmation
  const confirmPayment = () => {
    setStep(4);
    toast.success("Pagamento processado!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(240,25%,3%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="min-h-screen bg-[hsl(240,25%,3%)] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Checkout não encontrado</h1>
          <p className="text-muted-foreground">Este checkout pode estar inativo ou não existe.</p>
        </div>
      </div>
    );
  }

  // Determine visible steps (Logzz skips payment)
  const visibleSteps = provider === "logzz"
    ? STEPS.filter((_, i) => i !== 2)
    : STEPS;

  const mapStep = (s: number) => {
    if (provider === "logzz") {
      if (s <= 2) return s;
      return s === 4 ? 3 : s;
    }
    return s;
  };

  const currentVisualStep = mapStep(step);

  return (
    <div className="min-h-screen bg-[hsl(240,25%,3%)] p-4 md:p-8">
      {checkout.custom_css && <style>{checkout.custom_css}</style>}

      <div className="mx-auto max-w-[560px]">
        {/* Logo */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-foreground">{checkout.name}</h1>
        </div>

        {/* Progress Steps */}
        {step < 4 && (
          <div className="mb-8 flex items-center justify-center gap-2">
            {visibleSteps.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = currentVisualStep === i + 1;
              const isDone = currentVisualStep > i + 1;
              return (
                <div key={s.label} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive ? "bg-primary/10 text-primary border border-primary/30" :
                    isDone ? "bg-success/10 text-success border border-success/30" :
                    "bg-secondary/30 text-muted-foreground border border-border"
                  }`}>
                    {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 1: Client Data */}
        {step === 1 && (
          <div className="space-y-4" onClick={trackInteraction}>
          <div className="space-y-4">
            <div className="ninja-card">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-4">
                <User className="h-4 w-4 text-primary" /> Dados Pessoais
              </h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome Completo *</Label>
                  <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} className="bg-input border-border mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">CPF *</Label>
                    <Input value={form.cpf} onChange={(e) => updateField("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" className="bg-input border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone (WhatsApp) *</Label>
                    <Input value={form.phone} onChange={(e) => updateField("phone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="bg-input border-border mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} type="email" className="bg-input border-border mt-1" />
                </div>
              </div>
            </div>

            <div className="ninja-card">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-4">
                <MapPin className="h-4 w-4 text-primary" /> Endereço de Entrega
              </h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">CEP *</Label>
                  <div className="mt-1 flex gap-2">
                    <Input value={form.cep} onChange={(e) => updateField("cep", maskCep(e.target.value))} onBlur={lookupCep} placeholder="00000-000" className="bg-input border-border flex-1" />
                    <Button variant="outline" size="sm" onClick={lookupCep} disabled={cepLoading}>
                      {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                    </Button>
                  </div>
                </div>
                {deliveryChecked && (
                  <div className={`rounded-lg border px-3 py-2 text-xs ${
                    provider === "logzz" ? "border-success/20 bg-success/5 text-success" : "border-primary/20 bg-primary/5 text-primary"
                  }`}>
                    {provider === "logzz" ? "✅ Entrega disponível — Pagamento na entrega (COD)" : "📦 Entrega via Correios — Pagamento online"}
                  </div>
                )}
                <div>
                  <Label className="text-xs">Rua *</Label>
                  <Input value={form.street} onChange={(e) => updateField("street", e.target.value)} className="bg-input border-border mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Número *</Label>
                    <Input value={form.number} onChange={(e) => updateField("number", e.target.value)} className="bg-input border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Complemento</Label>
                    <Input value={form.complement} onChange={(e) => updateField("complement", e.target.value)} className="bg-input border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Bairro *</Label>
                    <Input value={form.district} onChange={(e) => updateField("district", e.target.value)} className="bg-input border-border mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Cidade *</Label>
                    <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} className="bg-input border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Estado *</Label>
                    <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} maxLength={2} className="bg-input border-border mt-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary mini */}
            {offer && (
              <div className="ninja-card">
                <div className="flex items-center gap-3 mb-3">
                  {product?.main_image_url ? (
                    <img src={product.main_image_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{product?.name}</p>
                    <p className="text-lg font-bold text-primary">R$ {Number(offer.price).toFixed(2)}</p>
                  </div>
                </div>
                <Button onClick={goToStep2} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
                  Continuar →
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Delivery / Date Selection */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Order Bumps */}
            {orderBumps.length > 0 && (
              <div className="ninja-card">
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                  🎁 Adicione ao seu pedido
                </h3>
                <div className="space-y-2">
                  {orderBumps.map((bump) => (
                    <button
                      key={bump.id}
                      onClick={() => toggleBump(bump.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedBumps.has(bump.id) ? "border-primary bg-primary/5" : "border-border bg-secondary/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{bump.name}</p>
                          {bump.description && <p className="text-xs text-muted-foreground">{bump.description}</p>}
                        </div>
                        <div className="text-right">
                          {bump.price && bump.current_price && bump.price > bump.current_price && (
                            <p className="text-xs text-muted-foreground line-through">R$ {Number(bump.price).toFixed(2)}</p>
                          )}
                          <p className="text-sm font-bold text-primary">R$ {Number(bump.current_price || bump.price || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Logzz: Date Selection */}
            {provider === "logzz" && (
              <div className="ninja-card">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-4">
                  <Calendar className="h-4 w-4 text-primary" /> Escolha a data de entrega
                </h2>
                <div className="space-y-2 mb-4">
                  {deliveryDates.map((dd, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(dd)}
                      className={`w-full flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        selectedDate === dd ? "border-primary bg-primary/5" : "border-border bg-secondary/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-4 w-4 rounded-full border-2 ${selectedDate === dd ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                        <span className="text-sm text-foreground">{dd.date}</span>
                        <Badge variant="secondary" className="text-[10px]">{dd.type}</Badge>
                      </div>
                      <span className="text-sm font-semibold text-foreground">R$ {dd.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
                <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 mb-4">
                  <p className="text-xs text-success flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5" />
                    Pagamento na entrega (Cash on Delivery) — O entregador cobrará na hora.
                  </p>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Produto</span><span className="text-foreground">R$ {Number(offer?.price || 0).toFixed(2)}</span></div>
                  {bumpsTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Extras</span><span className="text-foreground">R$ {bumpsTotal.toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className="text-foreground">R$ {selectedDate ? selectedDate.price.toFixed(2) : "—"}</span></div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between font-bold text-base"><span className="text-foreground">Total</span><span className="text-primary">R$ {totalPrice.toFixed(2)}</span></div>
                </div>
                <Button onClick={handleSubmit} disabled={submitting || !selectedDate} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirmar Pedido → R$ {totalPrice.toFixed(2)}
                </Button>
              </div>
            )}

            {/* Coinzz: Go to payment */}
            {provider === "coinzz" && (
              <div className="ninja-card">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-4">
                  <Truck className="h-4 w-4 text-primary" /> Entrega pelos Correios
                </h2>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Produto</span><span className="text-foreground">R$ {Number(offer?.price || 0).toFixed(2)}</span></div>
                  {bumpsTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Extras</span><span className="text-foreground">R$ {bumpsTotal.toFixed(2)}</span></div>}
                  <div className="h-px bg-border" />
                  <div className="flex justify-between font-bold text-base"><span className="text-foreground">Total</span><span className="text-primary">R$ {totalPrice.toFixed(2)}</span></div>
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Ir para Pagamento →
                </Button>
              </div>
            )}

            <button onClick={() => setStep(1)} className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-2">
              ← Voltar para dados
            </button>
          </div>
        )}

        {/* STEP 3: Payment (Coinzz only) */}
        {step === 3 && provider === "coinzz" && (
          <div className="space-y-4">
            <div className="ninja-card">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-4">
                <CreditCard className="h-4 w-4 text-primary" /> Forma de Pagamento
              </h2>

              {/* Payment method tabs */}
              <div className="mb-4 flex rounded-lg border border-border overflow-hidden">
                {(["pix", "credit_card", "boleto"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
                      paymentMethod === m ? "bg-primary/10 text-primary border-b-2 border-primary" : "bg-secondary/20 text-muted-foreground"
                    }`}
                  >
                    {m === "pix" ? "📱 PIX" : m === "credit_card" ? "💳 Cartão" : "📄 Boleto"}
                  </button>
                ))}
              </div>

              {/* PIX */}
              {paymentMethod === "pix" && (
                <div className="text-center space-y-3">
                  <div className="mx-auto h-48 w-48 rounded-lg border border-border bg-secondary/30 flex items-center justify-center">
                    <QrCode className="h-24 w-24 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground">QR Code será gerado ao processar</p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-2">
                    <code className="flex-1 text-[10px] text-muted-foreground truncate">00020126580014br.gov.bcb.pix...</code>
                    <Button variant="ghost" size="sm" onClick={() => toast.success("Código copiado!")}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                  <p className="text-xs text-warning">⏳ Expira em 30 minutos</p>
                </div>
              )}

              {/* Credit Card */}
              {paymentMethod === "credit_card" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Número do Cartão</Label>
                    <Input placeholder="0000 0000 0000 0000" className="bg-input border-border mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Validade</Label>
                      <Input placeholder="MM/AA" className="bg-input border-border mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">CVV</Label>
                      <Input placeholder="000" className="bg-input border-border mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Nome no Cartão</Label>
                    <Input placeholder="Como impresso no cartão" className="bg-input border-border mt-1" />
                  </div>
                  <p className="text-xs text-muted-foreground">1x de R$ {totalPrice.toFixed(2)} sem juros</p>
                </div>
              )}

              {/* Boleto */}
              {paymentMethod === "boleto" && (
                <div className="text-center space-y-3">
                  <div className="rounded-lg border border-border bg-secondary/30 p-4">
                    <p className="text-sm text-foreground font-medium mb-1">Boleto Bancário</p>
                    <p className="text-xs text-muted-foreground">O boleto será gerado após confirmação. Validade: 3 dias úteis.</p>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between font-bold text-base">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">R$ {totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={confirmPayment} className="mt-4 w-full gradient-primary text-primary-foreground font-semibold h-11">
                Confirmar Pagamento → R$ {totalPrice.toFixed(2)}
              </Button>
            </div>

            <button onClick={() => setStep(2)} className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-2">
              ← Voltar
            </button>
          </div>
        )}

        {/* STEP 4: Confirmation */}
        {step === 4 && (
          <div className="ninja-card text-center py-8">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Pedido Confirmado!</h1>
            <p className="text-muted-foreground mb-6">Seu pedido foi registrado com sucesso.</p>

            <div className="mx-auto max-w-xs space-y-3 text-left rounded-lg border border-border bg-secondary/20 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número</span>
                <span className="font-mono font-bold text-foreground">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produto</span>
                <span className="text-foreground">{product?.name}</span>
              </div>
              {provider === "logzz" && selectedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrega</span>
                  <span className="text-foreground">{selectedDate.date}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Endereço</span>
                <span className="text-foreground text-right text-xs">{form.street}, {form.number} — {form.city}/{form.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-primary font-bold">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-primary/10 bg-primary/5 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                📱 Você receberá atualizações no WhatsApp: <strong className="text-foreground">{form.phone}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-muted-foreground/50 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Compra 100% segura • ScalaNinja
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPublic;
