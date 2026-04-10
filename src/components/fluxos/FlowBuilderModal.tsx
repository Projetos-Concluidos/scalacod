import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MessageCircle, Image, Mic, MousePointer, List, Clock, GitBranch, XCircle,
  Plus, ArrowLeft, ArrowRight, Check, Zap, RefreshCw, Video, FileText,
  LayoutTemplate, Settings2, Eye, Type, FileImage, FileAudio, ListOrdered,
  Maximize2, Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";

const NODE_TYPES_CONFIG = [
  { type: "trigger", label: "Trigger (Início)", icon: Zap, color: "text-success", category: "control" },
  { type: "message", label: "Mensagem de Texto", icon: MessageCircle, color: "text-primary", category: "message" },
  { type: "media", label: "Mensagem de Mídia", icon: Image, color: "text-accent", category: "message" },
  { type: "audio", label: "Mensagem de Áudio", icon: Mic, color: "text-warning", category: "message" },
  { type: "video", label: "Mensagem de Vídeo", icon: Video, color: "text-accent", category: "message" },
  { type: "document", label: "Documento", icon: FileText, color: "text-muted-foreground", category: "message" },
  { type: "buttons", label: "Botões Interativos", icon: MousePointer, color: "text-success", category: "interactive" },
  { type: "list", label: "Lista de Opções", icon: List, color: "text-primary", category: "interactive" },
  { type: "template", label: "Template Oficial", icon: LayoutTemplate, color: "text-primary", category: "interactive" },
  { type: "delay", label: "Delay / Espera", icon: Clock, color: "text-muted-foreground", category: "control" },
  { type: "condition", label: "Condição (If/Else)", icon: GitBranch, color: "text-warning", category: "control" },
  { type: "action", label: "Ação (Atualizar Status)", icon: Settings2, color: "text-accent", category: "control" },
  { type: "remarketing", label: "Remarketing", icon: RefreshCw, color: "text-warning", category: "control" },
  { type: "end", label: "Encerrar Fluxo", icon: XCircle, color: "text-destructive", category: "control" },
];

const MESSAGE_TYPE_OPTIONS = [
  { type: "text", label: "Texto", icon: Type },
  { type: "image", label: "Imagem", icon: FileImage },
  { type: "video", label: "Vídeo", icon: Video },
  { type: "document", label: "Documento", icon: FileText },
  { type: "audio", label: "Áudio", icon: FileAudio },
  { type: "buttons", label: "Botões", icon: MousePointer },
  { type: "list", label: "Lista", icon: ListOrdered },
  { type: "template", label: "Template", icon: LayoutTemplate },
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

const ORDER_STATUSES = [
  "CONFIRMED_BY_CUSTOMER", "NEEDS_CORRECTION", "SHIPPED", "DELIVERED",
  "CANCELLED", "RETURNED", "PENDING", "IN_PRODUCTION",
];

const VARIABLES = [
  "{{cliente_nome}}", "{{cliente_telefone}}", "{{pedido_numero}}", "{{produto_nome}}",
  "{{data_entrega}}", "{{status_pedido}}", "{{valor_total}}", "{{codigo_rastreio}}", "{{link_etiqueta}}",
  "{{resposta_cliente}}",
];

interface FlowBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onAutoSave?: (data: any) => void;
  initialData?: any;
  initialStep?: number;
}

