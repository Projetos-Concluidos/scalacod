import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Timer, Palette, Type, MousePointer } from "lucide-react";
import { useState } from "react";

interface CtaConfig {
  title: string;
  icon: string;
  bg_color: string;
  text_color: string;
  font_size: string;
  border_radius: string;
}

interface ScarcityTimerConfig {
  enabled: boolean;
  duration_minutes: number;
  bg_color: string;
  text_color: string;
  text: string;
}

interface Props {
  primaryColor: string;
  setPrimaryColor: (v: string) => void;
  fontFamily: string;
  setFontFamily: (v: string) => void;
  ctaConfig: CtaConfig;
  setCtaConfig: (v: CtaConfig) => void;
  scarcityConfig: ScarcityTimerConfig;
  setScarcityConfig: (v: ScarcityTimerConfig) => void;
  bannerImages: string[];
  setBannerImages: (v: string[]) => void;
}

const fontOptions = [
  { value: "Inter", label: "Inter (Padrão)" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Nunito", label: "Nunito" },
];

const iconOptions = [
  { value: "🛒", label: "🛒 Carrinho" },
  { value: "💳", label: "💳 Cartão" },
  { value: "🔥", label: "🔥 Fogo" },
  { value: "⚡", label: "⚡ Raio" },
  { value: "✅", label: "✅ Check" },
  { value: "🚀", label: "🚀 Foguete" },
  { value: "🎯", label: "🎯 Alvo" },
  { value: "none", label: "Sem ícone" },
];

export default function StepVisualCustomization({
  primaryColor, setPrimaryColor, fontFamily, setFontFamily,
  ctaConfig, setCtaConfig, scarcityConfig, setScarcityConfig,
  bannerImages, setBannerImages,
}: Props) {
  const [newBannerUrl, setNewBannerUrl] = useState("");

  return (
    <div className="space-y-5">
      {/* Colors & Fonts */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Cores & Fontes</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Cor Principal</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={primaryColor || "#6366f1"} onChange={(e) => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#6366f1" className="bg-input border-border text-xs flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Fonte</Label>
            <Select value={fontFamily || "Inter"} onValueChange={setFontFamily}>
              <SelectTrigger className="bg-input border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fontOptions.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MousePointer className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Botão CTA</span>
        </div>
        <div>
          <Label className="text-xs">Texto do botão</Label>
          <Input value={ctaConfig.title} onChange={(e) => setCtaConfig({ ...ctaConfig, title: e.target.value })} placeholder="COMPRAR AGORA" className="bg-input border-border mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Ícone</Label>
            <Select value={ctaConfig.icon || "🛒"} onValueChange={(v) => setCtaConfig({ ...ctaConfig, icon: v })}>
              <SelectTrigger className="bg-input border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {iconOptions.map((i) => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tamanho da fonte</Label>
            <Select value={ctaConfig.font_size || "lg"} onValueChange={(v) => setCtaConfig({ ...ctaConfig, font_size: v })}>
              <SelectTrigger className="bg-input border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Pequeno</SelectItem>
                <SelectItem value="md">Médio</SelectItem>
                <SelectItem value="lg">Grande</SelectItem>
                <SelectItem value="xl">Extra Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Cor do fundo</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={ctaConfig.bg_color || "#22c55e"} onChange={(e) => setCtaConfig({ ...ctaConfig, bg_color: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer" />
              <Input value={ctaConfig.bg_color} onChange={(e) => setCtaConfig({ ...ctaConfig, bg_color: e.target.value })} placeholder="#22c55e" className="bg-input border-border text-xs flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Cor do texto</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={ctaConfig.text_color || "#ffffff"} onChange={(e) => setCtaConfig({ ...ctaConfig, text_color: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer" />
              <Input value={ctaConfig.text_color} onChange={(e) => setCtaConfig({ ...ctaConfig, text_color: e.target.value })} placeholder="#ffffff" className="bg-input border-border text-xs flex-1" />
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs">Arredondamento</Label>
          <Select value={ctaConfig.border_radius || "lg"} onValueChange={(v) => setCtaConfig({ ...ctaConfig, border_radius: v })}>
            <SelectTrigger className="bg-input border-border mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem arredondamento</SelectItem>
              <SelectItem value="sm">Sutil</SelectItem>
              <SelectItem value="md">Médio</SelectItem>
              <SelectItem value="lg">Arredondado</SelectItem>
              <SelectItem value="full">Pílula</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* CTA Preview */}
        <div>
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <div className="mt-2 flex justify-center">
            <button
              className="px-6 py-3 font-bold transition-all"
              style={{
                backgroundColor: ctaConfig.bg_color || "#22c55e",
                color: ctaConfig.text_color || "#ffffff",
                fontSize: ctaConfig.font_size === "sm" ? "12px" : ctaConfig.font_size === "md" ? "14px" : ctaConfig.font_size === "xl" ? "20px" : "16px",
                borderRadius: ctaConfig.border_radius === "none" ? "0" : ctaConfig.border_radius === "sm" ? "4px" : ctaConfig.border_radius === "md" ? "8px" : ctaConfig.border_radius === "full" ? "999px" : "12px",
                fontFamily: fontFamily || "Inter",
              }}
            >
              {ctaConfig.icon && ctaConfig.icon !== "none" ? `${ctaConfig.icon} ` : ""}{ctaConfig.title || "COMPRAR AGORA"}
            </button>
          </div>
        </div>
      </div>

      {/* Scarcity Timer */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-foreground">Timer de Escassez</span>
          </div>
          <Switch checked={scarcityConfig.enabled} onCheckedChange={(v) => setScarcityConfig({ ...scarcityConfig, enabled: v })} />
        </div>
        {scarcityConfig.enabled && (
          <>
            <div>
              <Label className="text-xs">Texto do timer</Label>
              <Input value={scarcityConfig.text} onChange={(e) => setScarcityConfig({ ...scarcityConfig, text: e.target.value })} placeholder="🔥 OFERTA EXPIRA EM:" className="bg-input border-border mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Duração (min)</Label>
                <Input type="number" value={scarcityConfig.duration_minutes} onChange={(e) => setScarcityConfig({ ...scarcityConfig, duration_minutes: Number(e.target.value) })} className="bg-input border-border mt-1" />
              </div>
              <div>
                <Label className="text-xs">Cor fundo</Label>
                <div className="flex items-center gap-1 mt-1">
                  <input type="color" value={scarcityConfig.bg_color || "#ef4444"} onChange={(e) => setScarcityConfig({ ...scarcityConfig, bg_color: e.target.value })} className="w-7 h-7 rounded border border-border cursor-pointer" />
                  <Input value={scarcityConfig.bg_color} onChange={(e) => setScarcityConfig({ ...scarcityConfig, bg_color: e.target.value })} className="bg-input border-border text-xs flex-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Cor texto</Label>
                <div className="flex items-center gap-1 mt-1">
                  <input type="color" value={scarcityConfig.text_color || "#ffffff"} onChange={(e) => setScarcityConfig({ ...scarcityConfig, text_color: e.target.value })} className="w-7 h-7 rounded border border-border cursor-pointer" />
                  <Input value={scarcityConfig.text_color} onChange={(e) => setScarcityConfig({ ...scarcityConfig, text_color: e.target.value })} className="bg-input border-border text-xs flex-1" />
                </div>
              </div>
            </div>
            {/* Timer Preview */}
            <div className="rounded-lg p-2.5 text-center text-sm font-bold" style={{ backgroundColor: scarcityConfig.bg_color || "#ef4444", color: scarcityConfig.text_color || "#ffffff" }}>
              {scarcityConfig.text || "🔥 OFERTA EXPIRA EM:"} {scarcityConfig.duration_minutes || 15}:00
            </div>
          </>
        )}
      </div>

      {/* Banner Images / Tarjas */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Tarjas / Banners</span>
        </div>
        <p className="text-xs text-muted-foreground">Imagens exibidas abaixo do botão CTA no checkout</p>
        <div className="flex gap-2">
          <Input value={newBannerUrl} onChange={(e) => setNewBannerUrl(e.target.value)} placeholder="https://exemplo.com/tarja.png" className="bg-input border-border text-xs flex-1" />
          <button
            onClick={() => {
              if (newBannerUrl.trim()) {
                setBannerImages([...bannerImages, newBannerUrl.trim()]);
                setNewBannerUrl("");
              }
            }}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {bannerImages.length > 0 && (
          <div className="space-y-2">
            {bannerImages.map((url, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <img src={url} alt={`Tarja ${i + 1}`} className="h-8 w-auto max-w-[120px] object-contain rounded" onError={(e) => (e.currentTarget.style.display = "none")} />
                <span className="text-xs text-muted-foreground truncate flex-1">{url}</span>
                <button onClick={() => setBannerImages(bannerImages.filter((_, j) => j !== i))} className="p-1 text-destructive hover:text-destructive/80">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
