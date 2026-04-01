import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, CheckCircle, PauseCircle, Package, Plus, Search, Copy, Pencil, Trash2, ToggleLeft, ToggleRight, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type CheckoutWithOffer = {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  is_active: boolean | null;
  pixel_id: string | null;
  custom_css: string | null;
  upsell_enabled: boolean | null;
  order_bump_enabled: boolean | null;
  config: any;
  offer_id: string | null;
  created_at: string | null;
};

type LogzzOffer = {
  product_name: string;
  product_hash: string | null;
  product_description: string | null;
  product_image_url: string | null;
  product_weight: number | null;
  product_width: number | null;
  product_height: number | null;
  product_length: number | null;
  product_warranty_days: number | null;
  product_categories: any[];
  offer_name: string;
  offer_hash: string | null;
  price: number;
  original_price: number;
  scheduling_checkout_url: string | null;
  expedition_checkout_url: string | null;
  role: string;
};

const Checkouts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingCheckout, setEditingCheckout] = useState<CheckoutWithOffer | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("hybrid");
  const [formOfferId, setFormOfferId] = useState("");
  const [formPixelId, setFormPixelId] = useState("");
  const [formOrderBump, setFormOrderBump] = useState(false);
  const [formUpsell, setFormUpsell] = useState(false);
  const [formCustomCss, setFormCustomCss] = useState("");
  // Tracking fields
  const [formPixelFacebook, setFormPixelFacebook] = useState("");
  const [formMetaCapiToken, setFormMetaCapiToken] = useState("");
  const [formGoogleAdsId, setFormGoogleAdsId] = useState("");
  const [formGoogleConversionId, setFormGoogleConversionId] = useState("");
  const [formGoogleAnalyticsId, setFormGoogleAnalyticsId] = useState("");
  const [formThankYouUrl, setFormThankYouUrl] = useState("");
  const [formWhatsappSupport, setFormWhatsappSupport] = useState("");
  const [logzzOffers, setLogzzOffers] = useState<LogzzOffer[]>([]);
  const [syncingLogzz, setSyncingLogzz] = useState(false);
  const [logzzPopoverOpen, setLogzzPopoverOpen] = useState(false);
  const [selectedLogzzOffer, setSelectedLogzzOffer] = useState<LogzzOffer | null>(null);

  const { data: checkouts = [], isLoading } = useQuery({
    queryKey: ["checkouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CheckoutWithOffer[];
    },
    enabled: !!user,
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["offers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers").select("id, name, price, product_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orderCounts = {} } = useQuery({
    queryKey: ["checkout-order-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("checkout_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((o) => {
        if (o.checkout_id) counts[o.checkout_id] = (counts[o.checkout_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("checkouts").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      toast.success("Checkout criado com sucesso!");
      closeWizard();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { error } = await supabase.from("checkouts").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      toast.success("Checkout atualizado!");
      closeWizard();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checkouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      toast.success("Checkout excluído!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("checkouts").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checkouts"] }),
    onError: (e: any) => toast.error(e.message),
  });

  function closeWizard() {
    setWizardOpen(false);
    setWizardStep(1);
    setEditingCheckout(null);
    setFormName("");
    setFormType("hybrid");
    setFormOfferId("");
    setFormPixelId("");
    setFormOrderBump(false);
    setFormUpsell(false);
    setFormCustomCss("");
    setFormPixelFacebook("");
    setFormMetaCapiToken("");
    setFormGoogleAdsId("");
    setFormGoogleConversionId("");
    setFormGoogleAnalyticsId("");
    setFormThankYouUrl("");
    setFormWhatsappSupport("");
  }

  function openEdit(c: CheckoutWithOffer) {
    setEditingCheckout(c);
    setFormName(c.name);
    setFormType(c.type || "hybrid");
    setFormOfferId(c.offer_id || "");
    setFormPixelId(c.pixel_id || "");
    setFormOrderBump(c.order_bump_enabled || false);
    setFormUpsell(c.upsell_enabled || false);
    setFormCustomCss(c.custom_css || "");
    setFormPixelFacebook((c as any).pixel_facebook || "");
    setFormMetaCapiToken((c as any).meta_capi_token || "");
    setFormGoogleAdsId((c as any).google_ads_id || "");
    setFormGoogleConversionId((c as any).google_conversion_id || "");
    setFormGoogleAnalyticsId((c as any).google_analytics_id || "");
    setFormThankYouUrl((c as any).thank_you_page_url || "");
    setFormWhatsappSupport((c as any).whatsapp_support || "");
    setWizardStep(1);
    setWizardOpen(true);
  }

  function handleSave() {
    if (!formName.trim()) return toast.error("Nome é obrigatório");
    const slug = formName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload: any = {
      name: formName.trim(),
      slug,
      type: formType,
      offer_id: formOfferId || null,
      pixel_id: formPixelId || null,
      order_bump_enabled: formOrderBump,
      upsell_enabled: formUpsell,
      custom_css: formCustomCss || null,
      user_id: user!.id,
      pixel_facebook: formPixelFacebook || null,
      meta_capi_token: formMetaCapiToken || null,
      google_ads_id: formGoogleAdsId || null,
      google_conversion_id: formGoogleConversionId || null,
      google_analytics_id: formGoogleAnalyticsId || null,
      thank_you_page_url: formThankYouUrl || null,
      whatsapp_support: formWhatsappSupport || null,
    };
    if (editingCheckout) {
      updateMutation.mutate({ id: editingCheckout.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function copyUrl(slug: string | null) {
    if (!slug) return toast.error("Slug não definido");
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  }

  const filtered = checkouts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = checkouts.filter((c) => c.is_active).length;
  const inactiveCount = checkouts.filter((c) => !c.is_active).length;
  const productCount = products.length;

  const typeLabel: Record<string, string> = { standard: "Padrão", express: "Express", hybrid: "Híbrido" };

  return (
    <div>
      <PageHeader
        title="Checkouts"
        subtitle="Gerencie seus fluxos de conversão e otimize suas vendas em tempo real."
        actions={
          <button
            onClick={() => setWizardOpen(true)}
            className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo Checkout
          </button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Checkouts" value={checkouts.length} icon={<ShoppingCart className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Ativos" value={activeCount} icon={<CheckCircle className="h-6 w-6 text-success" />} iconBg="bg-success/10" />
        <StatCard label="Inativos" value={inactiveCount} icon={<PauseCircle className="h-6 w-6 text-warning" />} iconBg="bg-warning/10" />
        <StatCard label="Produtos" value={productCount} icon={<Package className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
      </div>

      {/* List */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Meus Checkouts</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Plus className="h-12 w-12" />}
            title="Criar Primeiro Checkout"
            description="Crie seu primeiro checkout para começar a vender."
            className="border border-dashed border-border shadow-none"
            action={<button onClick={() => setWizardOpen(true)} className="gradient-primary rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground">+ Criar Checkout</button>}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const offer = offers.find((o) => o.id === c.offer_id);
              const product = offer ? products.find((p) => p.id === offer.product_id) : null;
              return (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4 transition-colors hover:bg-secondary">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-foreground truncate">{c.name}</span>
                      <Badge variant={c.is_active ? "default" : "secondary"} className={c.is_active ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                        {c.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{typeLabel[c.type || "hybrid"] || c.type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {product && <span>Produto: {product.name}</span>}
                      <span>{orderCounts[c.id] || 0} pedidos</span>
                      {c.slug && <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" />/c/{c.slug}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => copyUrl(c.slug)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => toggleMutation.mutate({ id: c.id, is_active: !c.is_active })}>
                      {c.is_active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Excluir este checkout?")) deleteMutation.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      <Dialog open={wizardOpen} onOpenChange={(o) => { if (!o) closeWizard(); }}>
        <DialogContent className="sm:max-w-[560px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingCheckout ? "Editar Checkout" : "Novo Checkout"}</DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3, 4].map((s) => (
              <button key={s} onClick={() => setWizardStep(s)} className={`flex-1 h-1.5 rounded-full transition-colors ${wizardStep >= s ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Passo {wizardStep} de 4 — {wizardStep === 1 ? "Produto & Oferta" : wizardStep === 2 ? "Configurações" : wizardStep === 3 ? "Tracking & Pixels" : "Personalização"}
          </p>

          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Importar da Logzz</Label>
                  <button
                    onClick={async () => {
                      setSyncingLogzz(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("logzz-list-products");
                        if (error) throw error;
                        if (data?.offers?.length > 0) {
                          setLogzzOffers(data.offers);
                          toast.success(`${data.offers.length} ofertas encontradas na Logzz!`);
                        } else {
                          toast.info(data?.message || "Nenhuma oferta encontrada. Verifique o token da Logzz.");
                        }
                      } catch {
                        toast.error("Erro ao buscar ofertas da Logzz");
                      } finally {
                        setSyncingLogzz(false);
                      }
                    }}
                    disabled={syncingLogzz}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    {syncingLogzz ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {syncingLogzz ? "Buscando..." : "↻ Sincronizar Logzz"}
                  </button>
                </div>
                {logzzOffers.length > 0 ? (
                  <Popover open={logzzPopoverOpen} onOpenChange={setLogzzPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={logzzPopoverOpen} className="w-full justify-between bg-input border-border text-left font-normal h-10">
                        {selectedLogzzOffer
                          ? <span className="truncate">{selectedLogzzOffer.product_name} — {selectedLogzzOffer.offer_name} (R$ {selectedLogzzOffer.price.toFixed(2)})</span>
                          : <span className="text-muted-foreground">Buscar oferta da Logzz...</span>
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por nome, preço, hash..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma oferta encontrada.</CommandEmpty>
                          <CommandGroup>
                            {logzzOffers.map((o, i) => (
                              <CommandItem
                                key={o.offer_hash || i}
                                value={`${o.product_name} ${o.offer_name} ${o.offer_hash} ${o.price} ${o.role}`}
                              onSelect={async () => {
                                  setSelectedLogzzOffer(o);
                                  setLogzzPopoverOpen(false);

                                  // Auto-fill checkout name + slug
                                  const slug = `${o.product_name}-${o.offer_hash || ""}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60);
                                  setFormName(o.offer_name || o.product_name);

                                  // Upsert product in DB
                                  try {
                                    const { data: existingProd } = await supabase
                                      .from("products")
                                      .select("id")
                                      .eq("user_id", user!.id)
                                      .eq("hash", o.product_hash)
                                      .maybeSingle();

                                    let productId = existingProd?.id;
                                    if (!productId) {
                                      const { data: newProd } = await supabase.from("products").insert({
                                        user_id: user!.id,
                                        name: o.product_name,
                                        hash: o.product_hash,
                                        description: o.product_description,
                                        main_image_url: o.product_image_url,
                                        weight: o.product_weight,
                                        width: o.product_width,
                                        height: o.product_height,
                                        length: o.product_length,
                                        warranty_days: o.product_warranty_days,
                                        categories: o.product_categories,
                                      }).select("id").single();
                                      productId = newProd?.id;
                                    } else {
                                      await supabase.from("products").update({
                                        name: o.product_name,
                                        description: o.product_description,
                                        main_image_url: o.product_image_url,
                                        weight: o.product_weight,
                                        width: o.product_width,
                                        height: o.product_height,
                                        length: o.product_length,
                                        warranty_days: o.product_warranty_days,
                                        categories: o.product_categories,
                                      }).eq("id", productId);
                                    }

                                    if (productId) {
                                      // Upsert offer
                                      const { data: existingOffer } = await supabase
                                        .from("offers")
                                        .select("id")
                                        .eq("user_id", user!.id)
                                        .eq("hash", o.offer_hash)
                                        .maybeSingle();

                                      let offerId = existingOffer?.id;
                                      if (!offerId) {
                                        const { data: newOffer } = await supabase.from("offers").insert({
                                          user_id: user!.id,
                                          product_id: productId,
                                          name: o.offer_name,
                                          hash: o.offer_hash,
                                          price: o.price,
                                          original_price: o.original_price || o.price,
                                          scheduling_checkout_url: o.scheduling_checkout_url,
                                          expedition_checkout_url: o.expedition_checkout_url,
                                        }).select("id").single();
                                        offerId = newOffer?.id;
                                      } else {
                                        await supabase.from("offers").update({
                                          name: o.offer_name,
                                          price: o.price,
                                          original_price: o.original_price || o.price,
                                          scheduling_checkout_url: o.scheduling_checkout_url,
                                          expedition_checkout_url: o.expedition_checkout_url,
                                        }).eq("id", offerId);
                                      }

                                      if (offerId) {
                                        setFormOfferId(offerId);
                                        queryClient.invalidateQueries({ queryKey: ["offers"] });
                                        queryClient.invalidateQueries({ queryKey: ["products"] });
                                      }
                                    }
                                    toast.success(`Oferta "${o.offer_name}" importada com todos os dados!`);
                                  } catch (err: any) {
                                    console.error("[Logzz Import]", err);
                                    toast.error("Erro ao salvar produto/oferta no banco");
                                  }
                                }}
                              </div>
              <div>
                <Label>Nome do Checkout</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Checkout Principal" className="bg-input border-border" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Padrão</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Order Bump</Label><p className="text-xs text-muted-foreground">Oferecer produto adicional no checkout</p></div>
                <Switch checked={formOrderBump} onCheckedChange={setFormOrderBump} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Upsell</Label><p className="text-xs text-muted-foreground">Oferta pós-compra</p></div>
                <Switch checked={formUpsell} onCheckedChange={setFormUpsell} />
              </div>
              <div>
                <Label>Pixel ID</Label>
                <Input value={formPixelId} onChange={(e) => setFormPixelId(e.target.value)} placeholder="Ex: 123456789" className="bg-input border-border" />
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 mb-2">
                <p className="text-xs text-muted-foreground"><strong className="text-foreground">📊 Tracking & Pixels</strong> — Configure os pixels de rastreamento para medir conversões do checkout.</p>
              </div>
              <div>
                <Label>Facebook Pixel ID</Label>
                <Input value={formPixelFacebook} onChange={(e) => setFormPixelFacebook(e.target.value)} placeholder="Ex: 1234567890" className="bg-input border-border" />
                <p className="text-xs text-muted-foreground mt-1">Encontre em: Meta Business → Gerenciador de Eventos → Pixel</p>
              </div>
              <div>
                <Label>Meta CAPI Token (Conversions API)</Label>
                <Input value={formMetaCapiToken} onChange={(e) => setFormMetaCapiToken(e.target.value)} placeholder="EAAXXXXX..." type="password" className="bg-input border-border" />
                <p className="text-xs text-muted-foreground mt-1">Gere em: Gerenciador de Eventos → Configurações → Token de acesso</p>
              </div>
              <div>
                <Label>Google Ads ID</Label>
                <Input value={formGoogleAdsId} onChange={(e) => setFormGoogleAdsId(e.target.value)} placeholder="AW-XXXXXXXXXX" className="bg-input border-border" />
              </div>
              <div>
                <Label>Google Conversion ID</Label>
                <Input value={formGoogleConversionId} onChange={(e) => setFormGoogleConversionId(e.target.value)} placeholder="XXXXXXXX" className="bg-input border-border" />
              </div>
              <div>
                <Label>Google Analytics ID</Label>
                <Input value={formGoogleAnalyticsId} onChange={(e) => setFormGoogleAnalyticsId(e.target.value)} placeholder="G-XXXXXXXXXX" className="bg-input border-border" />
              </div>
              <div>
                <Label>URL pós-compra (Thank You Page)</Label>
                <Input value={formThankYouUrl} onChange={(e) => setFormThankYouUrl(e.target.value)} placeholder="https://seusite.com/obrigado" className="bg-input border-border" />
              </div>
              <div>
                <Label>WhatsApp Suporte</Label>
                <Input value={formWhatsappSupport} onChange={(e) => setFormWhatsappSupport(e.target.value)} placeholder="5511999999999" className="bg-input border-border" />
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label>CSS Customizado</Label>
                <Textarea
                  value={formCustomCss}
                  onChange={(e) => setFormCustomCss(e.target.value)}
                  placeholder=".checkout-container { ... }"
                  className="bg-input border-border font-mono text-xs min-h-[160px]"
                />
              </div>
              {formName && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Preview da URL</p>
                  <p className="text-sm text-primary font-mono">{window.location.origin}/c/{formName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : closeWizard()} className="text-muted-foreground">
              {wizardStep > 1 ? "Voltar" : "Cancelar"}
            </Button>
            {wizardStep < 4 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)} className="gradient-primary text-primary-foreground">Próximo</Button>
            ) : (
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="gradient-primary text-primary-foreground">
                {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : "Salvar e Publicar"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkouts;
