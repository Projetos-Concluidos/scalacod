import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, CheckCircle, PauseCircle, Package, Plus, Search, Copy, Pencil, Trash2, ToggleLeft, ToggleRight, ExternalLink, RefreshCw, Loader2, ShoppingBag, Zap } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import CheckoutWizardGeneral from "@/components/checkout/CheckoutWizardGeneral";

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
  checkout_category?: string;
  product_type?: string;
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
  affiliate_code?: string | null;
  role: string;
};

const Checkouts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingCheckout, setEditingCheckout] = useState<CheckoutWithOffer | null>(null);
  const [generalWizardOpen, setGeneralWizardOpen] = useState(false);
  const [editingGeneralCheckout, setEditingGeneralCheckout] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("checkouts");
  const [filterCategory, setFilterCategory] = useState<"all" | "cod" | "general">("all");

  // Form state (COD wizard)
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("hybrid");
  const [formOfferId, setFormOfferId] = useState("");
  const [formCoinzzOfferHash, setFormCoinzzOfferHash] = useState("");
  const [formOrderBump, setFormOrderBump] = useState(false);
  const [formUpsell, setFormUpsell] = useState(false);
  const [formCustomCss, setFormCustomCss] = useState("");
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
  const [formBumps, setFormBumps] = useState<Array<{ offer_id: string; name: string; price: number; label_bump: string; description: string; hash: string | null; image_url: string | null; role?: string }>>([]);
  const [bumpSearchQuery, setBumpSearchQuery] = useState("");
  const [bumpLogzzPopoverOpen, setBumpLogzzPopoverOpen] = useState(false);
  const [formHyppeOfferData, setFormHyppeOfferData] = useState<any>(null);
  const [formProviderPriority, setFormProviderPriority] = useState("logzz_first");
  const [hyppeOffers, setHyppeOffers] = useState<any[]>([]);
  const [syncingHyppe, setSyncingHyppe] = useState(false);
  const [hyppePopoverOpen, setHyppePopoverOpen] = useState(false);

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
      const { data, error } = await supabase.from("checkouts").insert(payload).select("id, offer_id").single();
      if (error) throw error;
      if (payload.order_bump_enabled && payload.offer_id && formBumps.length > 0) {
        await saveBumps(payload.offer_id);
      }
      return data;
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
      if (payload.order_bump_enabled && payload.offer_id && formBumps.length > 0) {
        await saveBumps(payload.offer_id);
      } else if (!payload.order_bump_enabled && payload.offer_id) {
        await supabase.from("order_bumps").delete().eq("offer_id", payload.offer_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      toast.success("Checkout atualizado!");
      closeWizard();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // General checkout create/update
  const generalCreateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("checkouts").insert({ ...payload, user_id: user!.id }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      toast.success("Checkout Geral criado com sucesso!");
      setGeneralWizardOpen(false);
      setEditingGeneralCheckout(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generalUpdateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { error } = await supabase.from("checkouts").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      toast.success("Checkout Geral atualizado!");
      setGeneralWizardOpen(false);
      setEditingGeneralCheckout(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function saveBumps(offerId: string) {
    await supabase.from("order_bumps").delete().eq("offer_id", offerId);
    if (formBumps.length > 0) {
      const bumpsToInsert = formBumps.map(b => ({
        offer_id: offerId,
        name: b.name,
        price: b.price,
        current_price: b.price,
        hash: b.hash,
        label_bump: b.label_bump || "OFERTA ESPECIAL",
        description: b.description || null,
      }));
      await supabase.from("order_bumps").insert(bumpsToInsert);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("checkout_id", id);
      if (count && count > 0) throw new Error(`LINKED_ORDERS:${count}`);
      const { error } = await supabase.from("checkouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      toast.success("Checkout excluído com sucesso!");
    },
    onError: (e: any) => {
      if (e.message?.startsWith("LINKED_ORDERS:")) {
        const count = e.message.split(":")[1];
        toast.warning(`Este checkout possui ${count} pedido(s) vinculado(s) e não pode ser excluído. Desative-o em vez disso.`, { duration: 7000 });
      } else if (e.message?.includes("foreign key")) {
        toast.warning("Não é possível excluir: existem pedidos vinculados. Desative-o em vez disso.", { duration: 7000 });
      } else {
        toast.error(`Erro ao excluir: ${e.message}`);
      }
    },
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
    setFormName(""); setFormType("hybrid"); setFormOfferId(""); setFormCoinzzOfferHash("");
    setFormOrderBump(false); setFormUpsell(false); setFormCustomCss("");
    setFormPixelFacebook(""); setFormMetaCapiToken(""); setFormGoogleAdsId("");
    setFormGoogleConversionId(""); setFormGoogleAnalyticsId(""); setFormThankYouUrl("");
    setFormWhatsappSupport(""); setFormBumps([]); setBumpSearchQuery("");
    setFormHyppeOfferData(null); setFormProviderPriority("logzz_first"); setHyppeOffers([]);
  }

  function openEdit(c: CheckoutWithOffer) {
    // Check if it's a general checkout
    if ((c as any).checkout_category === "general") {
      setEditingGeneralCheckout(c);
      setGeneralWizardOpen(true);
      return;
    }
    setEditingCheckout(c);
    setFormName(c.name); setFormType(c.type || "hybrid"); setFormOfferId(c.offer_id || "");
    setFormCoinzzOfferHash((c as any).coinzz_offer_hash || "");
    setFormHyppeOfferData((c as any).hyppe_offer_data || null);
    setFormProviderPriority((c as any).provider_priority || "logzz_first");
    setFormOrderBump(c.order_bump_enabled || false); setFormUpsell(c.upsell_enabled || false);
    setFormCustomCss(c.custom_css || ""); setFormPixelFacebook((c as any).pixel_facebook || "");
    setFormMetaCapiToken((c as any).meta_capi_token || ""); setFormGoogleAdsId((c as any).google_ads_id || "");
    setFormGoogleConversionId((c as any).google_conversion_id || ""); setFormGoogleAnalyticsId((c as any).google_analytics_id || "");
    setFormThankYouUrl((c as any).thank_you_page_url || ""); setFormWhatsappSupport((c as any).whatsapp_support || "");
    setWizardStep(1); setWizardOpen(true);
    if (c.offer_id) {
      supabase.from("order_bumps").select("id, name, price, current_price, hash, description, label_bump, offer_id")
        .eq("offer_id", c.offer_id).then(({ data }) => {
          if (data) setFormBumps(data.map(b => ({
            offer_id: b.offer_id, name: b.name, price: b.current_price || b.price || 0,
            label_bump: b.label_bump || "OFERTA ESPECIAL", description: b.description || "",
            hash: b.hash || null, image_url: null,
          })));
        });
    }
  }

  function handleSave() {
    if (!formName.trim()) return toast.error("Nome é obrigatório");
    const offerSuffix = selectedLogzzOffer?.offer_hash || formOfferId?.slice(0, 7) || Math.random().toString(36).slice(2, 9);
    const slug = `${formName.trim()}-${offerSuffix}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    const payload: any = {
      name: formName.trim(), slug, type: formType, offer_id: formOfferId || null,
      pixel_id: formPixelFacebook || null, order_bump_enabled: formOrderBump, upsell_enabled: formUpsell,
      custom_css: formCustomCss || null, user_id: user!.id,
      pixel_facebook: formPixelFacebook || null, meta_capi_token: formMetaCapiToken || null,
      google_ads_id: formGoogleAdsId || null, google_conversion_id: formGoogleConversionId || null,
      google_analytics_id: formGoogleAnalyticsId || null, thank_you_page_url: formThankYouUrl || null,
      whatsapp_support: formWhatsappSupport || null, coinzz_offer_hash: formCoinzzOfferHash || null,
      hyppe_offer_data: formHyppeOfferData || null, provider_priority: formProviderPriority || "logzz_first",
      checkout_category: "cod",
    };
    if (editingCheckout) {
      updateMutation.mutate({ id: editingCheckout.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleGeneralSave(data: any) {
    if (editingGeneralCheckout) {
      generalUpdateMutation.mutate({ id: editingGeneralCheckout.id, ...data });
    } else {
      generalCreateMutation.mutate(data);
    }
  }

  function copyUrl(slug: string | null) {
    if (!slug) return toast.error("Slug não definido");
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  }

  const filtered = checkouts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const cat = (c as any).checkout_category || "cod";
    const matchCategory = filterCategory === "all" || cat === filterCategory;
    return matchSearch && matchCategory;
  });

  const activeCount = checkouts.filter((c) => c.is_active).length;
  const inactiveCount = checkouts.filter((c) => !c.is_active).length;
  const codCount = checkouts.filter((c) => ((c as any).checkout_category || "cod") === "cod").length;
  const generalCount = checkouts.filter((c) => (c as any).checkout_category === "general").length;

  const typeLabel: Record<string, string> = { standard: "Padrão", express: "Express", hybrid: "Híbrido" };
  const productTypeLabel: Record<string, string> = { pedidos_manuais: "Pedidos Manuais", dropshipping: "Dropshipping", curso: "Curso", info_produto: "Info Produto", servico: "Serviço" };

  return (
    <div>
      <PageHeader
        title="Checkouts"
        subtitle="Gerencie seus fluxos de conversão e otimize suas vendas em tempo real."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWizardOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary/80"
            >
              <Package className="h-4 w-4" /> Novo Checkout COD
            </button>
            <button
              onClick={() => { setEditingGeneralCheckout(null); setGeneralWizardOpen(true); }}
              className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
            >
              <Zap className="h-4 w-4" /> Novo Checkout PM
            </button>
          </div>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Checkouts" value={checkouts.length} icon={<ShoppingCart className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Ativos" value={activeCount} icon={<CheckCircle className="h-6 w-6 text-success" />} iconBg="bg-success/10" />
        <StatCard label="COD" value={codCount} icon={<Package className="h-6 w-6 text-warning" />} iconBg="bg-warning/10" />
        <StatCard label="Geral" value={generalCount} icon={<Zap className="h-6 w-6 text-primary" />} iconBg="bg-primary/10" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="checkouts">Checkouts COD</TabsTrigger>
          <TabsTrigger value="pm">Checkouts Pedidos Manuais</TabsTrigger>
          <TabsTrigger value="bumps">Order Bumps & Upsells</TabsTrigger>
        </TabsList>

        <TabsContent value="checkouts">
          <div className="ninja-card">
            <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">Checkouts COD</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Plus className="h-12 w-12" />}
                title="Criar Primeiro Checkout"
                description="Crie seu primeiro checkout para começar a vender."
                className="border border-dashed border-border shadow-none"
                action={
                  <div className="flex gap-2">
                    <button onClick={() => setWizardOpen(true)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground">COD</button>
                    <button onClick={() => setGeneralWizardOpen(true)} className="gradient-primary rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground">+ Checkout Geral</button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((c) => {
                  const offer = offers.find((o) => o.id === c.offer_id);
                  const product = offer ? products.find((p) => p.id === offer.product_id) : null;
                  const isCod = ((c as any).checkout_category || "cod") === "cod";
                  return (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4 transition-colors hover:bg-secondary">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-foreground truncate">{c.name}</span>
                          <Badge variant={c.is_active ? "default" : "secondary"} className={c.is_active ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                            {c.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${isCod ? "border-warning/30 text-warning" : "border-primary/30 text-primary"}`}>
                            {isCod ? "COD" : "Geral"}
                          </Badge>
                          {!isCod && (c as any).product_type && (
                            <Badge variant="outline" className="text-xs border-muted-foreground/20">
                              {productTypeLabel[(c as any).product_type] || (c as any).product_type}
                            </Badge>
                          )}
                          {isCod && <Badge variant="outline" className="text-xs">{typeLabel[c.type || "hybrid"] || c.type}</Badge>}
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
        </TabsContent>

        <TabsContent value="bumps">
          <OrderBumpsTab />
        </TabsContent>
      </Tabs>

      {/* COD Wizard Modal (existing) */}
      <Dialog open={wizardOpen} onOpenChange={(o) => { if (!o) closeWizard(); }}>
        <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <span className="text-[10px] bg-warning/15 text-warning px-2 py-0.5 rounded-full font-bold">COD</span>
              {editingCheckout ? "Editar Checkout COD" : "Novo Checkout COD"}
            </DialogTitle>
          </DialogHeader>

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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full font-bold">LOGZZ</span>
                    <Label>Importar da Logzz</Label>
                  </div>
                  <button
                    onClick={async () => {
                      setSyncingLogzz(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("logzz-list-products");
                        if (error) throw error;
                        if (data?.offers?.length > 0) { setLogzzOffers(data.offers); toast.success(`${data.offers.length} ofertas encontradas na Logzz!`); }
                        else { toast.info(data?.message || "Nenhuma oferta encontrada."); }
                      } catch { toast.error("Erro ao buscar ofertas da Logzz"); }
                      finally { setSyncingLogzz(false); }
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
                          : <span className="text-muted-foreground">Buscar oferta da Logzz...</span>}
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
                                  setSelectedLogzzOffer(o); setLogzzPopoverOpen(false);
                                  setFormName(o.offer_name || o.product_name);
                                  try {
                                    const { data: existingProd } = await supabase.from("products").select("id").eq("user_id", user!.id).eq("hash", o.product_hash).maybeSingle();
                                    let productId = existingProd?.id;
                                    if (!productId) {
                                      const { data: newProd } = await supabase.from("products").insert({
                                        user_id: user!.id, name: o.product_name, hash: o.product_hash, description: o.product_description,
                                        main_image_url: o.product_image_url, weight: o.product_weight, width: o.product_width,
                                        height: o.product_height, length: o.product_length, warranty_days: o.product_warranty_days, categories: o.product_categories,
                                      }).select("id").single();
                                      productId = newProd?.id;
                                    } else {
                                      await supabase.from("products").update({
                                        name: o.product_name, description: o.product_description, main_image_url: o.product_image_url,
                                        weight: o.product_weight, width: o.product_width, height: o.product_height,
                                        length: o.product_length, warranty_days: o.product_warranty_days, categories: o.product_categories,
                                      }).eq("id", productId);
                                    }
                                    if (productId) {
                                      const { data: existingOffer } = await supabase.from("offers").select("id").eq("user_id", user!.id).eq("hash", o.offer_hash).maybeSingle();
                                      let offerId = existingOffer?.id;
                                      if (!offerId) {
                                        const { data: newOffer } = await supabase.from("offers").insert({
                                          user_id: user!.id, product_id: productId, name: o.offer_name, hash: o.offer_hash,
                                          price: o.price, original_price: o.original_price || o.price,
                                          scheduling_checkout_url: o.scheduling_checkout_url, expedition_checkout_url: o.expedition_checkout_url,
                                          affiliate_code: o.affiliate_code || null,
                                        }).select("id").single();
                                        offerId = newOffer?.id;
                                      } else {
                                        await supabase.from("offers").update({
                                          name: o.offer_name, price: o.price, original_price: o.original_price || o.price,
                                          scheduling_checkout_url: o.scheduling_checkout_url, expedition_checkout_url: o.expedition_checkout_url,
                                          affiliate_code: o.affiliate_code || null,
                                        }).eq("id", offerId);
                                      }
                                      if (offerId) {
                                        setFormOfferId(offerId);
                                        queryClient.invalidateQueries({ queryKey: ["offers"] });
                                        queryClient.invalidateQueries({ queryKey: ["products"] });
                                      }
                                    }
                                    toast.success(`Oferta "${o.offer_name}" importada!`);
                                  } catch { toast.error("Erro ao salvar produto/oferta"); }
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${selectedLogzzOffer?.offer_hash === o.offer_hash ? "opacity-100" : "opacity-0"}`} />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium truncate">{o.product_name} — {o.offer_name}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    R$ {o.price.toFixed(2)} ·
                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${o.role === "affiliate" ? "bg-success/15 text-success" : o.role === "coproducer" ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning"}`}>
                                      {o.role === "affiliate" ? "afiliado" : o.role === "coproducer" ? "coprodutor" : "produtor"}
                                    </span>
                                    · {o.offer_hash}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="text-xs text-muted-foreground">Clique em ↻ para buscar ofertas da Logzz.</p>
                )}
                {selectedLogzzOffer && (() => {
                  const affCode = selectedLogzzOffer.affiliate_code
                    || (selectedLogzzOffer.role === "affiliate" && selectedLogzzOffer.scheduling_checkout_url
                      ? selectedLogzzOffer.scheduling_checkout_url.match(/\/pay\/([^/]+)\/[^/]+/)?.[1] ?? null : null);
                  return (
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-mono">
                      <span className="inline-flex items-center gap-1 bg-muted/50 rounded px-1.5 py-0.5">Hash: <span className="text-foreground/80 font-semibold">{selectedLogzzOffer.offer_hash || "—"}</span></span>
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${affCode ? "bg-success/10 text-success" : "bg-muted/50"}`}>ID Afiliado: <span className="font-semibold">{affCode || "N/A"}</span></span>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-semibold uppercase ${selectedLogzzOffer.role === "affiliate" ? "bg-success/10 text-success" : selectedLogzzOffer.role === "coproducer" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                        {selectedLogzzOffer.role === "affiliate" ? "afiliado" : selectedLogzzOffer.role === "coproducer" ? "coprodutor" : "produtor"}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div>
                <Label>Nome do Checkout</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Checkout Principal" className="bg-input border-border" />
              </div>
              {/* Hyppe */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-orange-500/15 text-orange-500 px-2 py-0.5 rounded-full font-bold">HYPPE</span>
                    <Label>Importar da Hyppe</Label>
                  </div>
                  <button
                    onClick={async () => {
                      setSyncingHyppe(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("hyppe-list-products");
                        if (error) throw error;
                        if (data?.error) { toast.error(data.error); }
                        else if (data?.offers?.length > 0) { setHyppeOffers(data.offers); toast.success(`${data.offers.length} ofertas Hyppe!`); }
                        else { toast.info("Nenhuma oferta Hyppe."); }
                      } catch { toast.error("Erro Hyppe"); }
                      finally { setSyncingHyppe(false); }
                    }}
                    disabled={syncingHyppe}
                    className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 disabled:opacity-50"
                  >
                    {syncingHyppe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {syncingHyppe ? "Buscando..." : "↻ Sincronizar Hyppe"}
                  </button>
                </div>
                {hyppeOffers.length > 0 ? (
                  <Popover open={hyppePopoverOpen} onOpenChange={setHyppePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between bg-input border-border text-left font-normal h-10">
                        {formHyppeOfferData
                          ? <span className="truncate">{formHyppeOfferData.product_name} — {formHyppeOfferData.offer_name} (R$ {formHyppeOfferData.price?.toFixed(2)})</span>
                          : <span className="text-muted-foreground">Buscar oferta da Hyppe...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por nome, preço..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma oferta encontrada.</CommandEmpty>
                          <CommandGroup>
                            {hyppeOffers.map((o, i) => (
                              <CommandItem key={o.hyppe_offer_id || i} value={`${o.product_name} ${o.offer_name} ${o.price}`} onSelect={() => {
                                setFormHyppeOfferData(o); setHyppePopoverOpen(false);
                                if (!formName) setFormName(o.offer_name || o.product_name);
                                toast.success(`Oferta Hyppe "${o.offer_name}" selecionada!`);
                              }}>
                                <Check className={`mr-2 h-4 w-4 ${formHyppeOfferData?.hyppe_offer_id === o.hyppe_offer_id ? "opacity-100" : "opacity-0"}`} />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium truncate">{o.product_name} — {o.offer_name}</span>
                                  <span className="text-xs text-muted-foreground">R$ {o.price?.toFixed(2)} · ID: {o.hyppe_offer_id || "N/A"}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="text-xs text-muted-foreground">Clique em ↻ para buscar ofertas da Hyppe.</p>
                )}
                {formHyppeOfferData && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] bg-orange-500/15 text-orange-500 px-2 py-0.5 rounded-full font-bold">HYPPE</span>
                    <span className="text-xs font-mono text-muted-foreground">{formHyppeOfferData.offer_name}</span>
                    <Check className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                )}
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
              {(formOfferId || formHyppeOfferData) && (
                <div>
                  <Label>Prioridade de verificação de CEP</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">Qual provedor logístico será consultado primeiro</p>
                  <Select value={formProviderPriority} onValueChange={setFormProviderPriority}>
                    <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="logzz_first">🟢 Logzz primeiro</SelectItem>
                      <SelectItem value="hyppe_first">🟠 Hyppe primeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
                <div><Label>Order Bump</Label><p className="text-xs text-muted-foreground">Oferecer produto adicional</p></div>
                <Switch checked={formOrderBump} onCheckedChange={setFormOrderBump} />
              </div>
              {formOrderBump && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Produtos para Order Bump</Label>
                    <button
                      onClick={async () => {
                        if (logzzOffers.length > 0) { setBumpLogzzPopoverOpen(true); return; }
                        setSyncingLogzz(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("logzz-list-products");
                          if (error) throw error;
                          if (data?.offers?.length > 0) { setLogzzOffers(data.offers); setBumpLogzzPopoverOpen(true); toast.success(`${data.offers.length} ofertas!`); }
                          else { toast.info("Nenhuma oferta."); }
                        } catch { toast.error("Erro Logzz"); }
                        finally { setSyncingLogzz(false); }
                      }}
                      disabled={syncingLogzz}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                      {syncingLogzz ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      {syncingLogzz ? "Buscando..." : "↻ Importar Logzz"}
                    </button>
                  </div>
                  {logzzOffers.length > 0 && (
                    <Popover open={bumpLogzzPopoverOpen} onOpenChange={setBumpLogzzPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between bg-input border-border text-left font-normal h-10">
                          <span className="text-muted-foreground">Buscar oferta para bump...</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma oferta encontrada.</CommandEmpty>
                            <CommandGroup>
                              {logzzOffers.filter((o) => !formBumps.some((b) => b.hash === o.offer_hash)).map((o, i) => (
                                <CommandItem
                                  key={`bump-${o.offer_hash || i}`}
                                  value={`${o.product_name} ${o.offer_name} ${o.offer_hash} ${o.price} ${o.role}`}
                                  onSelect={async () => {
                                    setBumpLogzzPopoverOpen(false);
                                    try {
                                      const { data: existingProd } = await supabase.from("products").select("id").eq("user_id", user!.id).eq("hash", o.product_hash).maybeSingle();
                                      let productId = existingProd?.id;
                                      if (!productId) {
                                        const { data: newProd } = await supabase.from("products").insert({
                                          user_id: user!.id, name: o.product_name, hash: o.product_hash, description: o.product_description,
                                          main_image_url: o.product_image_url, weight: o.product_weight, width: o.product_width,
                                          height: o.product_height, length: o.product_length, warranty_days: o.product_warranty_days, categories: o.product_categories,
                                        }).select("id").single();
                                        productId = newProd?.id;
                                      }
                                      if (productId) {
                                        const { data: existingOffer } = await supabase.from("offers").select("id").eq("user_id", user!.id).eq("hash", o.offer_hash).maybeSingle();
                                        let offerId = existingOffer?.id;
                                        if (!offerId) {
                                          const { data: newOffer } = await supabase.from("offers").insert({
                                            user_id: user!.id, product_id: productId, name: o.offer_name, hash: o.offer_hash, price: o.price,
                                            original_price: o.original_price || o.price, scheduling_checkout_url: o.scheduling_checkout_url, expedition_checkout_url: o.expedition_checkout_url,
                                          }).select("id").single();
                                          offerId = newOffer?.id;
                                        }
                                        if (offerId) {
                                          setFormBumps((prev) => [...prev, {
                                            offer_id: offerId!, name: `${o.product_name} — ${o.offer_name}`,
                                            price: o.price, label_bump: "OFERTA ESPECIAL", description: "", hash: o.offer_hash,
                                            image_url: o.product_image_url, role: o.role,
                                          }]);
                                          queryClient.invalidateQueries({ queryKey: ["offers"] });
                                          queryClient.invalidateQueries({ queryKey: ["products"] });
                                          toast.success(`"${o.offer_name}" adicionado como bump!`);
                                        }
                                      }
                                    } catch { toast.error("Erro ao importar bump"); }
                                  }}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium truncate">{o.product_name} — {o.offer_name}</span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      R$ {o.price.toFixed(2)} ·
                                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${o.role === "affiliate" ? "bg-success/15 text-success" : o.role === "coproducer" ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning"}`}>
                                        {o.role === "affiliate" ? "afiliado" : o.role === "coproducer" ? "coprodutor" : "produtor"}
                                      </span> · {o.offer_hash}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  {logzzOffers.length === 0 && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={bumpSearchQuery} onChange={(e) => setBumpSearchQuery(e.target.value)} placeholder="Buscar oferta local..." className="pl-9 bg-input border-border text-sm" />
                      </div>
                      {bumpSearchQuery && (
                        <div className="bg-secondary border border-border rounded-xl max-h-48 overflow-y-auto">
                          {offers.filter((o) => {
                            const q = bumpSearchQuery.toLowerCase();
                            const prod = products.find((p) => p.id === o.product_id);
                            return (o.name.toLowerCase().includes(q) || prod?.name.toLowerCase().includes(q)) && !formBumps.some((b) => b.offer_id === o.id);
                          }).map((o) => {
                            const prod = products.find((p) => p.id === o.product_id);
                            return (
                              <button key={o.id} onClick={() => {
                                setFormBumps((prev) => [...prev, { offer_id: o.id, name: o.name, price: Number(o.price), label_bump: "OFERTA ESPECIAL", description: "", hash: null, image_url: null }]);
                                setBumpSearchQuery(""); toast.success(`"${o.name}" adicionado`);
                              }} className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left border-b border-border/50 last:border-0">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><ShoppingBag className="h-4 w-4 text-muted-foreground" /></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{prod?.name} — {o.name}</p>
                                  <p className="text-xs text-primary">R$ {Number(o.price).toFixed(2)}</p>
                                </div>
                                <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </button>
                            );
                          })}
                          {offers.filter((o) => {
                            const q = bumpSearchQuery.toLowerCase();
                            const prod = products.find((p) => p.id === o.product_id);
                            return (o.name.toLowerCase().includes(q) || prod?.name.toLowerCase().includes(q)) && !formBumps.some((b) => b.offer_id === o.id);
                          }).length === 0 && <p className="p-3 text-sm text-muted-foreground text-center">Nenhuma oferta encontrada</p>}
                        </div>
                      )}
                    </>
                  )}
                  {formBumps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Bumps adicionados ({formBumps.length})</p>
                      {formBumps.map((bump, i) => (
                        <div key={bump.offer_id + i} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                          <span className="text-xs text-primary font-bold w-5 text-center">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{bump.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="text-primary">R$ {bump.price.toFixed(2)}</span>
                              {bump.role && <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${bump.role === "affiliate" ? "bg-success/15 text-success" : bump.role === "coproducer" ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning"}`}>
                                {bump.role === "affiliate" ? "afiliado" : bump.role === "coproducer" ? "coprodutor" : "produtor"}
                              </span>}
                              {bump.hash && <span>· {bump.hash}</span>}
                            </p>
                          </div>
                          <Input value={bump.label_bump} onChange={(e) => setFormBumps((prev) => prev.map((b, j) => j === i ? { ...b, label_bump: e.target.value } : b))} className="w-28 text-xs h-7 bg-input border-border" placeholder="Label" />
                          <button onClick={() => setFormBumps((prev) => prev.filter((_, j) => j !== i))} className="p-1 text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
                <div><Label>Upsell</Label><p className="text-xs text-muted-foreground">Oferta pós-compra</p></div>
                <Switch checked={formUpsell} onCheckedChange={setFormUpsell} />
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 mb-2">
                <p className="text-xs text-muted-foreground"><strong className="text-foreground">📊 Tracking & Pixels</strong> — Configure os pixels de rastreamento.</p>
              </div>
              <div><Label>Facebook Pixel ID</Label><Input value={formPixelFacebook} onChange={(e) => setFormPixelFacebook(e.target.value)} placeholder="Ex: 1234567890" className="bg-input border-border" /><p className="text-xs text-muted-foreground mt-1">Meta Business → Gerenciador de Eventos → Pixel</p></div>
              <div><Label>Meta CAPI Token</Label><Input value={formMetaCapiToken} onChange={(e) => setFormMetaCapiToken(e.target.value)} placeholder="EAAXXXXX..." type="password" className="bg-input border-border" /></div>
              <div><Label>Google Ads ID</Label><Input value={formGoogleAdsId} onChange={(e) => setFormGoogleAdsId(e.target.value)} placeholder="AW-XXXXXXXXXX" className="bg-input border-border" /></div>
              <div><Label>Google Conversion ID</Label><Input value={formGoogleConversionId} onChange={(e) => setFormGoogleConversionId(e.target.value)} placeholder="XXXXXXXX" className="bg-input border-border" /></div>
              <div><Label>Google Analytics ID</Label><Input value={formGoogleAnalyticsId} onChange={(e) => setFormGoogleAnalyticsId(e.target.value)} placeholder="G-XXXXXXXXXX" className="bg-input border-border" /></div>
              <div><Label>URL pós-compra</Label><Input value={formThankYouUrl} onChange={(e) => setFormThankYouUrl(e.target.value)} placeholder="https://seusite.com/obrigado" className="bg-input border-border" /></div>
              <div><Label>WhatsApp Suporte</Label><Input value={formWhatsappSupport} onChange={(e) => setFormWhatsappSupport(e.target.value)} placeholder="5511999999999" className="bg-input border-border" /></div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-4">
              <div><Label>CSS Customizado</Label><Textarea value={formCustomCss} onChange={(e) => setFormCustomCss(e.target.value)} placeholder=".checkout-container { ... }" className="bg-input border-border font-mono text-xs min-h-[160px]" /></div>
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

      {/* General Wizard */}
      <CheckoutWizardGeneral
        open={generalWizardOpen}
        onClose={() => { setGeneralWizardOpen(false); setEditingGeneralCheckout(null); }}
        onSave={handleGeneralSave}
        saving={generalCreateMutation.isPending || generalUpdateMutation.isPending}
        editData={editingGeneralCheckout}
      />
    </div>
  );
};

// Order Bumps & Upsells Tab
function OrderBumpsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bumps = [], isLoading } = useQuery({
    queryKey: ["all-order-bumps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_bumps").select("*, offers(name, hash, price)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteBumpMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("order_bumps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-order-bumps"] });
      toast.success("Order bump removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="ninja-card">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground mb-1">Order Bumps & Upsells</h2>
        <p className="text-sm text-muted-foreground">Gerencie todos os order bumps e upsells cadastrados nos seus checkouts.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : bumps.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-12 w-12" />}
          title="Nenhum Order Bump"
          description="Adicione order bumps ao criar ou editar um checkout."
          className="border border-dashed border-border shadow-none"
        />
      ) : (
        <div className="space-y-3">
          {bumps.map((bump: any) => (
            <div key={bump.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{bump.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-primary font-semibold">R$ {(bump.current_price || bump.price || 0).toFixed(2)}</span>
                    {bump.label_bump && <Badge variant="outline" className="text-[10px]">{bump.label_bump}</Badge>}
                    {bump.offers?.name && <span>· Oferta: {bump.offers.name}</span>}
                    {bump.hash && <span className="font-mono">· {bump.hash}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-4">
                <Badge variant={bump.is_active ? "default" : "secondary"} className={bump.is_active ? "bg-success/20 text-success border-success/30 text-xs" : "text-xs"}>
                  {bump.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Remover este order bump?")) deleteBumpMutation.mutate(bump.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Checkouts;
