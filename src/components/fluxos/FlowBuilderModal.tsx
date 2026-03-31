import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageCircle, Image, Mic, MousePointer, List, Clock, GitBranch, XCircle, Plus, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const NODE_TYPES_CONFIG = [
  { type: "message", label: "Mensagem de Texto", icon: MessageCircle, color: "text-primary" },
  { type: "media", label: "Mensagem de Mídia", icon: Image, color: "text-accent" },
  { type: "audio", label: "Mensagem de Áudio", icon: Mic, color: "text-warning" },
  { type: "buttons", label: "Botões Interativos", icon: MousePointer, color: "text-success" },
  { type: "list", label: "Lista de Opções", icon: List, color: "text-primary" },
  { type: "delay", label: "Delay / Espera", icon: Clock, color: "text-muted-foreground" },
  { type: "condition", label: "Condição (If/Else)", icon: GitBranch, color: "text-warning" },
  { type: "end", label: "Encerrar Fluxo", icon: XCircle, color: "text-destructive" },
];

const TRIGGER_OPTIONS = [
  { value: "pedido_criado", label: "Pedido Criado" },
  { value: "pedido_cancelado", label: "Pedido Cancelado" },
  { value: "pedido_agendado", label: "Pedido Agendado" },
  { value: "pedido_entregue", label: "Pedido Entregue" },
  { value: "pedido_frustrado", label: "Pedido Frustrado" },
  { value: "lead_criado", label: "Lead Criado" },
  { value: "manual", label: "Manual" },
  { value: "agendado", label: "Agendado" },
];

const VARIABLES = [
  "{{cliente_nome}}", "{{cliente_telefone}}", "{{pedido_numero}}", "{{produto_nome}}",
  "{{data_entrega}}", "{{status_pedido}}", "{{valor_total}}", "{{codigo_rastreio}}", "{{link_etiqueta}}"
];

interface FlowBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
}

