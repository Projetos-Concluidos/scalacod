import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ShieldCheck, Package, MapPin, Calendar, CreditCard,
  CheckCircle, User, Truck, Copy, QrCode, ChevronDown, Pencil,
  Lock, MessageCircle, FileText,
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
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "boleto">("pix");
  const [orderNumber, setOrderNumber] = useState("");
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "",
    cep: "", street: "", number: "", complement: "", district: "", city: "", state: "",
  });

  const track = (event: string, meta: Record<string, any> = {}) => {
    if (checkout) trackPixelEvent(checkout.user_id, checkout.id, event, meta);
  };

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase.from("checkouts").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCheckout(c as any);
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

  const [interactionTracked, setInteractionTracked] = useState(false);
  const trackInteraction = () => {
    if (!interactionTracked && checkout) { track("interaction"); setInteractionTracked(true); }
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
      if (data.provider === "logzz" && data.dates?.length > 0) {
        setProvider("logzz"); setDeliveryDates(data.dates);
      } else {
        setProvider("coinzz"); setDeliveryDates([]);
      }
    } catch {
      setProvider("coinzz"); setDeliveryDates([]);
    }
    setDeliveryChecked(true);
  };

  const toggleBump = (id: string) => {
    setSelectedBumps((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const bumpsTotal = orderBumps.filter((b) => selectedBumps.has(b.id)).reduce((sum, b) => sum + (b.current_price || b.price || 0), 0);
  const shippingPrice = provider === "logzz" && selectedDate ? selectedDate.price : 0;
  const totalPrice = (offer?.price || 0) + bumpsTotal + shippingPrice;

  const totalSteps = provider === "logzz" ? 3 : 4;
  const progressPercent = provider === "logzz"
    ? step >= 4 ? 100 : step === 3 ? 75 : step === 2 ? 50 : 25
    : (step / totalSteps) * 100;

  const cpfValid = validateCpf(form.cpf);
  const step1Valid = form.name.length >= 2 && form.phone.replace(/\D/g, "").length >= 10 && cpfValid;
  const step2Valid = form.cep.replace(/\D/g, "").length === 8 && form.street && form.number && form.district && form.city && form.state && deliveryChecked;

  const goToStep = (s: number) => {
    if (s === 2 && !step1Valid) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (s === 3 && !step2Valid) { toast.error("Preencha o endereço completo"); return; }
    track("step_" + s);
    setStep(s);
  };

  const handleSubmit = async () => {
    if (!checkout || !offer) return;
    setSubmitting(true);
    track("order_submitted");
    try {
      const num = generateOrderNumber();
      setOrderNumber(num);
      const { error } = await supabase.from("orders").insert({
        user_id: checkout.user_id, order_number: num, checkout_id: checkout.id, offer_id: offer.id,
        client_name: form.name, client_email: form.email || null,
        client_document: form.cpf.replace(/\D/g, "") || null,
        client_phone: form.phone.replace(/\D/g, ""),
        client_zip_code: form.cep.replace(/\D/g, ""),
        client_address: form.street, client_address_number: form.number,
        client_address_comp: form.complement || null, client_address_district: form.district,
        client_address_city: form.city, client_address_state: form.state,
        order_final_price: totalPrice, shipping_value: shippingPrice,
        status: "Aguardando", logistics_type: provider || "logzz",
        delivery_date: provider === "logzz" && selectedDate ? selectedDate.date : null,
        payment_method: provider === "logzz" ? "afterpay" : paymentMethod,
      });
      if (error) throw error;
      await supabase.from("leads").upsert({
        user_id: checkout.user_id, name: form.name, phone: form.phone.replace(/\D/g, ""),
        email: form.email || null, document: form.cpf.replace(/\D/g, "") || null, status: "Confirmado",
      }, { onConflict: "user_id,phone" }).select();
      track("order_confirmed", { order_number: num });
      setStep(provider === "coinzz" ? 3 : 4);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar pedido");
    }
    setSubmitting(false);
  };

  const confirmPayment = () => { setStep(4); toast.success("Pagamento processado!"); };

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

  // ── STEP 4: CONFIRMATION PAGE ──
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50">
        {checkout.custom_css && <style>{checkout.custom_css}</style>}
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-gray-200"><div className="h-full w-full bg-emerald-500" /></div>
        <div className="mx-auto max-w-lg px-4 py-12">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Pedido Confirmado!</h1>
            <p className="text-sm text-gray-500 mb-6">Você receberá uma mensagem no WhatsApp com os detalhes.</p>
            <div className="mb-6 inline-block rounded-lg bg-gray-100 px-4 py-2 font-mono text-lg font-bold text-gray-900">
              Nº {orderNumber}
            </div>

            {/* Product */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-left mb-4">
              {product?.main_image_url ? (
                <img src={product.main_image_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200"><Package className="h-5 w-5 text-gray-400" /></div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{product?.name}</p>
              </div>
              <p className="text-sm font-bold text-emerald-600">R$ {Number(offer?.price || 0).toFixed(2)}</p>
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
              <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
                <MessageCircle className="h-4 w-4" /> Falar com Suporte
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <FileText className="h-4 w-4" /> Baixar Recibo
              </button>
            </div>
          </div>
          <p className="mt-6 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Compra 100% segura • ScalaNinja
          </p>
        </div>
      </div>
    );
  }

  // ── MAIN CHECKOUT (Steps 1-3) ──
  const OrderSummary = ({ className = "" }: { className?: string }) => (
    <div className={className}>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sticky top-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">🎁 Resumo do pedido</h3>

        {/* Product */}
        {offer && (
          <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
            {product?.main_image_url ? (
              <img src={product.main_image_url} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100"><Package className="h-6 w-6 text-gray-400" /></div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{product?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">1 unidade(s)</p>
              <p className="text-base font-bold text-emerald-600 mt-1">R$ {Number(offer.price).toFixed(2)}</p>
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
          <div className="flex justify-between"><span className="text-gray-500">Frete</span><span className="text-gray-900">{shippingPrice > 0 ? `R$ ${shippingPrice.toFixed(2)}` : "Grátis"}</span></div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between font-bold text-base"><span className="text-gray-900">Total</span><span className="text-emerald-600">R$ {totalPrice.toFixed(2)}</span></div>
        </div>

        {/* Provider badge */}
        {deliveryChecked && provider === "logzz" && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 font-medium text-center">
            🚚 Entrega via Logzz
          </div>
        )}

        {/* Trust */}
        <div className="mt-4 space-y-2 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500"><Lock className="h-3.5 w-3.5 text-gray-400" /> Proteção SSL</div>
          <div className="flex items-center gap-2 text-xs text-gray-500"><Truck className="h-3.5 w-3.5 text-gray-400" /> Entrega Garantida</div>
          <div className="flex items-center gap-2 text-xs text-gray-500"><CreditCard className="h-3.5 w-3.5 text-gray-400" /> Pague na Entrega</div>
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

      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-gray-200">
        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 pt-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold text-gray-900">{checkout.name}</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: Form Column */}
          <div className="flex-1 space-y-4">

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
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
                        <Input value={form.cpf} onChange={(e) => updateField("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" className="mt-1 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
                        {form.cpf.replace(/\D/g, "").length === 11 && (
                          <p className={`mt-1 text-xs font-medium ${cpfValid ? "text-emerald-600" : "text-red-500"}`}>
                            {cpfValid ? "✓ CPF válido" : "✗ CPF inválido"}
                          </p>
                        )}
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
                    className={`mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white transition-all ${step1Valid ? "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20" : "bg-gray-300 cursor-not-allowed"}`}
                  >
                    Continuar →
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
                    {deliveryChecked && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                        provider === "logzz" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}>
                        {provider === "logzz" ? "✅ Entrega disponível — Pagamento na entrega (COD)" : "📦 Entrega via Correios — Pagamento online"}
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
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">Número *</Label>
                          <Input value={form.number} onChange={(e) => updateField("number", e.target.value)} className="mt-1 border-gray-200 bg-white" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Compl.</Label>
                          <Input value={form.complement} onChange={(e) => updateField("complement", e.target.value)} className="mt-1 border-gray-200 bg-white" />
                        </div>
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
                  <button
                    onClick={() => {
                      if (!step2Valid) { toast.error("Preencha o endereço completo e aguarde a verificação do CEP"); return; }
                      goToStep(3);
                    }}
                    disabled={!step2Valid}
                    className={`mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white transition-all ${step2Valid ? "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20" : "bg-gray-300 cursor-not-allowed"}`}
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
                      <h3 className="text-xs font-bold text-gray-700 mb-2">🎁 Adicione ao seu pedido</h3>
                      <div className="space-y-2">
                        {orderBumps.map((bump) => (
                          <button
                            key={bump.id}
                            onClick={() => toggleBump(bump.id)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              selectedBumps.has(bump.id) ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{bump.name}</p>
                                {bump.description && <p className="text-xs text-gray-500">{bump.description}</p>}
                              </div>
                              <p className="text-sm font-bold text-emerald-600">R$ {Number(bump.current_price || bump.price || 0).toFixed(2)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !selectedDate}
                    className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition-all ${
                      selectedDate ? "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20" : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {submitting && <Loader2 className="inline h-4 w-4 animate-spin mr-2" />}
                    Confirmar Pedido → R$ {totalPrice.toFixed(2)}
                  </button>
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

                  <div className="mb-4 flex rounded-xl border border-gray-200 overflow-hidden">
                    {(["pix", "credit_card", "boleto"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
                          paymentMethod === m ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500" : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        {m === "pix" ? "📱 PIX" : m === "credit_card" ? "💳 Cartão" : "📄 Boleto"}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {paymentMethod === "pix" && (
                      <motion.div key="pix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                        <div className="mx-auto h-48 w-48 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                          <QrCode className="h-24 w-24 text-gray-300" />
                        </div>
                        <p className="text-xs text-gray-500">QR Code será gerado ao processar</p>
                      </motion.div>
                    )}
                    {paymentMethod === "credit_card" && (
                      <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                        <div><Label className="text-xs text-gray-600">Número do Cartão</Label><Input placeholder="0000 0000 0000 0000" className="mt-1 border-gray-200" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs text-gray-600">Validade</Label><Input placeholder="MM/AA" className="mt-1 border-gray-200" /></div>
                          <div><Label className="text-xs text-gray-600">CVV</Label><Input placeholder="000" className="mt-1 border-gray-200" /></div>
                        </div>
                        <div><Label className="text-xs text-gray-600">Nome no Cartão</Label><Input placeholder="Como impresso no cartão" className="mt-1 border-gray-200" /></div>
                      </motion.div>
                    )}
                    {paymentMethod === "boleto" && (
                      <motion.div key="boleto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                          <p className="text-sm text-gray-900 font-medium mb-1">Boleto Bancário</p>
                          <p className="text-xs text-gray-500">O boleto será gerado após confirmação. Validade: 3 dias úteis.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button onClick={handleSubmit} disabled={submitting}
                    className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="inline h-4 w-4 animate-spin mr-2" />}
                    Confirmar Pagamento → R$ {totalPrice.toFixed(2)}
                  </button>

                  <button onClick={() => setStep(2)} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-2 mt-2">← Voltar para endereço</button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Order Summary (desktop) */}
          <OrderSummary className="hidden lg:block w-[340px] flex-shrink-0" />
        </div>

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
