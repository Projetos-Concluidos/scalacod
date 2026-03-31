import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Save } from "lucide-react";
import { useState } from "react";
import InfoTooltip from "@/components/InfoTooltip";

interface IntegrationField {
  label: string;
  key: string;
  placeholder: string;
}

interface IntegrationSection {
  title: string;
  description: string;
  fields: IntegrationField[];
}

const sections: IntegrationSection[] = [
  {
    title: "Evolution API",
    description: "Servidor principal da Evolution API para WhatsApp",
    fields: [
      { label: "URL do Servidor", key: "evolution_url", placeholder: "https://evolution.seudominio.com" },
      { label: "API Key Global", key: "evolution_api_key", placeholder: "Sua API Key" },
    ],
  },
  {
    title: "MercadoPago (Plataforma)",
    description: "Credenciais para cobrar as assinaturas do ScalaNinja",
    fields: [
      { label: "Access Token Produção", key: "mp_access_token", placeholder: "APP_USR-..." },
    ],
  },
  {
    title: "ElevenLabs",
    description: "Geração de voz via ElevenLabs",
    fields: [
      { label: "API Key", key: "elevenlabs_api_key", placeholder: "Sua API Key" },
    ],
  },
  {
    title: "OpenAI",
    description: "IA para fluxos e TTS",
    fields: [
      { label: "API Key", key: "openai_api_key", placeholder: "sk-..." },
    ],
  },
];

const AdminIntegracoes = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const handleSave = (sectionTitle: string) => {
    // In production, save to secrets/env
    toast.success(`Configurações de ${sectionTitle} salvas`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações Globais" subtitle="API Keys e configurações globais da plataforma" />

      <div className="grid gap-6">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
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
              <Button onClick={() => handleSave(section.title)} className="mt-2">
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminIntegracoes;