export default function FlowBuilderModal({ open, onClose, onSave, initialData }: FlowBuilderModalProps) {
  const [step, setStep] = useState(1);
  const [flowName, setFlowName] = useState(initialData?.name || "");
  const [flowEmoji, setFlowEmoji] = useState(initialData?.emoji || "⚡");
  const [triggerEvent, setTriggerEvent] = useState(initialData?.trigger_event || "");
  const [flowType, setFlowType] = useState(initialData?.flow_type || "cod");
  const [apiType, setApiType] = useState(initialData?.is_official ? "official" : "evolution");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const defaultStartNode: Node = { id: "start", position: { x: 250, y: 50 }, data: { label: "🚀 Início do Fluxo", type: "start" }, style: { background: "hsl(160 84% 39% / 0.15)", border: "1px solid hsl(160 84% 39% / 0.3)", borderRadius: 12, padding: 12, color: "hsl(160 84% 39%)", fontWeight: 600, fontSize: 13 } };

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes?.length ? initialData.nodes : [defaultStartNode]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges?.length ? initialData.edges : []);
  const nodeIdCounter = useRef(1);

  // Sync initialData changes (e.g. from AI generation)
  useEffect(() => {
    if (open && initialData) {
      setFlowName(initialData.name || "");
      setFlowEmoji(initialData.emoji || "⚡");
      setTriggerEvent(initialData.trigger_event || "");
      setFlowType(initialData.flow_type || "cod");
      setApiType(initialData.is_official ? "official" : "evolution");
      setNodes(initialData.nodes?.length ? initialData.nodes : [defaultStartNode]);
      setEdges(initialData.edges?.length ? initialData.edges : []);
      nodeIdCounter.current = (initialData.nodes?.length || 0) + 1;
      setStep(1);
    } else if (open && !initialData) {
      setFlowName("");
      setFlowEmoji("⚡");
      setTriggerEvent("");
      setFlowType("cod");
      setApiType("evolution");
      setNodes([defaultStartNode]);
      setEdges([]);
      nodeIdCounter.current = 1;
      setStep(1);
    }
  }, [open, initialData]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "hsl(160 84% 39%)" } }, eds));
  }, [setEdges]);

  const addNode = (type: string) => {
    const id = `node_${nodeIdCounter.current++}`;
    const cfg = NODE_TYPES_CONFIG.find(n => n.type === type);
    const newNode: Node = {
      id,
      position: { x: 250, y: 100 + nodes.length * 120 },
      data: { label: `${cfg?.label || type}`, type, content: "" },
      style: {
        background: "#FFFFFF",
        border: "1px solid hsl(160 84% 39% / 0.2)",
        borderRadius: 12,
        padding: 12,
        color: "#111827",
        fontSize: 13,
        minWidth: 200,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = () => {
    onSave({
      name: flowName,
      trigger_event: triggerEvent,
      flow_type: flowType,
      is_official: apiType === "official",
      nodes: nodes,
      edges: edges,
      node_count: nodes.length,
      message_count: nodes.filter(n => ["message", "media", "audio"].includes(n.data.type as string)).length,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col bg-card border-border p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-foreground flex items-center gap-2">
            {step === 1 && "Configurações do Fluxo"}
            {step === 2 && "Builder de Nós"}
            {step === 3 && "Revisão"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn("flex items-center gap-2 text-xs font-semibold", s === step ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("h-6 w-6 rounded-full flex items-center justify-center text-xs", s === step ? "bg-primary text-primary-foreground" : s < step ? "bg-success text-success-foreground" : "bg-muted")}>{s < step ? "✓" : s}</span>
              {s === 1 && "Config"}
              {s === 2 && "Builder"}
              {s === 3 && "Revisão"}
              {s < 3 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {step === 1 && (
            <div className="p-6 space-y-6 max-w-lg">
              <div className="space-y-2">
                <Label>Nome do Fluxo</Label>
                <div className="flex gap-2">
                  <Input value={flowEmoji} onChange={e => setFlowEmoji(e.target.value)} className="w-16 text-center text-lg" maxLength={2} />
                  <Input value={flowName} onChange={e => setFlowName(e.target.value)} placeholder="Ex: Pós-venda COD" className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Trigger (quando disparar)</Label>
                <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                  <SelectTrigger><SelectValue placeholder="Selecione o gatilho" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={flowType} onValueChange={setFlowType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">COD</SelectItem>
                      <SelectItem value="standard">Padrão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>API</Label>
                  <Select value={apiType} onValueChange={setApiType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="official">Oficial (Meta)</SelectItem>
                      <SelectItem value="evolution">Evolution (QR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex h-full" style={{ minHeight: 500 }}>
              {/* Sidebar - node palette */}
              <div className="w-56 border-r border-border p-3 space-y-1 overflow-auto bg-secondary/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Arrastar para o canvas</p>
                {NODE_TYPES_CONFIG.map(nt => (
                  <button key={nt.type} onClick={() => addNode(nt.type)} className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    <nt.icon className={cn("h-4 w-4", nt.color)} />
                    {nt.label}
                  </button>
                ))}
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Variáveis</p>
                  <div className="flex flex-wrap gap-1">
                    {VARIABLES.map(v => (
                      <span key={v} className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5 cursor-pointer hover:bg-primary/20">{v}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={(_, node) => setSelectedNode(node)}
                  fitView
                  proOptions={{ hideAttribution: true }}
                  style={{ background: "#F8FFFE" }}
                >
                  <Controls style={{ background: "#FFFFFF", borderColor: "hsl(160 84% 39% / 0.2)" }} />
                  <MiniMap style={{ background: "#FFFFFF" }} nodeColor="hsl(160 84% 39% / 0.3)" />
                  <Background color="hsl(160 84% 39% / 0.08)" gap={20} />
                </ReactFlow>
              </div>

              {/* Node config panel */}
              {selectedNode && selectedNode.data.type !== "start" && (
                <div className="w-64 border-l border-border p-4 space-y-4 bg-secondary/30 overflow-auto">
                  <h4 className="text-sm font-semibold text-foreground">Configurar Nó</h4>
                  <p className="text-xs text-muted-foreground">{selectedNode.data.label as string}</p>
                  {["message", "media", "audio"].includes(selectedNode.data.type as string) && (
                    <div className="space-y-2">
                      <Label className="text-xs">Conteúdo</Label>
                      <Textarea placeholder="Digite a mensagem..." className="text-xs min-h-[100px]" />
                    </div>
                  )}
                  {selectedNode.data.type === "delay" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Tempo de espera</Label>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="5" className="w-20" />
                        <Select defaultValue="minutes">
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutos</SelectItem>
                            <SelectItem value="hours">Horas</SelectItem>
                            <SelectItem value="days">Dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {selectedNode.data.type === "buttons" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Botões (até 3)</Label>
                      {[1, 2, 3].map(i => (
                        <Input key={i} placeholder={`Botão ${i}`} className="text-xs" />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="p-6 space-y-6">
              <div className="ninja-card">
                <h4 className="text-sm font-semibold text-foreground mb-3">Resumo do Fluxo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> <span className="text-foreground font-medium">{flowEmoji} {flowName}</span></div>
                  <div><span className="text-muted-foreground">Trigger:</span> <span className="text-foreground font-medium">{TRIGGER_OPTIONS.find(t => t.value === triggerEvent)?.label || "—"}</span></div>
                  <div><span className="text-muted-foreground">Tipo:</span> <span className="text-foreground font-medium">{flowType === "cod" ? "COD" : "Padrão"}</span></div>
                  <div><span className="text-muted-foreground">API:</span> <span className="text-foreground font-medium">{apiType === "official" ? "Oficial (Meta)" : "Evolution"}</span></div>
                  <div><span className="text-muted-foreground">Nós:</span> <span className="text-foreground font-medium">{nodes.length}</span></div>
                  <div><span className="text-muted-foreground">Conexões:</span> <span className="text-foreground font-medium">{edges.length}</span></div>
                </div>
              </div>
              {/* WhatsApp preview */}
              <div className="ninja-card">
                <h4 className="text-sm font-semibold text-foreground mb-3">Preview WhatsApp</h4>
                <div className="bg-[#0b141a] rounded-xl p-4 space-y-2 max-w-sm">
                  {nodes.filter(n => ["message", "media", "audio"].includes(n.data.type as string)).map((n, i) => (
                    <div key={i} className="bg-[#005c4b] rounded-lg px-3 py-2 text-xs text-white ml-auto max-w-[80%]">
                      {(n.data.content as string) || (n.data.label as string)}
                    </div>
                  ))}
                  {nodes.filter(n => ["message", "media", "audio"].includes(n.data.type as string)).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem adicionada ainda</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> {step > 1 ? "Voltar" : "Cancelar"}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !flowName} className="gradient-primary text-primary-foreground">
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
              <Check className="h-4 w-4 mr-1" /> {apiType === "official" ? "Enviar p/ Aprovação" : "Ativar Fluxo"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
