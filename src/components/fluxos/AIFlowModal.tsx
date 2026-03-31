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
      // Generate a simple flow structure based on prompt keywords
      const nodes: any[] = [
        { id: "start", position: { x: 250, y: 50 }, data: { label: "🚀 Início do Fluxo", type: "start" }, style: { background: "hsl(190 100% 50% / 0.15)", border: "1px solid hsl(190 100% 50% / 0.3)", borderRadius: 12, padding: 12, color: "hsl(190 100% 50%)", fontWeight: 600, fontSize: 13 } },
      ];
      const edges: any[] = [];
      let y = 180;
      let prevId = "start";
      const nodeStyle = { background: "hsl(240 20% 7%)", border: "1px solid hsl(190 100% 50% / 0.2)", borderRadius: 12, padding: 12, color: "hsl(240 20% 97%)", fontSize: 13, minWidth: 200 };

      const steps = [
        { label: "📩 Mensagem de confirmação", type: "message" },
        { label: "⏳ Aguardar 1 hora", type: "delay" },
        { label: "📦 Atualização de status", type: "message" },
        { label: "⏳ Aguardar até entrega", type: "delay" },
        { label: "⭐ Pedir avaliação", type: "message" },
      ];

      if (prompt.toLowerCase().includes("cancelado") || prompt.toLowerCase().includes("cancelamento")) {
        steps[0].label = "😔 Lamentamos o cancelamento";
        steps[2].label = "🔄 Oferecer alternativa";
        steps[4].label = "📋 Feedback do cancelamento";
      } else if (prompt.toLowerCase().includes("pós-venda") || prompt.toLowerCase().includes("pos-venda")) {
        steps[0].label = "🎉 Parabéns pela compra!";
        steps[2].label = "📦 Seu pedido está a caminho";
        steps[4].label = "⭐ Como foi sua experiência?";
      }

      steps.forEach((s, i) => {
        const id = `ai_node_${i}`;
        nodes.push({ id, position: { x: 250, y }, data: { label: s.label, type: s.type, content: "" }, style: nodeStyle });
        edges.push({ id: `e_${prevId}_${id}`, source: prevId, target: id, animated: true, style: { stroke: "hsl(190 100% 50%)" } });
        prevId = id;
        y += 120;
      });

      // Simulate AI delay
      await new Promise(r => setTimeout(r, 1500));

      const triggerEvent = prompt.toLowerCase().includes("cancelado") ? "pedido_cancelado"
        : prompt.toLowerCase().includes("entregue") ? "pedido_entregue"
        : prompt.toLowerCase().includes("agendado") ? "pedido_agendado"
        : "pedido_criado";

      onGenerated({
        name: "Fluxo gerado por IA",
        trigger_event: triggerEvent,
        flow_type: "cod",
        is_official: false,
        nodes,
        edges,
        node_count: nodes.length,
        message_count: nodes.filter(n => n.data.type === "message").length,
      });

      toast.success("Fluxo gerado com sucesso!");
      onClose();
    } catch {
      toast.error("Erro ao gerar fluxo");
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
