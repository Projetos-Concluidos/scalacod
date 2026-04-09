import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, BookOpen, FileText, Wrench, Upload, X, ImageIcon, Check } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const productTypes = [
  { value: "pedidos_manuais", label: "Pedidos Manuais", icon: ShoppingCart, desc: "Produto físico com envio e frete", color: "text-primary" },
  { value: "curso", label: "Curso", icon: BookOpen, desc: "Curso online com link de acesso", color: "text-emerald-500" },
  { value: "info_produto", label: "Info Produto", icon: FileText, desc: "E-book, template, planilha", color: "text-orange-500" },
  { value: "servico", label: "Serviço", icon: Wrench, desc: "Consultoria, mentoria, freelance", color: "text-violet-500" },
];

interface BumpItem {
  id?: string;
  name: string;
  price: number;
  label_bump: string;
  description: string;
  image_url: string;
}

interface Props {
  productType: string;
  setProductType: (v: string) => void;
  formName: string;
  setFormName: (v: string) => void;
  productCoverUrl: string;
  setProductCoverUrl: (v: string) => void;
  productPrice: number;
  setProductPrice: (v: number) => void;
  productOfferPrice: number;
  setProductOfferPrice: (v: number) => void;
  productDescription: string;
  setProductDescription: (v: string) => void;
  selectedBumpIds: string[];
  setSelectedBumpIds: (v: string[]) => void;
  availableBumps: BumpItem[];
}

export default function StepProductType({
  productType, setProductType, formName, setFormName,
  productCoverUrl, setProductCoverUrl,
  productPrice, setProductPrice,
  productOfferPrice, setProductOfferPrice,
  productDescription, setProductDescription,
  selectedBumpIds, setSelectedBumpIds,
  availableBumps,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Arquivo deve ter no máximo 5MB"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { toast.error("Formato não suportado"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("checkout-assets").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("checkout-assets").getPublicUrl(path);
      setProductCoverUrl(urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleBump(id: string) {
    if (selectedBumpIds.includes(id)) {
      setSelectedBumpIds(selectedBumpIds.filter((b) => b !== id));
    } else {
      setSelectedBumpIds([...selectedBumpIds, id]);
    }
  }

  return (
    <div className="space-y-5">
      {/* Product Type Selection */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Tipo do Produto</Label>
        <div className="grid grid-cols-2 gap-3">
          {productTypes.map((t) => {
            const Icon = t.icon;
            const selected = productType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setProductType(t.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-secondary/30 hover:border-primary/30 hover:bg-secondary/60"
                }`}
              >
                <Icon className={`h-6 w-6 ${selected ? t.color : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{t.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Name */}
      <div>
        <Label>Nome do Produto *</Label>
        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Curso de Marketing Digital" className="bg-input border-border mt-1" />
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Preço (R$) *</Label>
          <Input type="number" step="0.01" min="0" value={productPrice || ""} onChange={(e) => setProductPrice(Number(e.target.value))} placeholder="99.90" className="bg-input border-border mt-1" />
        </div>
        <div>
          <Label>Preço Oferta (R$)</Label>
          <Input type="number" step="0.01" min="0" value={productOfferPrice || ""} onChange={(e) => setProductOfferPrice(Number(e.target.value))} placeholder="49.90" className="bg-input border-border mt-1" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Preço promocional exibido no checkout</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label>Breve Descrição</Label>
        <Textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Descreva brevemente o produto..." className="bg-input border-border mt-1 min-h-[80px]" />
      </div>

      {/* Image Upload */}
      <div>
        <Label>Imagem do Produto</Label>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileUpload} className="hidden" />
        {productCoverUrl ? (
          <div className="mt-2 relative">
            <div className="rounded-xl overflow-hidden border border-border">
              <img src={productCoverUrl} alt="Preview" className="w-full h-40 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            </div>
            <button onClick={() => setProductCoverUrl("")} className="absolute top-2 right-2 p-1 bg-destructive/90 text-destructive-foreground rounded-full hover:bg-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-2 w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50 transition-all"
          >
            {uploading ? (
              <span className="text-sm text-muted-foreground animate-pulse">Enviando...</span>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-sm text-primary font-medium">Clique ou arraste para enviar</span>
                <span className="text-[11px] text-muted-foreground">JPG, PNG, WebP ou GIF — Máx 5MB</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Order Bumps Selection */}
      {availableBumps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Check className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Order Bumps</Label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Selecione as ofertas que aparecerão no checkout deste produto</p>
          <div className="space-y-2">
            {availableBumps.map((bump) => {
              const isSelected = selectedBumpIds.includes(bump.id || bump.name);
              return (
                <button
                  key={bump.id || bump.name}
                  onClick={() => toggleBump(bump.id || bump.name)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isSelected ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30 hover:bg-secondary/50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{bump.name}</span>
                  </div>
                  <span className="text-sm text-primary font-semibold whitespace-nowrap">R$ {bump.price.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
