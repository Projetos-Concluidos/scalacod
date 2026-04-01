import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RefreshCw, Zap, Type, Image, List, MessageSquare, CreditCard, ArrowDown, LayoutGrid, Upload, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type SectionData = Record<string, any>;

const sectionMeta: Record<string, { label: string; icon: any; description: string }> = {
  navbar: { label: "Navbar", icon: LayoutGrid, description: "Logo, links de navegação e botão CTA do topo da página" },
  hero: { label: "Hero", icon: Zap, description: "Seção principal acima da dobra — título, subtítulo, CTAs e prova social" },
  logos: { label: "Logos", icon: Image, description: "Logos de parceiros/integrações exibidos como prova social" },
  features: { label: "Features", icon: List, description: "Seções de funcionalidades com título, descrição, bullets e imagem" },
  pricing: { label: "Pricing", icon: CreditCard, description: "Seção de planos com título, subtítulo e CTA" },
  testimonials: { label: "Depoimentos", icon: MessageSquare, description: "Depoimentos de clientes com citação, autor e detalhe" },
  cta_final: { label: "CTA Final", icon: ArrowDown, description: "Call-to-action final antes do footer — convida o usuário a se cadastrar" },
  footer: { label: "Footer", icon: Type, description: "Rodapé com links, contato, copyright e tagline" },
  images: { label: "Imagens", icon: Upload, description: "Upload de imagens da Home Page (Hero, Features)" },
};

const fieldDescriptions: Record<string, Record<string, string>> = {
  navbar: {
    logo_text: "Nome exibido no topo ao lado do ícone",
    links: "Links de navegação separados por vírgula (ex: Recursos, Planos, Login)",
    cta_text: "Texto do botão de ação no canto direito da navbar",
  },
  hero: {
    badge: "Texto do badge/selo acima do título principal",
    title_line1: "Primeira linha do título grande",
    title_line2: "Segunda linha do título grande",
    highlight_word: "Palavra destacada em verde no título",
    subtitle: "Texto descritivo abaixo do título",
    cta_primary: "Texto do botão principal (verde)",
    cta_secondary: "Texto do botão secundário (borda)",
    social_proof_text: "Texto de prova social (ex: Mais de 500 lojistas)",
    social_proof_rating: "Nota de avaliação (ex: 4.9/5)",
    screenshot_url: "URL da imagem/screenshot do painel (deixe vazio para placeholder)",
  },
  logos: {
    title: "Título acima dos logos",
    items: "Nomes das marcas separados por vírgula",
  },
  pricing: {
    title: "Título da seção de planos",
    subtitle: "Subtítulo abaixo do título",
    cta_text: "Texto do botão CTA",
  },
  cta_final: {
    title: "Título da seção de CTA final",
    subtitle: "Subtítulo descritivo",
    cta_text: "Texto do botão CTA",
    bullets: "Itens de checklist separados por vírgula (ex: Setup em 5 minutos, Suporte brasileiro)",
  },
  footer: {
    logo_text: "Nome da marca no footer",
    tagline: "Slogan curto abaixo do logo",
    copyright: "Texto de copyright",
    email: "Email de contato",
    col1_title: "Título da coluna 1",
    col1_links: "Links da coluna 1 separados por vírgula",
    col2_title: "Título da coluna 2",
    col2_links: "Links da coluna 2 separados por vírgula",
  },
};

const IMAGE_SLOTS = [
  { key: "hero_image", label: "Screenshot Principal (Hero)", desc: "Imagem do painel na seção principal. Recomendado: 1200×700px", sectionKey: "hero", field: "screenshot_url" },
  { key: "feature_1_image", label: "Feature 1 — Checkout Inteligente", desc: "Screenshot do checkout. Recomendado: 800×600px", sectionKey: "features", featureIndex: 0 },
  { key: "feature_2_image", label: "Feature 2 — WhatsApp Automation", desc: "Screenshot dos Fluxos. Recomendado: 800×600px", sectionKey: "features", featureIndex: 1 },
  { key: "feature_3_image", label: "Feature 3 — Analytics", desc: "Screenshot do Dashboard. Recomendado: 800×600px", sectionKey: "features", featureIndex: 2 },
];

