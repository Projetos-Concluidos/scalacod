import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RefreshCw, Zap, Type, Image, List, MessageSquare, CreditCard, ArrowDown, LayoutGrid, Upload, Trash2, AlertTriangle, Wrench, HelpCircle, LogIn, UserPlus, Search, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type SectionData = Record<string, any>;

const sectionMeta: Record<string, { label: string; icon: any; description: string }> = {
  navbar: { label: "Navbar", icon: LayoutGrid, description: "Logo, links de navegação e botão CTA do topo" },
  hero: { label: "Hero", icon: Zap, description: "Seção principal — título, subtítulo, CTAs e prova social" },
  logos: { label: "Logos", icon: Image, description: "Logos de parceiros/integrações" },
  pain_points: { label: "Pain Points", icon: AlertTriangle, description: "Cards de dor do COD com problema → solução" },
  checkout_section: { label: "Checkout", icon: CreditCard, description: "Seção do checkout híbrido com steps" },
  features: { label: "Features", icon: List, description: "Funcionalidades com título, descrição, bullets e imagem" },
  tools: { label: "Tools", icon: Wrench, description: "Cards das 6 ferramentas do ecossistema" },
  testimonials: { label: "Depoimentos", icon: MessageSquare, description: "Depoimentos de clientes" },
  faqs: { label: "FAQs", icon: HelpCircle, description: "Perguntas frequentes" },
  pricing: { label: "Pricing", icon: CreditCard, description: "Seção de planos com título e CTA" },
  cta_final: { label: "CTA Final", icon: ArrowDown, description: "Call-to-action final antes do footer" },
  footer: { label: "Footer", icon: Type, description: "Rodapé com links, contato e copyright" },
  login_page: { label: "Login", icon: LogIn, description: "Textos e imagem da página de login" },
  register_page: { label: "Cadastro", icon: UserPlus, description: "Textos e imagem da página de cadastro" },
  seo: { label: "SEO", icon: Search, description: "Meta tags, OG tags e keywords para buscadores e WhatsApp" },
  brand: { label: "Marca", icon: Palette, description: "Nome da marca, label e contato de suporte" },
  images: { label: "Imagens", icon: Upload, description: "Upload de imagens da Home Page" },
};

const IMAGE_SLOTS = [
  { key: "hero_image", label: "Screenshot Principal (Hero)", desc: "Imagem do painel na seção principal. 1200×700px", sectionKey: "hero", field: "screenshot_url" },
  { key: "feature_1_image", label: "Feature 1", desc: "Screenshot da feature 1. 800×600px", sectionKey: "features", featureIndex: 0 },
  { key: "feature_2_image", label: "Feature 2", desc: "Screenshot da feature 2. 800×600px", sectionKey: "features", featureIndex: 1 },
  { key: "feature_3_image", label: "Feature 3", desc: "Screenshot da feature 3. 800×600px", sectionKey: "features", featureIndex: 2 },
  { key: "login_image", label: "Imagem Login", desc: "Imagem lateral da tela de login. 1200×900px", sectionKey: "login_page", field: "image_url" },
  { key: "register_image", label: "Imagem Cadastro", desc: "Imagem lateral da tela de cadastro. 1200×900px", sectionKey: "register_page", field: "image_url" },
  { key: "og_image", label: "OG Image (WhatsApp/Social)", desc: "Preview ao compartilhar link. 1200×630px", sectionKey: "seo", field: "og_image_url" },
];

