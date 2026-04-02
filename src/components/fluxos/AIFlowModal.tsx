import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Lightbulb, Wifi } from "lucide-react";
import { toast } from "sonner";

interface AIFlowModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (flowData: any) => void;
}

export default function AIFlowModal({ open, onClose, onGenerated }: AIFlowModalProps) {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<"evolution" | "official">("evolution");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai-flow-generator`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, provider }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro na API de IA");
      }

      const flowData = await res.json();

      onGenerated({
        name: flowData.name || "Fluxo gerado por IA",
        trigger_event: flowData.trigger_event || "pedido_criado",
        flow_type: flowData.flow_type || "cod",
        is_official: provider === "official",
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        node_count: flowData.node_count || 0,
        message_count: flowData.message_count || 0,
      });

      toast.success("Fluxo gerado com sucesso pela IA!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar fluxo");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Pós-venda COD com confirmação e remarketing",
    "Pedido cancelado com tentativa de recuperação",
    "Confirmação de entrega com avaliação",
    "Fluxo de correção de dados com reconfirmação",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Criar Fluxo com IA
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Provider selector */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Wifi className="h-3 w-3" /> Provedor WhatsApp</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="evolution">Evolution API (QR Code)</SelectItem>
                <SelectItem value="official">API Oficial (Meta)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder='Ex: "Crie um fluxo de pós-venda COD que confirme o pedido com botões, se o cliente pedir correção peça os dados novos, e adicione remarketing de 2h, 6h e 1 dia"'
            className="min-h-[120px]"
          />

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button key={s} onClick={() => setPrompt(s)} className="text-[11px] bg-primary/10 text-primary rounded-full px-3 py-1 hover:bg-primary/20 transition-colors">
                {s}
              </button>
            ))}
          </div>

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5 text-warning" /> Dicas para melhores resultados</p>
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>Descreva o objetivo principal do fluxo</li>
              <li>Mencione se precisa de botões, remarketing ou ações</li>
              <li>Você pode colar fluxos de outras plataformas (ManyChat, Botpress) para adaptar</li>
              <li>A IA suporta: trigger, mensagem, botões, ação, remarketing, delay</li>
            </ul>
          </div>

          <Button onClick={handleGenerate} disabled={!prompt.trim() || loading} className="w-full gradient-primary text-primary-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Fluxo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
