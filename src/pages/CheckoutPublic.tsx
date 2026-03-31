import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Package, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

interface CheckoutData {
  id: string;
  name: string;
  slug: string;
  type: string;
  offer_id: string;
  order_bump_enabled: boolean;
  config: any;
  custom_css: string | null;
  user_id: string;
}

interface OfferData {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  product_id: string;
}

interface ProductData {
  id: string;
  name: string;
  main_image_url: string | null;
}

const CheckoutPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "",
    cep: "", street: "", number: "", complement: "", district: "", city: "", state: "",
  });

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase.from("checkouts").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCheckout(c as any);
      if (c.offer_id) {
        const { data: o } = await supabase.from("offers").select("*").eq("id", c.offer_id).single();
        if (o) {
          setOffer(o as any);
          const { data: p } = await supabase.from("products").select("*").eq("id", o.product_id).single();
          if (p) setProduct(p as any);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  async function lookupCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          street: data.logradouro || "",
          district: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
      }
    } catch { /* ignore */ }
    setCepLoading(false);
  }

  async function handleSubmit() {
    if (!form.name || !form.phone || !form.cep || !form.street || !form.number || !form.district || !form.city || !form.state) {
      return toast.error("Preencha todos os campos obrigatórios");
    }
    if (!checkout || !offer) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("orders").insert({
        user_id: checkout.user_id,
        checkout_id: checkout.id,
        offer_id: offer.id,
        client_name: form.name,
        client_email: form.email || null,
        client_document: form.cpf || null,
        client_phone: form.phone,
        client_zip_code: form.cep,
        client_address: form.street,
        client_address_number: form.number,
        client_address_comp: form.complement || null,
        client_address_district: form.district,
        client_address_city: form.city,
        client_address_state: form.state,
        order_final_price: offer.price,
        status: "Aguardando",
      });
      if (error) throw error;
      toast.success("Pedido confirmado com sucesso!");
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar pedido");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Checkout não encontrado</h1>
          <p className="text-muted-foreground">Este checkout pode estar inativo ou não existe.</p>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="ninja-card max-w-md w-full text-center">
          <ShieldCheck className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground">Seu pedido foi registrado. Você receberá atualizações pelo WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {checkout.custom_css && <style>{checkout.custom_css}</style>}
      <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Form */}
        <div className="md:col-span-3 space-y-6">
          {/* Step 1: Personal */}
          <div className="ninja-card">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
              <Package className="h-5 w-5 text-primary" /> Dados Pessoais
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Label>Nome Completo *</Label><Input value={form.name} onChange={(e) => updateField("name", e.target.value)} className="bg-input border-border mt-1" /></div>
              <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => updateField("cpf", e.target.value)} placeholder="000.000.000-00" className="bg-input border-border mt-1" /></div>
              <div><Label>Telefone *</Label><Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="(00) 00000-0000" className="bg-input border-border mt-1" /></div>
              <div className="sm:col-span-2"><Label>E-mail</Label><Input value={form.email} onChange={(e) => updateField("email", e.target.value)} type="email" className="bg-input border-border mt-1" /></div>
            </div>
          </div>

          {/* Step 2: Address */}
          <div className="ninja-card">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
              <MapPin className="h-5 w-5 text-primary" /> Endereço de Entrega
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>CEP *</Label>
                <div className="relative mt-1">
                  <Input value={form.cep} onChange={(e) => updateField("cep", e.target.value)} onBlur={lookupCep} placeholder="00000-000" className="bg-input border-border" />
                  {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                </div>
              </div>
              <div className="sm:col-span-2"><Label>Rua *</Label><Input value={form.street} onChange={(e) => updateField("street", e.target.value)} className="bg-input border-border mt-1" /></div>
              <div><Label>Número *</Label><Input value={form.number} onChange={(e) => updateField("number", e.target.value)} className="bg-input border-border mt-1" /></div>
              <div><Label>Complemento</Label><Input value={form.complement} onChange={(e) => updateField("complement", e.target.value)} className="bg-input border-border mt-1" /></div>
              <div><Label>Bairro *</Label><Input value={form.district} onChange={(e) => updateField("district", e.target.value)} className="bg-input border-border mt-1" /></div>
              <div><Label>Cidade *</Label><Input value={form.city} onChange={(e) => updateField("city", e.target.value)} className="bg-input border-border mt-1" /></div>
              <div><Label>Estado *</Label><Input value={form.state} onChange={(e) => updateField("state", e.target.value)} maxLength={2} className="bg-input border-border mt-1" /></div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="md:col-span-2">
          <div className="ninja-card sticky top-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
              <Calendar className="h-5 w-5 text-primary" /> Resumo do Pedido
            </h2>
            {product && (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                {product.main_image_url ? (
                  <img src={product.main_image_url} alt={product.name} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                )}
                <div>
                  <p className="font-semibold text-foreground text-sm">{product.name}</p>
                  {offer?.original_price && offer.original_price > offer.price && (
                    <p className="text-xs text-muted-foreground line-through">R$ {Number(offer.original_price).toFixed(2)}</p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">R$ {offer ? Number(offer.price).toFixed(2) : "0,00"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-foreground">A calcular</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-primary text-lg">R$ {offer ? Number(offer.price).toFixed(2) : "0,00"}</span>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full gradient-primary text-primary-foreground font-semibold h-12 text-base"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Confirmar Pedido
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Compra 100% segura
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPublic;
