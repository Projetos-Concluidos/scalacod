import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Wifi, WifiOff, Loader2, Zap, Circle, PauseCircle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import InfoTooltip from "@/components/InfoTooltip";
import NinjaBadge from "@/components/NinjaBadge";
import { supabase } from "@/integrations/supabase/client";

interface IntegrationField {
  label: string;
  key: string;
  placeholder: string;
  description: string;
}

interface IntegrationSection {
  title: string;
  description: string;
  provider: string;
  fields: IntegrationField[];
  tutorial?: {
    title: string;
    steps: string[];
    warning?: string;
  };
}

const sections: IntegrationSection[] = [
  {
    title: "Evolution API",
    description: "Servidor principal da Evolution API para WhatsApp",
    provider: "evolution",
    fields: [
      { label: "URL do Servidor", key: "evolution_url", placeholder: "https://evolution.seudominio.com", description: "Endereço completo do seu servidor Evolution API (sem barra no final)" },
      { label: "API Key Global", key: "evolution_api_key", placeholder: "Sua API Key", description: "Chave de acesso global gerada no painel da Evolution API" },
    ],
    tutorial: {
      title: "Como configurar a Evolution API:",
      steps: ["Acesse o painel do seu servidor Evolution API", "Copie a URL base e a API Key Global", "Cole nos campos abaixo e salve"],
    },
  },
  {
    title: "MercadoPago (Plataforma)",
    description: "Credenciais para cobrar as assinaturas do ScalaNinja",
    provider: "mercadopago",
    fields: [
      { label: "Access Token Produção", key: "mp_access_token", placeholder: "APP_USR-...", description: "Token de produção do MercadoPago para processar pagamentos reais de assinaturas" },
    ],
    tutorial: {
      title: "Como configurar o MercadoPago:",
      steps: ["Acesse mercadopago.com.br/developers", "Crie uma aplicação e vá em Credenciais de Produção", "Copie o Access Token e cole abaixo"],
      warning: "⚠️ Use credenciais de produção (APP_USR-...)",
    },
  },
  {
    title: "ElevenLabs",
    description: "Geração de voz via ElevenLabs",
    provider: "elevenlabs",
    fields: [
      { label: "API Key", key: "elevenlabs_api_key", placeholder: "Sua API Key", description: "Chave da API ElevenLabs para clonagem e geração de áudio" },
    ],
    tutorial: {
      title: "Como configurar a ElevenLabs:",
      steps: ["Acesse elevenlabs.io e faça login", "Vá em Profile → API Keys", "Gere uma nova chave e cole abaixo"],
    },
  },
  {
    title: "OpenAI",
    description: "IA para fluxos e TTS",
    provider: "openai",
    fields: [
      { label: "API Key", key: "openai_api_key", placeholder: "sk-...", description: "Chave da API OpenAI usada nos fluxos de IA e geração de texto" },
    ],
    tutorial: {
      title: "Como configurar a OpenAI:",
      steps: ["Acesse platform.openai.com/api-keys", "Crie uma nova API Key", "Cole no campo abaixo e salve"],
      warning: "⚠️ A chave começa com sk-...",
    },
  },
];

const AdminIntegracoes = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  // Load persisted values from system_config
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .like("key", "integration_%");

      if (data) {
        const loaded: Record<string, string> = {};
        data.forEach((row) => {
          const shortKey = row.key.replace("integration_", "");
          const val = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
          // Remove surrounding quotes from JSONB strings
          loaded[shortKey] = val.replace(/^"|"$/g, "");
        });
        setValues(loaded);
        setSavedValues(loaded);
      }
      setLoading(false);
    };
    loadConfig();
  }, []);

  const isSectionActive = (section: IntegrationSection) => {
    return section.fields.every((f) => !!savedValues[f.key]?.trim());
  };

  const renderSectionStatus = (section: IntegrationSection) => {
    const configured = isSectionActive(section);
    if (!configured) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className="h-2 w-2" /> Não configurado
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle className="h-3 w-3" /> Configurado
      </span>
    );
  };

  const handleSave = async (section: IntegrationSection) => {
    setSaving((s) => ({ ...s, [section.provider]: true }));
    try {
      const upserts = section.fields.map((field) => ({
        key: `integration_${field.key}`,
        value: JSON.stringify(values[field.key] || ""),
        description: `${section.title} — ${field.label}`,
        updated_at: new Date().toISOString(),
      }));

      for (const row of upserts) {
        const { error } = await supabase
          .from("system_config")
          .upsert(row, { onConflict: "key" });
        if (error) throw error;
      }

      // Update savedValues to reflect persisted state
      const newSaved = { ...savedValues };
      section.fields.forEach((f) => {
        newSaved[f.key] = values[f.key] || "";
      });
      setSavedValues(newSaved);
      setTestResults((r) => ({ ...r, [section.provider]: null }));
      toast.success(`Configurações de ${section.title} salvas com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving((s) => ({ ...s, [section.provider]: false }));
    }
  };

  const handleTest = async (section: IntegrationSection) => {
    setTesting((t) => ({ ...t, [section.provider]: true }));
    setTestResults((r) => ({ ...r, [section.provider]: null }));
    try {
      const credentials: Record<string, string> = {};
      section.fields.forEach((f) => {
        credentials[f.key] = values[f.key] || "";
      });

      const { data, error } = await supabase.functions.invoke("test-integration", {
        body: { provider: section.provider, credentials },
      });

      if (error) throw error;
      setTestResults((r) => ({ ...r, [section.provider]: data }));
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      const result = { success: false, message: err.message };
      setTestResults((r) => ({ ...r, [section.provider]: result }));
      toast.error(err.message);
    } finally {
      setTesting((t) => ({ ...t, [section.provider]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Integrações Globais" subtitle="API Keys e configurações globais da plataforma" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações Globais" subtitle="API Keys e configurações globais da plataforma" />

      <div className="grid gap-6">
        {sections.map((section) => {
          const active = isSectionActive(section);
          const testResult = testResults[section.provider];

          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    {section.tutorial && (
                      <InfoTooltip
                        title={section.tutorial.title}
                        steps={section.tutorial.steps}
                        warning={section.tutorial.warning}
                      />
                    )}
                  </div>
                  <NinjaBadge variant={active ? "success" : "danger"}>
                    {active ? (
                      <><Wifi className="h-3 w-3" /> Ativa</>
                    ) : (
                      <><WifiOff className="h-3 w-3" /> Inativa</>
                    )}
                  </NinjaBadge>
                </div>
                <p className="text-sm text-muted-foreground">{section.description}</p>
                {renderSectionStatus(section)}
              <CardContent className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label>{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                    <div className="flex gap-2">
                      <Input
                        type={visible[field.key] ? "text" : "password"}
                        value={values[field.key] || ""}
                        onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setVisible((v) => ({ ...v, [field.key]: !v[field.key] }))}
                      >
                        {visible[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}

                {testResult && (
                  <div className={`rounded-lg border p-3 text-sm ${testResult.success ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                    {testResult.message}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleSave(section)}
                    disabled={saving[section.provider]}
                  >
                    {saving[section.provider] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleTest(section)}
                    disabled={testing[section.provider] || !section.fields.every((f) => !!values[f.key]?.trim())}
                  >
                    {testing[section.provider] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Testar Conexão
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminIntegracoes;