export default function FlowBuilderModal({ open, onClose, onSave, onAutoSave, initialData, initialStep }: FlowBuilderModalProps) {
  const [step, setStep] = useState(1);
  const [flowName, setFlowName] = useState(initialData?.name || "");
  const [flowEmoji, setFlowEmoji] = useState(initialData?.emoji || "⚡");
  const [triggerEvent, setTriggerEvent] = useState(initialData?.trigger_event || "");
  const [flowType, setFlowType] = useState(initialData?.flow_type || "cod");
  const [apiType, setApiType] = useState(initialData?.is_official ? "official" : "evolution");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const defaultStartNode: Node = {
    id: "start", position: { x: 250, y: 50 },
    data: { label: "🚀 Início do Fluxo", type: "start" },
    style: { background: "hsl(160 84% 39% / 0.2)", border: "1px solid hsl(160 84% 39% / 0.5)", borderRadius: 12, padding: 12, color: "hsl(160 84% 60%)", fontWeight: 600, fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" },
  };

  const getNodeStyle = (type: string) => {
    const base = { borderRadius: 12, padding: 12, fontWeight: 600, fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" };
    if (type === "trigger" || type === "start") return { ...base, background: "hsl(160 84% 39% / 0.2)", border: "1px solid hsl(160 84% 39% / 0.5)", color: "hsl(160 84% 60%)" };
    if (type === "action") return { ...base, background: "hsl(217 91% 60% / 0.15)", border: "1px solid hsl(217 91% 60% / 0.5)", color: "hsl(217 91% 75%)" };
    if (type === "remarketing") return { ...base, background: "hsl(38 92% 50% / 0.15)", border: "1px solid hsl(38 92% 50% / 0.5)", color: "hsl(38 92% 70%)" };
    if (type === "end") return { ...base, background: "hsl(0 84% 60% / 0.15)", border: "1px solid hsl(0 84% 60% / 0.5)", color: "hsl(0 84% 75%)" };
    return { ...base, background: "hsl(220 10% 14%)", border: "1px solid hsl(160 84% 39% / 0.3)", color: "#e5e7eb", minWidth: 200 };
  };

  const normalizeNodes = useCallback((rawNodes: any[]): Node[] => {
    return rawNodes.map((n: any) => {
      const nodeType = n.data?.type || n.type || "message";
      const mappedType = nodeType === "text" ? "message" : nodeType;
      const cfg = NODE_TYPES_CONFIG.find(c => c.type === mappedType);
      const content = n.data?.content || n.data?.text || "";
      const label = n.data?.label || cfg?.label || (content ? content.slice(0, 50) + "..." : mappedType);

      return {
        id: n.id,
        position: n.position || { x: 250, y: 100 },
        data: {
          ...n.data,
          type: mappedType,
          label,
          content,
          text: content,
          messageType: n.data?.messageType || (["message", "text"].includes(nodeType) ? "text" : undefined),
        },
        style: n.style || getNodeStyle(mappedType),
      };
    });
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes?.length ? normalizeNodes(initialData.nodes) : [defaultStartNode]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges?.length ? initialData.edges : []);
  const nodeIdCounter = useRef(1);

  useEffect(() => {
    if (open && initialData) {
      setFlowName(initialData.name || "");
      setFlowEmoji(initialData.emoji || "⚡");
      setTriggerEvent(initialData.trigger_event || "");
      setFlowType(initialData.flow_type || "cod");
      setApiType(initialData.is_official ? "official" : "evolution");
      const normalized = initialData.nodes?.length ? normalizeNodes(initialData.nodes) : [defaultStartNode];
      setNodes(normalized);
      setEdges(initialData.edges?.length ? initialData.edges : []);
      nodeIdCounter.current = (initialData.nodes?.length || 0) + 1;
      setStep(initialStep || 1);
      setSelectedNode(null);
    } else if (open && !initialData) {
      setFlowName(""); setFlowEmoji("⚡"); setTriggerEvent(""); setFlowType("cod"); setApiType("evolution");
      setNodes([defaultStartNode]); setEdges([]);
      nodeIdCounter.current = 1; setStep(initialStep || 1); setSelectedNode(null);
    }
  }, [open, initialData, initialStep]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "hsl(160 84% 60%)", strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const addNode = (type: string) => {
    const id = `node_${nodeIdCounter.current++}`;
    const cfg = NODE_TYPES_CONFIG.find(n => n.type === type);
    const newNode: Node = {
      id,
      position: { x: 250, y: 100 + nodes.length * 130 },
      data: { label: cfg?.label || type, type, content: "", messageType: type === "message" ? "text" : undefined },
      style: getNodeStyle(type),
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const updateNodeData = (nodeId: string, updates: Record<string, any>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== nodeId) return n;
      const newData = { ...n.data, ...updates };
      // Update label if provided
      if (updates.label) newData.label = updates.label;
      return { ...n, data: newData };
    }));
    // Also update the selected node state
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...updates } } : null);
    }
  };

  const handleSave = () => {
    const messageTypes = ["message", "media", "audio", "video", "document", "buttons", "list", "template"];
    onSave({
      name: flowName,
      trigger_event: triggerEvent,
      flow_type: flowType,
      is_official: apiType === "official",
      nodes,
      edges,
      node_count: nodes.length,
      message_count: nodes.filter(n => messageTypes.includes(n.data.type as string)).length,
    });
  };

  const renderNodeConfigPanel = () => {
    if (!selectedNode || selectedNode.data.type === "start") return null;
    const nd = selectedNode.data;
    const nodeType = nd.type as string;
    const isMessageNode = ["message", "media", "audio", "video", "document", "buttons", "list", "template"].includes(nodeType);

    return (
      <div className="w-72 border-l border-border p-4 space-y-4 bg-secondary/30 overflow-auto">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Configurar Nó</h4>
          <Button size="sm" variant="ghost" onClick={() => setSelectedNode(null)} className="h-7 w-7 p-0">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* Editable label */}
        <div className="space-y-1.5">
          <Label className="text-xs">Rótulo</Label>
          <Input
            value={(nd.label as string) || ""}
            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
            className="text-xs h-8"
          />
        </div>

        {/* Message type selector for message nodes */}
        {isMessageNode && (
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de mensagem</Label>
            <div className="grid grid-cols-4 gap-1">
              {MESSAGE_TYPE_OPTIONS.map((mt) => (
                <button
                  key={mt.type}
                  onClick={() => updateNodeData(selectedNode.id, { messageType: mt.type })}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] transition-colors border",
                    (nd.messageType || "text") === mt.type
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-transparent hover:bg-muted text-muted-foreground"
                  )}
                >
                  <mt.icon className="h-3.5 w-3.5" />
                  {mt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Header (optional) */}
        {isMessageNode && (
          <div className="space-y-1.5">
            <Label className="text-xs">Cabeçalho (opcional)</Label>
            <Input
              value={(nd.headerText as string) || ""}
              onChange={(e) => updateNodeData(selectedNode.id, { headerText: e.target.value })}
              placeholder="📦 Título aqui..."
              className="text-xs h-8"
            />
          </div>
        )}

        {/* Content / text */}
        {isMessageNode && (
          <div className="space-y-1.5">
            <Label className="text-xs">Texto da mensagem</Label>
            <Textarea
              value={(nd.text as string) || (nd.content as string) || ""}
              onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value, content: e.target.value })}
              placeholder="Digite a mensagem..."
              className="text-xs min-h-[100px]"
            />
            <div className="flex flex-wrap gap-1">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    const current = (nd.text as string) || (nd.content as string) || "";
                    updateNodeData(selectedNode.id, { text: current + " " + v, content: current + " " + v });
                  }}
                  className="text-[9px] bg-primary/10 text-primary rounded px-1.5 py-0.5 hover:bg-primary/20"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer (optional) */}
        {isMessageNode && (
          <div className="space-y-1.5">
            <Label className="text-xs">Rodapé (opcional)</Label>
            <Input
              value={(nd.footerText as string) || ""}
              onChange={(e) => updateNodeData(selectedNode.id, { footerText: e.target.value })}
              placeholder="💳 Pagamento na entrega"
              className="text-xs h-8"
            />
          </div>
        )}

        {/* Buttons config */}
        {((nd.messageType === "buttons") || nodeType === "buttons") && (
          <div className="space-y-1.5">
            <Label className="text-xs">Botões (até 3)</Label>
            {[0, 1, 2].map((i) => {
              const buttons = (nd.buttons as any[]) || [];
              return (
                <Input
                  key={i}
                  value={buttons[i]?.text || ""}
                  onChange={(e) => {
                    const newButtons = [...(buttons || [])];
                    if (!newButtons[i]) newButtons[i] = { id: `btn-${i}`, text: "", type: "reply" };
                    newButtons[i] = { ...newButtons[i], text: e.target.value };
                    updateNodeData(selectedNode.id, { buttons: newButtons });
                  }}
                  placeholder={`Botão ${i + 1}`}
                  className="text-xs h-8"
                />
              );
            })}
          </div>
        )}

        {/* Wait for response */}
        {isMessageNode && (
          <div className="space-y-2">
            <Label className="text-xs">Aguardar resposta do cliente</Label>
            <Select
              value={(nd.waitForResponse as string) || "none"}
              onValueChange={(v) => updateNodeData(selectedNode.id, { waitForResponse: v })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="standard">Padrão (1 resposta)</SelectItem>
                <SelectItem value="smart">Smart (campos específicos)</SelectItem>
              </SelectContent>
            </Select>
            {nd.waitForResponse === "smart" && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Campos esperados (separar por vírgula)</Label>
                <Input
                  value={(nd.smartWaitFields as string) || ""}
                  onChange={(e) => updateNodeData(selectedNode.id, { smartWaitFields: e.target.value })}
                  placeholder="Nome, Endereço, Telefone"
                  className="text-xs h-8"
                />
              </div>
            )}
          </div>
        )}

        {/* Delay config */}
        {nodeType === "delay" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Tempo de espera</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={(nd.delay_minutes as number) || ""}
                onChange={(e) => updateNodeData(selectedNode.id, { delay_minutes: Number(e.target.value) })}
                placeholder="5"
                className="w-20 h-8 text-xs"
              />
              <Select
                value={(nd.delayUnit as string) || "minutes"}
                onValueChange={(v) => updateNodeData(selectedNode.id, { delayUnit: v })}
              >
                <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Action config */}
        {nodeType === "action" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Ação</Label>
            <Select
              value={(nd.actionType as string) || "update_order_status"}
              onValueChange={(v) => updateNodeData(selectedNode.id, { actionType: v })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="update_order_status">Atualizar status do pedido</SelectItem>
                <SelectItem value="add_tag">Adicionar tag</SelectItem>
                <SelectItem value="remove_tag">Remover tag</SelectItem>
              </SelectContent>
            </Select>
            {(nd.actionType === "update_order_status" || !nd.actionType) && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Novo status</Label>
                <Select
                  value={(nd.orderStatus as string) || ""}
                  onValueChange={(v) => updateNodeData(selectedNode.id, { orderStatus: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar status" /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Trigger config */}
        {nodeType === "trigger" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Evento de Disparo</Label>
            <Select
              value={(nd.keyword as string) || ""}
              onValueChange={(v) => updateNodeData(selectedNode.id, { keyword: v })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar evento" /></SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Remarketing config */}
        {nodeType === "remarketing" && (
          <div className="space-y-2">
            <Label className="text-xs">Etapas de Remarketing</Label>
            {((nd.steps as any[]) || [{ id: "rmk-1", delay: 2, unit: "hours", message: "" }]).map((s: any, i: number) => (
              <div key={s.id || i} className="space-y-1 bg-muted/50 rounded-lg p-2">
                <p className="text-[10px] font-semibold text-muted-foreground">Etapa {i + 1}</p>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={s.delay || ""}
                    onChange={(e) => {
                      const steps = [...((nd.steps as any[]) || [])];
                      steps[i] = { ...steps[i], delay: Number(e.target.value) };
                      updateNodeData(selectedNode.id, { steps });
                    }}
                    className="w-14 h-7 text-[10px]"
                  />
                  <Select
                    value={s.unit || "hours"}
                    onValueChange={(v) => {
                      const steps = [...((nd.steps as any[]) || [])];
                      steps[i] = { ...steps[i], unit: v };
                      updateNodeData(selectedNode.id, { steps });
                    }}
                  >
                    <SelectTrigger className="w-20 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={s.message || ""}
                  onChange={(e) => {
                    const steps = [...((nd.steps as any[]) || [])];
                    steps[i] = { ...steps[i], message: e.target.value };
                    updateNodeData(selectedNode.id, { steps });
                  }}
                  placeholder="Mensagem de follow-up..."
                  className="text-[10px] min-h-[50px]"
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-[10px]"
              onClick={() => {
                const steps = [...((nd.steps as any[]) || [])];
                steps.push({ id: `rmk-${steps.length + 1}`, delay: 1, unit: "days", message: "" });
                updateNodeData(selectedNode.id, { steps });
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar etapa
            </Button>
          </div>
        )}

        {/* WhatsApp Preview */}
        {isMessageNode && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Eye className="h-3 w-3" /> Pré-visualização</Label>
            <div className="bg-[#0b141a] rounded-xl p-3 space-y-1">
              <div className="bg-[#005c4b] rounded-lg px-3 py-2 text-[11px] text-white ml-auto max-w-full space-y-1">
                {nd.headerText && <p className="font-bold text-[11px]">{nd.headerText as string}</p>}
                <p className="whitespace-pre-wrap">{(nd.text as string) || (nd.content as string) || "Mensagem aqui..."}</p>
                {nd.footerText && <p className="text-[9px] text-white/60 mt-1">{nd.footerText as string}</p>}
              </div>
              {(nd.buttons as any[])?.filter((b: any) => b?.text).map((b: any, i: number) => (
                <div key={i} className="bg-[#005c4b]/50 rounded-lg px-3 py-1.5 text-[10px] text-center text-white/90 border border-white/10">
                  {b.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done button */}
        <Button size="sm" className="w-full gradient-primary text-primary-foreground" onClick={() => setSelectedNode(null)}>
          <Check className="h-3 w-3 mr-1" /> Concluído
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn(
        "flex flex-col bg-card border-border p-0 gap-0 transition-all duration-200",
        isMaximized ? "max-w-[100vw] w-[100vw] h-[100vh] rounded-none" : "max-w-5xl h-[85vh]"
      )}>
        <DialogHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="text-foreground flex items-center gap-2 text-sm">
            {flowEmoji && <span className="text-base">{flowEmoji}</span>}
            {flowName ? (
              <span>{flowName} <span className="text-muted-foreground font-normal">— {step === 1 ? "Configurações" : step === 2 ? "Builder de Nós" : "Revisão"}</span></span>
            ) : (
              <>
                {step === 1 && "Configurações do Fluxo"}
                {step === 2 && "Builder de Nós"}
                {step === 3 && "Revisão"}
              </>
            )}
          </DialogTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 mr-6" onClick={() => setIsMaximized(prev => !prev)}>
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
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
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Controle</p>
                {NODE_TYPES_CONFIG.filter(n => n.category === "control").map(nt => (
                  <button key={nt.type} onClick={() => addNode(nt.type)} className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    <nt.icon className={cn("h-4 w-4", nt.color)} />
                    {nt.label}
                  </button>
                ))}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 mb-2">Mensagens</p>
                {NODE_TYPES_CONFIG.filter(n => n.category === "message").map(nt => (
                  <button key={nt.type} onClick={() => addNode(nt.type)} className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    <nt.icon className={cn("h-4 w-4", nt.color)} />
                    {nt.label}
                  </button>
                ))}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 mb-2">Interativos</p>
                {NODE_TYPES_CONFIG.filter(n => n.category === "interactive").map(nt => (
                  <button key={nt.type} onClick={() => addNode(nt.type)} className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
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
                  style={{ background: "#0a0a0a" }}
                >
                  <Controls style={{ background: "#1a1a1a", borderColor: "#333", color: "#aaa" }} />
                  <MiniMap style={{ background: "#111" }} nodeColor="hsl(160 84% 39% / 0.4)" maskColor="rgba(0,0,0,0.7)" />
                  <Background color="#252525" gap={20} size={1} />
                </ReactFlow>
              </div>

              {/* Node config panel */}
              {renderNodeConfigPanel()}
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
                  {nodes.filter(n => ["message", "media", "audio", "video", "document", "buttons", "list", "template"].includes(n.data.type as string)).map((n, i) => (
                    <div key={i} className="space-y-1">
                      <div className="bg-[#005c4b] rounded-lg px-3 py-2 text-xs text-white ml-auto max-w-[80%]">
                        {n.data.headerText && <p className="font-bold text-[11px]">{n.data.headerText as string}</p>}
                        {(n.data.text as string) || (n.data.content as string) || (n.data.label as string)}
                        {n.data.footerText && <p className="text-[9px] text-white/60 mt-1">{n.data.footerText as string}</p>}
                      </div>
                      {(n.data.buttons as any[])?.filter((b: any) => b?.text).map((b: any, j: number) => (
                        <div key={j} className="bg-[#005c4b]/50 rounded-lg px-3 py-1 text-[10px] text-center text-white/90 border border-white/10 ml-auto max-w-[80%]">
                          {b.text}
                        </div>
                      ))}
                    </div>
                  ))}
                  {nodes.filter(n => ["message", "media", "audio", "video", "document", "buttons", "list", "template"].includes(n.data.type as string)).length === 0 && (
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
