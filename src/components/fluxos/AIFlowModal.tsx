import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AIFlowModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (flowData: any) => void;
}

export default function AIFlowModal({ open, onClose, onGenerated }: AIFlowModalProps) {
  const [prompt, setPrompt] = useState("");
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
          body: JSON.stringify({ prompt }),
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
        is_official: false,
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Criar Fluxo com IA
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder='Ex: "Crie um fluxo de pós-venda COD que confirme o pedido, envie uma mensagem no dia da entrega e peça avaliação 2 dias depois"'
            className="min-h-[120px]"
          />
          <div className="flex flex-wrap gap-2">
            {["Pós-venda COD", "Pedido cancelado", "Confirmação de entrega"].map(s => (
              <button key={s} onClick={() => setPrompt(s)} className="text-[11px] bg-primary/10 text-primary rounded-full px-3 py-1 hover:bg-primary/20 transition-colors">
                {s}
              </button>
            ))}
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