export default function AdminHome() {
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("navbar");
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("home_settings").select("section_key, content");
    const map: Record<string, SectionData> = {};
    for (const row of data || []) map[row.section_key] = row.content as SectionData;
    setSections(map);

    const urls: Record<string, string> = {};
    if (map.hero?.screenshot_url) urls.hero_image = map.hero.screenshot_url;
    const features = map.features?.items || [];
    features.forEach((f: any, i: number) => { if (f.image_url) urls[`feature_${i + 1}_image`] = f.image_url; });
    if (map.login_page?.image_url) urls.login_image = map.login_page.image_url;
    if (map.register_page?.image_url) urls.register_image = map.register_page.image_url;
    if (map.seo?.og_image_url) urls.og_image = map.seo.og_image_url;
    setImageUrls(urls);
    setLoading(false);
  };

  const saveSection = async (key: string) => {
    setSaving(true);
    const content = sections[key];
    const { error } = await supabase
      .from("home_settings")
      .upsert({ section_key: key, content, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
    if (error) toast.error("Erro ao salvar: " + error.message);
    else {
      toast.success(`Seção "${sectionMeta[key]?.label}" salva!`);
      queryClient.invalidateQueries({ queryKey: ["home-settings"] });
    }
    setSaving(false);
  };

  const updateField = (sectionKey: string, field: string, value: any) => {
    setSections((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [field]: value } }));
  };

  const uploadImage = async (slotKey: string, file: File) => {
    setUploading(slotKey);
    const ext = file.name.split(".").pop();
    const path = `home/${slotKey}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("home-images").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Erro no upload: " + uploadError.message); setUploading(null); return; }

    const { data: urlData } = supabase.storage.from("home-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    const slot = IMAGE_SLOTS.find((s) => s.key === slotKey);
    if (!slot) return;

    if (slot.field) {
      const sData = { ...(sections[slot.sectionKey] || {}), [slot.field]: publicUrl };
      await supabase.from("home_settings").upsert({ section_key: slot.sectionKey, content: sData, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
      setSections((prev) => ({ ...prev, [slot.sectionKey]: sData }));
    } else if (slot.featureIndex !== undefined) {
      const items = [...(sections.features?.items || [])];
      while (items.length <= slot.featureIndex) items.push({ title: "", description: "", bullets: [], image_url: "", image_side: "left" });
      items[slot.featureIndex] = { ...items[slot.featureIndex], image_url: publicUrl };
      const featData = { ...sections.features, items };
      await supabase.from("home_settings").upsert({ section_key: "features", content: featData, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
      setSections((prev) => ({ ...prev, features: featData }));
    }

    setImageUrls((prev) => ({ ...prev, [slotKey]: publicUrl }));
    queryClient.invalidateQueries({ queryKey: ["home-settings"] });
    toast.success("Imagem atualizada!");
    setUploading(null);
  };

  const renderTextField = (sectionKey: string, field: string, label: string, desc: string, multiline = false) => {
    const val = sections[sectionKey]?.[field] || "";
    return (
      <div key={field}>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mb-1.5">{desc}</p>
        {multiline ? (
          <Textarea value={val} onChange={(e) => updateField(sectionKey, field, e.target.value)} rows={3} />
        ) : (
          <Input value={val} onChange={(e) => updateField(sectionKey, field, e.target.value)} />
        )}
      </div>
    );
  };

  const renderArrayField = (sectionKey: string, field: string, label: string, desc: string) => {
    const val = sections[sectionKey]?.[field] || [];
    const asString = Array.isArray(val) ? val.join(", ") : val;
    return (
      <div key={field}>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mb-1.5">{desc}</p>
        <Input value={asString} onChange={(e) => updateField(sectionKey, field, e.target.value.split(",").map((s) => s.trim()))} />
      </div>
    );
  };

  const renderSimpleSection = (sectionKey: string) => {
    const data = sections[sectionKey] || {};
    const arrayFields = ["links", "items", "col1_links", "col2_links", "bullets", "phrases", "keywords"];
    const multilineFields = ["subtitle", "description", "quote", "meta_description", "og_description"];
    const skipFields = ["items", "steps", "benefits"];

    return (
      <div className="space-y-4">
        {Object.keys(data).map((field) => {
          if (skipFields.includes(field) && (sectionKey === "features" || sectionKey === "testimonials" || sectionKey === "pain_points" || sectionKey === "tools" || sectionKey === "faqs" || sectionKey === "checkout_section" || sectionKey === "register_page")) return null;
          const label = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const desc = `Edite o campo "${field}"`;
          if (arrayFields.includes(field)) return renderArrayField(sectionKey, field, label, desc);
          return renderTextField(sectionKey, field, label, desc, multilineFields.includes(field));
        })}
      </div>
    );
  };

  // --- PAIN POINTS EDITOR ---
  const renderPainPointsEditor = () => {
    const data = sections.pain_points || {};
    const items = data.items || [];
    return (
      <div className="space-y-6">
        {renderTextField("pain_points", "section_tag", "Tag da seção", "Ex: A DOR REAL DO COD")}
        {renderTextField("pain_points", "section_title", "Título", "Primeira linha do título")}
        {renderTextField("pain_points", "section_subtitle", "Subtítulo", "Segunda linha (cinza)")}
        <Separator />
        {items.map((item: any, i: number) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="pb-3"><CardTitle className="text-base">Card {i + 1}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["emoji", "problem", "pain", "solution"].map((f) => (
                <div key={f}>
                  <Label>{f.charAt(0).toUpperCase() + f.slice(1)}</Label>
                  <Input value={item[f] || ""} onChange={(e) => {
                    const copy = [...items]; copy[i] = { ...copy[i], [f]: e.target.value };
                    updateField("pain_points", "items", copy);
                  }} />
                </div>
              ))}
              <Button variant="destructive" size="sm" onClick={() => updateField("pain_points", "items", items.filter((_: any, j: number) => j !== i))}>Remover</Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => updateField("pain_points", "items", [...items, { emoji: "❓", problem: "", pain: "", solution: "" }])}>+ Adicionar Card</Button>
      </div>
    );
  };

  // --- CHECKOUT SECTION EDITOR ---
  const renderCheckoutEditor = () => {
    const data = sections.checkout_section || {};
    const steps = data.steps || [];
    return (
      <div className="space-y-6">
        {renderTextField("checkout_section", "badge", "Badge", "Ex: 🇧🇷 EXCLUSIVO NO BRASIL")}
        {renderTextField("checkout_section", "title", "Título", "Primeira linha")}
        {renderTextField("checkout_section", "subtitle", "Subtítulo", "Texto destacado em verde")}
        {renderTextField("checkout_section", "highlight", "Highlight", "Texto bold emerald")}
        {renderTextField("checkout_section", "result_number", "Número resultado", "Ex: 0%")}
        {renderTextField("checkout_section", "result_title", "Título resultado", "Linha bold")}
        {renderTextField("checkout_section", "result_subtitle", "Subtítulo resultado", "Linha cinza")}
        <Separator />
        <Label className="font-semibold">Steps do fluxo</Label>
        {steps.map((step: any, i: number) => (
          <Card key={i} className="border-dashed">
            <CardContent className="pt-4 space-y-3">
              {["icon", "step", "title", "sub"].map((f) => (
                <div key={f}>
                  <Label>{f.charAt(0).toUpperCase() + f.slice(1)}</Label>
                  <Input value={step[f] || ""} onChange={(e) => {
                    const copy = [...steps]; copy[i] = { ...copy[i], [f]: e.target.value };
                    updateField("checkout_section", "steps", copy);
                  }} />
                </div>
              ))}
              <Button variant="destructive" size="sm" onClick={() => updateField("checkout_section", "steps", steps.filter((_: any, j: number) => j !== i))}>Remover</Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => updateField("checkout_section", "steps", [...steps, { icon: "📍", step: String(steps.length + 1), title: "", sub: "" }])}>+ Adicionar Step</Button>
      </div>
    );
  };

  // --- TOOLS EDITOR ---
  const renderToolsEditor = () => {
    const data = sections.tools || {};
    const items = data.items || [];
    return (
      <div className="space-y-6">
        {renderTextField("tools", "section_tag", "Tag", "Ex: ECOSSISTEMA COMPLETO")}
        {renderTextField("tools", "section_title", "Título", "Primeira linha")}
        {renderTextField("tools", "section_subtitle", "Subtítulo", "Segunda linha (cinza)")}
        <Separator />
        {items.map((item: any, i: number) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="pb-3"><CardTitle className="text-base">Tool {i + 1}: {item.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["icon", "name", "description", "badge"].map((f) => (
                <div key={f}>
                  <Label>{f.charAt(0).toUpperCase() + f.slice(1)}</Label>
                  <Input value={item[f] || ""} onChange={(e) => {
                    const copy = [...items]; copy[i] = { ...copy[i], [f]: e.target.value };
                    updateField("tools", "items", copy);
                  }} />
                </div>
              ))}
              <Button variant="destructive" size="sm" onClick={() => updateField("tools", "items", items.filter((_: any, j: number) => j !== i))}>Remover</Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => updateField("tools", "items", [...items, { icon: "🔧", name: "", description: "", badge: "" }])}>+ Adicionar Tool</Button>
      </div>
    );
  };

  // --- FAQS EDITOR ---
  const renderFaqsEditor = () => {
    const data = sections.faqs || {};
    const items = data.items || [];
    return (
      <div className="space-y-6">
        {renderTextField("faqs", "title", "Título da seção", "Ex: Perguntas sobre o ScalaCOD")}
        <Separator />
        {items.map((item: any, i: number) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="pb-3"><CardTitle className="text-base">FAQ {i + 1}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Pergunta</Label><Input value={item.q || ""} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], q: e.target.value }; updateField("faqs", "items", copy); }} /></div>
              <div><Label>Resposta</Label><Textarea value={item.a || ""} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], a: e.target.value }; updateField("faqs", "items", copy); }} rows={3} /></div>
              <Button variant="destructive" size="sm" onClick={() => updateField("faqs", "items", items.filter((_: any, j: number) => j !== i))}>Remover</Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => updateField("faqs", "items", [...items, { q: "", a: "" }])}>+ Adicionar FAQ</Button>
      </div>
    );
  };

  // --- FEATURES EDITOR ---
  const renderFeaturesEditor = () => {
    const items = sections.features?.items || [];
    return (
      <div className="space-y-6">
        {items.map((feat: any, i: number) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="pb-3"><CardTitle className="text-base">Feature {i + 1}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Tag</Label><Input value={feat.tag || ""} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], tag: e.target.value }; updateField("features", "items", copy); }} /></div>
              <div><Label>Título</Label><Input value={feat.title} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], title: e.target.value }; updateField("features", "items", copy); }} /></div>
              <div><Label>Descrição</Label><Textarea value={feat.description} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], description: e.target.value }; updateField("features", "items", copy); }} rows={3} /></div>
              <div><Label>Bullets (vírgula)</Label><Input value={feat.bullets?.join(", ")} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], bullets: e.target.value.split(",").map((s: string) => s.trim()) }; updateField("features", "items", copy); }} /></div>
              <div><Label>Highlight</Label><Input value={feat.highlight || ""} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], highlight: e.target.value }; updateField("features", "items", copy); }} /></div>
              <div><Label>URL da Imagem</Label><Input value={feat.image_url} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], image_url: e.target.value }; updateField("features", "items", copy); }} /></div>
              <div>
                <Label>Lado da Imagem</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={feat.image_side} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], image_side: e.target.value }; updateField("features", "items", copy); }}>
                  <option value="left">Esquerda</option><option value="right">Direita</option>
                </select>
              </div>
              <Button variant="destructive" size="sm" onClick={() => updateField("features", "items", items.filter((_: any, j: number) => j !== i))}>Remover</Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => updateField("features", "items", [...items, { tag: "", title: "Nova Feature", description: "", bullets: [], image_url: "", image_side: "left", highlight: "" }])}>+ Adicionar Feature</Button>
      </div>
    );
  };

  // --- TESTIMONIALS EDITOR ---
  const renderTestimonialsEditor = () => {
    const items = sections.testimonials?.items || [];
    return (
      <div className="space-y-6">
        {items.map((t: any, i: number) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="pb-3"><CardTitle className="text-base">Depoimento {i + 1}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Citação</Label><Textarea value={t.quote} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], quote: e.target.value }; updateField("testimonials", "items", copy); }} rows={2} /></div>
              <div><Label>Autor</Label><Input value={t.author} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], author: e.target.value }; updateField("testimonials", "items", copy); }} /></div>
              <div><Label>Detalhe</Label><Input value={t.detail} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], detail: e.target.value }; updateField("testimonials", "items", copy); }} /></div>
              <div><Label>Highlight (resultado)</Label><Input value={t.highlight || ""} onChange={(e) => { const copy = [...items]; copy[i] = { ...copy[i], highlight: e.target.value }; updateField("testimonials", "items", copy); }} /></div>
              <Button variant="destructive" size="sm" onClick={() => updateField("testimonials", "items", items.filter((_: any, j: number) => j !== i))}>Remover</Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => updateField("testimonials", "items", [...items, { quote: "", author: "", detail: "", highlight: "" }])}>+ Adicionar Depoimento</Button>
      </div>
    );
  };

  // --- LOGIN PAGE EDITOR ---
  const renderLoginEditor = () => {
    const data = sections.login_page || {};
    return (
      <div className="space-y-4">
        {renderTextField("login_page", "title", "Título", "Ex: Bem-vindo de volta 🥷")}
        {renderTextField("login_page", "subtitle", "Subtítulo", "Ex: Entre para acessar seu painel COD")}
        {renderArrayField("login_page", "phrases", "Frases rotativas", "Separadas por vírgula")}
        {renderTextField("login_page", "image_url", "URL da imagem lateral", "URL ou use a aba Imagens para upload")}
        {renderTextField("login_page", "image_alt", "Alt da imagem", "Texto alternativo para acessibilidade")}
        {renderTextField("login_page", "bottom_text", "Texto inferior", "Ex: ScalaCOD — Automação COD")}
      </div>
    );
  };

  // --- REGISTER PAGE EDITOR ---
  const renderRegisterEditor = () => {
    const data = sections.register_page || {};
    const benefits = data.benefits || [];
    return (
      <div className="space-y-4">
        {renderTextField("register_page", "title", "Título", "Ex: Crie sua conta ninja. 🥷")}
        {renderTextField("register_page", "subtitle", "Subtítulo", "Ex: 7 dias grátis. Sem cartão.")}
        {renderArrayField("register_page", "phrases", "Frases rotativas", "Separadas por vírgula")}
        {renderTextField("register_page", "image_url", "URL da imagem lateral", "URL ou use a aba Imagens")}
        {renderTextField("register_page", "image_alt", "Alt da imagem", "Texto alternativo")}
        <Separator />
        <Label className="font-semibold">Benefits (ícones abaixo do form)</Label>
        {benefits.map((b: any, i: number) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="w-20"><Label>Ícone</Label><Input value={b.icon} onChange={(e) => { const copy = [...benefits]; copy[i] = { ...copy[i], icon: e.target.value }; updateField("register_page", "benefits", copy); }} /></div>
            <div className="flex-1"><Label>Texto</Label><Input value={b.text} onChange={(e) => { const copy = [...benefits]; copy[i] = { ...copy[i], text: e.target.value }; updateField("register_page", "benefits", copy); }} /></div>
            <Button variant="destructive" size="sm" onClick={() => updateField("register_page", "benefits", benefits.filter((_: any, j: number) => j !== i))}>✕</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => updateField("register_page", "benefits", [...benefits, { icon: "✓", text: "" }])}>+ Benefit</Button>
      </div>
    );
  };

  // --- SEO EDITOR ---
  const renderSeoEditor = () => {
    return (
      <div className="space-y-4">
        {renderTextField("seo", "meta_title", "Meta Title", "Título que aparece no Google (máx 60 chars)")}
        {renderTextField("seo", "meta_description", "Meta Description", "Descrição no Google (máx 160 chars)", true)}
        {renderTextField("seo", "keywords", "Keywords", "Palavras-chave separadas por vírgula")}
        <Separator />
        <Label className="font-semibold">Open Graph (WhatsApp / Facebook)</Label>
        {renderTextField("seo", "og_title", "OG Title", "Título ao compartilhar link")}
        {renderTextField("seo", "og_description", "OG Description", "Descrição ao compartilhar link", true)}
        {renderTextField("seo", "og_image_url", "OG Image URL", "URL da imagem preview (ou use aba Imagens)")}
      </div>
    );
  };

  // --- BRAND EDITOR ---
  const renderBrandEditor = () => {
    return (
      <div className="space-y-4">
        {renderTextField("brand", "name", "Nome da marca", "Ex: ScalaCOD")}
        {renderTextField("brand", "edition_label", "Label da edição", "Ex: Obsidian Edition")}
        {renderTextField("brand", "support_email", "Email de suporte", "Ex: suporte@scalacod.com.br")}
        {renderTextField("brand", "support_whatsapp", "WhatsApp suporte", "Número com DDD")}
      </div>
    );
  };

  // --- IMAGES TAB ---
  const renderImagesTab = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {IMAGE_SLOTS.map((slot) => (
          <Card key={slot.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{slot.label}</CardTitle>
              <CardDescription className="text-xs">{slot.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              {imageUrls[slot.key] ? (
                <div className="relative rounded-lg overflow-hidden mb-3 border">
                  <img src={imageUrls[slot.key]} className="w-full h-40 object-cover" alt={slot.label} />
                  <button onClick={() => setImageUrls((prev) => { const copy = { ...prev }; delete copy[slot.key]; return copy; })}
                    className="absolute top-2 right-2 w-7 h-7 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-40 rounded-lg border-2 border-dashed border-muted flex items-center justify-center mb-3">
                  <div className="text-center text-muted-foreground"><Image className="h-6 w-6 mx-auto mb-1" /><p className="text-xs">Sem imagem</p></div>
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/jpg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(slot.key, file); }} />
                <span className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg transition-colors cursor-pointer hover:bg-primary/90">
                  {uploading === slot.key ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {imageUrls[slot.key] ? "Trocar imagem" : "Fazer upload"}
                </span>
              </label>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const getRenderer = (key: string) => {
    switch (key) {
      case "pain_points": return renderPainPointsEditor();
      case "checkout_section": return renderCheckoutEditor();
      case "tools": return renderToolsEditor();
      case "faqs": return renderFaqsEditor();
      case "features": return renderFeaturesEditor();
      case "testimonials": return renderTestimonialsEditor();
      case "login_page": return renderLoginEditor();
      case "register_page": return renderRegisterEditor();
      case "seo": return renderSeoEditor();
      case "brand": return renderBrandEditor();
      default: return renderSimpleSection(key);
    }
  };

  const sectionKeys = Object.keys(sectionMeta);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Home Page</h1>
        <p className="text-sm text-muted-foreground">Edite todos os textos, imagens e seções do ScalaCOD — Home, Login, Cadastro, SEO e Marca.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex flex-wrap gap-1 h-auto">
          {sectionKeys.map((key) => {
            const meta = sectionMeta[key];
            const Icon = meta.icon;
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sectionKeys.map((key) => {
          const meta = sectionMeta[key];
          if (key === "images") {
            return (
              <TabsContent key={key} value={key}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />Gerenciar Imagens</CardTitle>
                    <CardDescription>Upload de imagens para Home, Login, Cadastro e OG (WhatsApp).</CardDescription>
                  </CardHeader>
                  <CardContent>{renderImagesTab()}</CardContent>
                </Card>
              </TabsContent>
            );
          }
          return (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><meta.icon className="h-5 w-5 text-primary" />{meta.label}</CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {getRenderer(key)}
                  <Separator className="my-6" />
                  <Button onClick={() => saveSection(key)} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Salvando..." : `Salvar ${meta.label}`}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
