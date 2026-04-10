import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, Facebook, BarChart3, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";

interface PixelConfig {
  id?: string;
  facebook_pixel_id: string;
  google_analytics_id: string;
  google_ads_id: string;
  google_conversion_id: string;
  tiktok_pixel_id: string;
  custom_head_scripts: string;
}

const defaultConfig: PixelConfig = {
  facebook_pixel_id: "",
  google_analytics_id: "",
  google_ads_id: "",
  google_conversion_id: "",
  tiktok_pixel_id: "",
  custom_head_scripts: "",
};

const AdminPixel = () => {
  const [config, setConfig] = useState<PixelConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase
      .from("admin_pixel_config" as any)
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      setConfig(data as any);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config.id) {
        await supabase
          .from("admin_pixel_config" as any)
          .update({
            facebook_pixel_id: config.facebook_pixel_id || null,
            google_analytics_id: config.google_analytics_id || null,
            google_ads_id: config.google_ads_id || null,
            google_conversion_id: config.google_conversion_id || null,
            tiktok_pixel_id: config.tiktok_pixel_id || null,
            custom_head_scripts: config.custom_head_scripts || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", config.id);
      } else {
        const { data } = await supabase
          .from("admin_pixel_config" as any)
          .insert({
            facebook_pixel_id: config.facebook_pixel_id || null,
            google_analytics_id: config.google_analytics_id || null,
            google_ads_id: config.google_ads_id || null,
            google_conversion_id: config.google_conversion_id || null,
            tiktok_pixel_id: config.tiktok_pixel_id || null,
            custom_head_scripts: config.custom_head_scripts || null,
          } as any)
          .select()
          .single();
        if (data) setConfig(data as any);
      }
      toast.success("Pixels salvos com sucesso!");
    } catch {
      toast.error("Erro ao salvar pixels");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="py-6">
      <PageHeader
        title="Pixel & Tracking 📊"
        subtitle="Configure os pixels de rastreamento do projeto (Home e páginas públicas)"
      />

      <div className="grid gap-6 mt-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Facebook className="h-4 w-4 text-blue-500" />
              Facebook / Meta Pixel
            </CardTitle>
            <CardDescription>Rastreie eventos da Home e páginas públicas no Facebook Ads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Facebook Pixel ID</Label>
              <Input
                placeholder="Ex: 123456789012345"
                value={config.facebook_pixel_id}
                onChange={(e) => setConfig({ ...config, facebook_pixel_id: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              Google Analytics / Ads
            </CardTitle>
            <CardDescription>Rastreie tráfego e conversões com Google</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Google Analytics ID (GA4)</Label>
              <Input
                placeholder="Ex: G-XXXXXXXXXX"
                value={config.google_analytics_id}
                onChange={(e) => setConfig({ ...config, google_analytics_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Google Ads ID</Label>
              <Input
                placeholder="Ex: AW-XXXXXXXXXX"
                value={config.google_ads_id}
                onChange={(e) => setConfig({ ...config, google_ads_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Google Conversion ID</Label>
              <Input
                placeholder="Ex: AbC123xYz"
                value={config.google_conversion_id}
                onChange={(e) => setConfig({ ...config, google_conversion_id: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-purple-500" />
              TikTok Pixel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>TikTok Pixel ID</Label>
              <Input
                placeholder="Ex: XXXXXXXXXXXXXXXXX"
                value={config.tiktok_pixel_id}
                onChange={(e) => setConfig({ ...config, tiktok_pixel_id: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code className="h-4 w-4 text-muted-foreground" />
              Scripts Customizados (Head)
            </CardTitle>
            <CardDescription>Cole aqui scripts adicionais que serão injetados no &lt;head&gt; das páginas públicas</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="<script>...</script>"
              value={config.custom_head_scripts}
              onChange={(e) => setConfig({ ...config, custom_head_scripts: e.target.value })}
              rows={4}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-fit">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default AdminPixel;