export default function AdminHome() {
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("navbar");
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("home_settings").select("section_key, content");
    const map: Record<string, SectionData> = {};
    for (const row of data || []) {
      map[row.section_key] = row.content as SectionData;
    }
    setSections(map);

    // Load image URLs from hero.screenshot_url and features items
    const urls: Record<string, string> = {};
    if (map.hero?.screenshot_url) urls.hero_image = map.hero.screenshot_url;
    const features = map.features?.items || [];
    features.forEach((f: any, i: number) => {
      if (f.image_url) urls[`feature_${i + 1}_image`] = f.image_url;
    });
    setImageUrls(urls);

    setLoading(false);
  };

  const saveSection = async (key: string) => {
    setSaving(true);
    const content = sections[key];
    const { error } = await supabase
      .from("home_settings")
      .upsert({ section_key: key, content, updated_at: new Date().toISOString() }, { onConflict: "section_key" });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(`Seção "${sectionMeta[key]?.label}" salva com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["home-settings"] });
    }
    setSaving(false);
  };

  const updateField = (sectionKey: string, field: string, value: any) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: value },
    }));
  };

  const uploadImage = async (slotKey: string, file: File) => {
    setUploading(slotKey);
    const ext = file.name.split(".").pop();
    const path = `home/${slotKey}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("home-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro no upload: " + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("home-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Find the slot config
    const slot = IMAGE_SLOTS.find((s) => s.key === slotKey);
    if (!slot) return;

    if (slot.field) {
      // Hero screenshot
      const heroData = { ...(sections.hero || {}), screenshot_url: publicUrl };
      await supabase
        .from("home_settings")
        .upsert({ section_key: "hero", content: heroData, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
      setSections((prev) => ({ ...prev, hero: heroData }));
    } else if (slot.featureIndex !== undefined) {
      const items = [...(sections.features?.items || [])];
      while (items.length <= slot.featureIndex) {
        items.push({ title: "", description: "", bullets: [], image_url: "", image_side: slot.featureIndex % 2 === 0 ? "left" : "right" });
      }
      items[slot.featureIndex] = { ...items[slot.featureIndex], image_url: publicUrl };
      const featData = { ...sections.features, items };
      await supabase
        .from("home_settings")
        .upsert({ section_key: "features", content: featData, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
      setSections((prev) => ({ ...prev, features: featData }));
    }

    setImageUrls((prev) => ({ ...prev, [slotKey]: publicUrl }));
    queryClient.invalidateQueries({ queryKey: ["home-settings"] });
    toast.success("Imagem atualizada!");
    setUploading(null);
  };

  const renderArrayField = (sectionKey: string, field: string, label: string, desc: string) => {
    const val = sections[sectionKey]?.[field] || [];
    const asString = Array.isArray(val) ? val.join(", ") : val;
    return (
      <div key={field}>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mb-1.5">{desc}</p>
        <Input
          value={asString}
          onChange={(e) => updateField(sectionKey, field, e.target.value.split(",").map((s) => s.trim()))}
        />
      </div>
    );
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

  const renderSimpleSection = (sectionKey: string) => {
    const data = sections[sectionKey] || {};
    const descs = fieldDescriptions[sectionKey] || {};
    const arrayFields = ["links", "items", "col1_links", "col2_links", "bullets"];
    const multilineFields = ["subtitle", "description", "quote"];

    return (
      <div className="space-y-4">
        {Object.keys(data).map((field) => {
          if (field === "items" && (sectionKey === "features" || sectionKey === "testimonials")) return null;
          const label = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const desc = descs[field] || `Edite o campo "${field}"`;
          if (arrayFields.includes(field)) return renderArrayField(sectionKey, field, label, desc);
          return renderTextField(sectionKey, field, label, desc, multilineFields.includes(field));
        })}
      </div>
    );
  };

  const renderFeaturesEditor = () => {
    const items = sections.features?.items || [];
    return (
      <div className="space-y-6">
        {items.map((feat: any, i: number) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Feature {i + 1}</CardTitle>
              <CardDescription>Seção de funcionalidade com imagem, título, descrição e bullets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Título</Label>
                <p className="text-xs text-muted-foreground mb-1">Título da funcionalidade em destaque</p>
                <Input value={feat.title} onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], title: e.target.value };
                  updateField("features", "items", copy);
                }} />
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-xs text-muted-foreground mb-1">Texto descritivo da funcionalidade</p>
                <Textarea value={feat.description} onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], description: e.target.value };
                  updateField("features", "items", copy);
                }} rows={3} />
              </div>
              <div>
                <Label>Bullets (separados por vírgula)</Label>
                <p className="text-xs text-muted-foreground mb-1">Itens com ✓ listados abaixo da descrição</p>
                <Input value={feat.bullets?.join(", ")} onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], bullets: e.target.value.split(",").map((s: string) => s.trim()) };
                  updateField("features", "items", copy);
                }} />
              </div>
              <div>
                <Label>URL da Imagem</Label>
                <p className="text-xs text-muted-foreground mb-1">URL de um screenshot ou imagem ilustrativa (ou use a aba Imagens para upload)</p>
                <Input value={feat.image_url} onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], image_url: e.target.value };
                  updateField("features", "items", copy);
                }} />
              </div>
              <div>
                <Label>Lado da Imagem</Label>
                <p className="text-xs text-muted-foreground mb-1">Define se a imagem fica à esquerda ou direita do texto</p>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={feat.image_side} onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], image_side: e.target.value };
                  updateField("features", "items", copy);
                }}>
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                </select>
              </div>
              <Button variant="destructive" size="sm" onClick={() => {
                const copy = items.filter((_: any, j: number) => j !== i);
                updateField("features", "items", copy);
              }}>Remover feature</Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => {
          updateField("features", "items", [...items, { title: "Nova Feature", description: "", bullets: [], image_url: "", image_side: "left" }]);
        }}>+ Adicionar Feature</Button>
      </div>
    );
  };

  const renderTestimonialsEditor = () => {
    const items = sections.testimonials?.items || [];
    return (
      <div className="space-y-6">
        {items.map((t: any, i: number) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Depoimento {i + 1}</CardTitle>
              <CardDescription>Citação de um cliente satisfeito com nome e detalhe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Citação</Label>
                <p className="text-xs text-muted-foreground mb-1">Texto do depoimento entre aspas</p>
                <Textarea value={t.quote} onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], quote: e.target.value };
                  updateField("testimonials", "items", copy);
                }} rows={2} />
              </div>
              <div>
                <Label>Autor</Label>
                <p className="text-xs text-muted-foreground mb-1">Nome do cliente</p>
                <Input value={t.author} onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], author: e.target.value };
                  updateField("testimonials", "items", copy);
                }} />
              </div>
              <div>
                <Label>Detalhe</Label>
                <p className="text-xs text-muted-foreground mb-1">Informação adicional (ex: 500 pedidos/mês)</p>
                <Input value={t.detail} onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], detail: e.target.value };
                  updateField("testimonials", "items", copy);
                }} />
              </div>
              <Button variant="destructive" size="sm" onClick={() => {
                const copy = items.filter((_: any, j: number) => j !== i);
                updateField("testimonials", "items", copy);
              }}>Remover depoimento</Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => {
          updateField("testimonials", "items", [...items, { quote: "", author: "", detail: "" }]);
        }}>+ Adicionar Depoimento</Button>
      </div>
    );
  };

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
                  <button
                    onClick={() => setImageUrls((prev) => {
                      const copy = { ...prev };
                      delete copy[slot.key];
                      return copy;
                    })}
                    className="absolute top-2 right-2 w-7 h-7 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-40 rounded-lg border-2 border-dashed border-muted flex items-center justify-center mb-3">
                  <div className="text-center text-muted-foreground">
                    <Image className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Sem imagem</p>
                  </div>
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(slot.key, file);
                  }}
                />
                <span className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg transition-colors cursor-pointer hover:bg-primary/90">
                  {uploading === slot.key ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
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
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const sectionKeys = Object.keys(sectionMeta);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Home Page</h1>
        <p className="text-sm text-muted-foreground">Edite todos os textos, imagens e seções da página inicial do ScalaNinja.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex flex-wrap gap-1">
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
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-primary" />
                      Gerenciar Imagens
                    </CardTitle>
                    <CardDescription>Faça upload das imagens que aparecem na página inicial pública.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderImagesTab()}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          }
          return (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <meta.icon className="h-5 w-5 text-primary" />
                    {meta.label}
                  </CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {key === "features" ? renderFeaturesEditor() : key === "testimonials" ? renderTestimonialsEditor() : renderSimpleSection(key)}
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
