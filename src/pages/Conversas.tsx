import { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare, Search, SlidersHorizontal, RefreshCw, Tag, Send, Paperclip,
  Smile, Mic, Info, Phone, Mail, FileText, X, Plus, Check, CheckCheck,
  Image as ImageIcon, File, ChevronDown, Layout, FlaskConical, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isToday, isYesterday, isSameDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import EmojiStickerPicker from "@/components/chat/EmojiStickerPicker";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Conversation = Tables<"conversations">;
type Message = Tables<"messages">;

const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

const formatTime = (d: string) => {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM", { locale: ptBR });
};

const formatDateSeparator = (d: string) => {
  const date = new Date(d);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};

const labelColors = [
  "bg-primary/20 text-primary border-primary/30",
  "bg-success/20 text-success border-success/30",
  "bg-warning/20 text-warning border-warning/30",
  "bg-destructive/20 text-destructive border-destructive/30",
  "bg-accent/20 text-accent border-accent/30",
];

const Conversas = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [leadData, setLeadData] = useState<any>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [selectedTemplateFlow, setSelectedTemplateFlow] = useState<any>(null);
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { play: playNotification, requestPermission } = useNotificationSound();

  // Advanced filters
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [windowFilter, setWindowFilter] = useState<"all" | "open" | "expired">("all");
  const [mediaFilter, setMediaFilter] = useState<"all" | "media" | "text">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">("all");

  // Test modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testMode, setTestMode] = useState<"message" | "flow">("message");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testFlowId, setTestFlowId] = useState("");
  const [testSending, setTestSending] = useState(false);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (readFilter !== "all") c++;
    if (windowFilter !== "all") c++;
    if (mediaFilter !== "all") c++;
    if (dateFilter !== "all") c++;
    return c;
  }, [readFilter, windowFilter, mediaFilter, dateFilter]);

  const clearAllFilters = () => {
    setReadFilter("all");
    setWindowFilter("all");
    setMediaFilter("all");
    setDateFilter("all");
  };

  // Fetch approved templates (flows with is_official + approved flow_templates)
  const { data: approvedFlows } = useQuery({
    queryKey: ["approved-templates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("flows")
        .select("*, flow_templates(*)")
        .eq("user_id", user.id)
        .eq("is_official", true);
      return (data || []).filter((f: any) =>
        f.flow_templates?.some((t: any) => t.status === "APPROVED" || t.status === "approved")
      );
    },
    enabled: !!user,
  });

  // Fetch all user flows for test modal
  const { data: userFlows } = useQuery({
    queryKey: ["user-flows-test", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("flows")
        .select("id, name, is_active, message_count")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false });
    setConversations(data || []);
    setLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    setMsgLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("timestamp", { ascending: true });
    setMessages(data || []);
    setMsgLoading(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const fetchContactInfo = async (conv: Conversation) => {
    if (!user) return;
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone", conv.contact_phone)
      .maybeSingle();
    setLeadData(lead);

    if (lead?.order_id) {
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", lead.order_id)
        .maybeSingle();
      setOrderData(order);
    } else {
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("client_phone", conv.contact_phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setOrderData(order);
    }
  };

  useEffect(() => { fetchConversations(); requestPermission(); }, [user]);

  // Realtime messages
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (selectedConv && msg.conversation_id === selectedConv.id) {
          setMessages(prev => [...prev, msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
        if (msg.direction === "inbound") {
          playNotification();
        }
        setConversations(prev => prev.map(c =>
          c.id === msg.conversation_id
            ? { ...c, last_message: msg.content, last_message_at: msg.timestamp, unread_count: selectedConv?.id === c.id ? 0 : (c.unread_count || 0) + 1 }
            : c
        ).sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  // Realtime conversations
  useEffect(() => {
    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setShowInfo(true);
    fetchMessages(conv.id);
    fetchContactInfo(conv);
    if (conv.unread_count && conv.unread_count > 0) {
      await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conv.id);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const sendMessage = async () => {
    if (!selectedConv || !newMessage.trim() || !user || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const optimistic: Message = {
      id: crypto.randomUUID(),
      conversation_id: selectedConv.id,
      direction: "outbound",
      type: "text",
      content,
      status: "pending",
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      media_url: null,
      message_id_whatsapp: null,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: { conversationId: selectedConv.id, content },
      });

      if (error) throw new Error(error.message || "Erro ao enviar");
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConv.id
            ? { ...c, last_message: content, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      toast.error(err.message || "Falha ao enviar mensagem");
    }
    setSending(false);
  };

  const sendMediaMessage = async (file: File) => {
    if (!selectedConv || !user || sending) return;
    setSending(true);

    const type = file.type.startsWith("image/") ? "image"
      : file.type.startsWith("audio/") ? "audio"
      : file.type.startsWith("video/") ? "video"
      : "document";

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      const optimistic: Message = {
        id: crypto.randomUUID(),
        conversation_id: selectedConv.id,
        direction: "outbound",
        type,
        content: `[${type}] ${file.name}`,
        status: "pending",
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        media_url: dataUrl,
        message_id_whatsapp: null,
      };
      setMessages(prev => [...prev, optimistic]);

      try {
        toast.info(`Enviando ${type}: ${file.name}...`);
        const { error } = await supabase.functions.invoke("send-whatsapp-message", {
          body: { conversationId: selectedConv.id, content: file.name, type, mediaUrl: dataUrl },
        });
        if (error) throw new Error(error.message);
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      } catch (err: any) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        toast.error(err.message || "Falha ao enviar mídia");
      }
      setSending(false);
    };
    reader.readAsDataURL(file);
  };

  const getTemplateVarCount = (flow: any): number => {
    const tmpl = flow.flow_templates?.find((t: any) => t.status === "APPROVED" || t.status === "approved") || flow.flow_templates?.[0];
    if (!tmpl?.components) return 0;
    const comps = tmpl.components as any[];
    const bodyComp = comps.find((c: any) => c.type === "BODY");
    if (!bodyComp?.text) return 0;
    const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  const selectTemplateFlow = (flow: any) => {
    const varCount = getTemplateVarCount(flow);
    if (varCount === 0) {
      sendTemplateMessage(flow, []);
    } else {
      setSelectedTemplateFlow(flow);
      setTemplateVars(new Array(varCount).fill(""));
      setShowTemplates(false);
    }
  };

  const sendTemplateMessage = async (flow: any, variables: string[]) => {
    if (!selectedConv || !user || sendingTemplate) return;
    setSendingTemplate(true);
    setShowTemplates(false);
    setSelectedTemplateFlow(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-template-message", {
        body: {
          conversationId: selectedConv.id,
          flowId: flow.id,
          variables: variables.filter(v => v.trim()),
        },
      });

      if (error) throw new Error(error.message || "Erro ao enviar template");
      toast.success(`Template "${flow.name}" enviado!`);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConv.id
            ? { ...c, last_message: `[Template: ${flow.name}]`, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar template");
    }
    setSendingTemplate(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx 16MB)");
        return;
      }
      sendMediaMessage(file);
    }
    e.target.value = "";
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Test modal: send test message
  const sendTestMessage = async () => {
    if (!testPhone.trim() || !testMessage.trim() || !user || testSending) return;
    setTestSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: { phone: testPhone.replace(/\D/g, ""), content: testMessage.trim(), userId: user.id },
      });
      if (error) throw new Error(error.message);
      toast.success("Mensagem de teste enviada!");
      setTestPhone("");
      setTestMessage("");
      setTestModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar mensagem de teste");
    }
    setTestSending(false);
  };

  // Test modal: trigger flow
  const triggerTestFlow = async () => {
    if (!testPhone.trim() || !testFlowId || !user || testSending) return;
    setTestSending(true);
    try {
      const { error } = await supabase.functions.invoke("execute-flow", {
        body: { flowId: testFlowId, phone: testPhone.replace(/\D/g, ""), userId: user.id },
      });
      if (error) throw new Error(error.message);
      toast.success("Fluxo disparado com sucesso!");
      setTestPhone("");
      setTestFlowId("");
      setTestModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Falha ao disparar fluxo");
    }
    setTestSending(false);
  };

  const addLabel = async (convId: string, label: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const current = (conv.labels as string[]) || [];
    if (current.includes(label)) return;
    const updated = [...current, label];
    await supabase.from("conversations").update({ labels: updated as any }).eq("id", convId);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, labels: updated as any } : c));
    if (selectedConv?.id === convId) setSelectedConv({ ...selectedConv, labels: updated as any });
  };

  const removeLabel = async (convId: string, label: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const current = (conv.labels as string[]) || [];
    const updated = current.filter(l => l !== label);
    await supabase.from("conversations").update({ labels: updated as any }).eq("id", convId);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, labels: updated as any } : c));
    if (selectedConv?.id === convId) setSelectedConv({ ...selectedConv, labels: updated as any });
  };

  const filtered = useMemo(() => {
    let result = conversations;

    // Read filter
    if (readFilter === "unread") result = result.filter(c => (c.unread_count || 0) > 0);
    if (readFilter === "read") result = result.filter(c => (c.unread_count || 0) === 0);

    // Window filter (24h rule)
    if (windowFilter === "open") {
      const cutoff = subDays(new Date(), 1);
      result = result.filter(c => c.last_message_at && new Date(c.last_message_at) > cutoff);
    }
    if (windowFilter === "expired") {
      const cutoff = subDays(new Date(), 1);
      result = result.filter(c => !c.last_message_at || new Date(c.last_message_at) <= cutoff);
    }

    // Media filter
    if (mediaFilter === "media") {
      result = result.filter(c => {
        const msg = (c.last_message || "").toLowerCase();
        return msg.includes("[image]") || msg.includes("[audio]") || msg.includes("[video]") || msg.includes("[document]") || msg.includes("[sticker]");
      });
    }
    if (mediaFilter === "text") {
      result = result.filter(c => {
        const msg = (c.last_message || "").toLowerCase();
        return !msg.includes("[image]") && !msg.includes("[audio]") && !msg.includes("[video]") && !msg.includes("[document]") && !msg.includes("[sticker]");
      });
    }

    // Date filter
    if (dateFilter === "today") {
      result = result.filter(c => c.last_message_at && isToday(new Date(c.last_message_at)));
    }
    if (dateFilter === "7d") {
      const cutoff = subDays(new Date(), 7);
      result = result.filter(c => c.last_message_at && new Date(c.last_message_at) >= cutoff);
    }
    if (dateFilter === "30d") {
      const cutoff = subDays(new Date(), 30);
      result = result.filter(c => c.last_message_at && new Date(c.last_message_at) >= cutoff);
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        (c.contact_name || "").toLowerCase().includes(s) ||
        c.contact_phone.includes(s) ||
        (c.last_message || "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [conversations, readFilter, windowFilter, mediaFilter, dateFilter, search]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    messages.forEach(msg => {
      const dateStr = format(new Date(msg.timestamp), "yyyy-MM-dd");
      const last = groups[groups.length - 1];
      if (last && last.date === dateStr) {
        last.messages.push(msg);
      } else {
        groups.push({ date: dateStr, messages: [msg] });
      }
    });
    return groups;
  }, [messages]);

  const MessageStatus = ({ status }: { status: string | null }) => {
    if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-primary" />;
    if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
    return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const MessageBubble = ({ msg }: { msg: Message }) => {
    const isOut = msg.direction === "outbound";
    return (
      <div className={cn("flex mb-2", isOut ? "justify-end" : "justify-start")}>
        <div className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
          isOut
            ? "bg-primary/20 text-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}>
          {msg.type === "image" && msg.media_url && (
            <img src={msg.media_url} alt="" className="rounded-lg mb-1 max-w-[240px]" />
          )}
          {msg.type === "audio" && msg.media_url && (
            <audio controls src={msg.media_url} className="max-w-[240px]" />
          )}
          {msg.type === "document" && msg.media_url && (
            <a href={msg.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline mb-1">
              <File className="h-4 w-4" /> Documento
            </a>
          )}
          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
          <div className={cn("flex items-center gap-1 mt-1", isOut ? "justify-end" : "justify-start")}>
            <span className="text-[10px] text-muted-foreground">{format(new Date(msg.timestamp), "HH:mm")}</span>
            {isOut && <MessageStatus status={msg.status} />}
          </div>
        </div>
      </div>
    );
  };

  const FilterChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted bg-muted/50"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-6">
      {/* COLUMN 1: Conversation List */}
      <div className="w-[320px] min-w-[320px] border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Conversas</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setTestModalOpen(true); setTestMode("message"); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Enviar teste"
              >
                <FlaskConical className="h-4 w-4" />
              </button>
              <button onClick={fetchConversations} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar contato..."
                className="h-9 w-full rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn("relative flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted", showFilters ? "text-primary bg-primary/10 border-primary/30" : "text-muted-foreground")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 space-y-3 bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Filtros Avançados</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="text-[10px] text-destructive hover:text-destructive/80 font-medium flex items-center gap-1">
                    <X className="h-3 w-3" /> Limpar todos
                  </button>
                )}
              </div>

              {/* Group 1: Read status */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Leitura</p>
                <div className="flex flex-wrap gap-1">
                  <FilterChip active={readFilter === "all"} onClick={() => setReadFilter("all")}>Todas</FilterChip>
                  <FilterChip active={readFilter === "unread"} onClick={() => setReadFilter("unread")}>Não lidas</FilterChip>
                  <FilterChip active={readFilter === "read"} onClick={() => setReadFilter("read")}>Lidas</FilterChip>
                </div>
              </div>

              {/* Group 2: WhatsApp window */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Janela WhatsApp</p>
                <div className="flex flex-wrap gap-1">
                  <FilterChip active={windowFilter === "all"} onClick={() => setWindowFilter("all")}>Todos</FilterChip>
                  <FilterChip active={windowFilter === "open"} onClick={() => setWindowFilter("open")}>Pode responder</FilterChip>
                  <FilterChip active={windowFilter === "expired"} onClick={() => setWindowFilter("expired")}>Janela expirada</FilterChip>
                </div>
              </div>

              {/* Group 3: Content type */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Tipo de conteúdo</p>
                <div className="flex flex-wrap gap-1">
                  <FilterChip active={mediaFilter === "all"} onClick={() => setMediaFilter("all")}>Todos</FilterChip>
                  <FilterChip active={mediaFilter === "media"} onClick={() => setMediaFilter("media")}>Com mídia</FilterChip>
                  <FilterChip active={mediaFilter === "text"} onClick={() => setMediaFilter("text")}>Só texto</FilterChip>
                </div>
              </div>

              {/* Group 4: Period */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Período</p>
                <div className="flex flex-wrap gap-1">
                  <FilterChip active={dateFilter === "all"} onClick={() => setDateFilter("all")}>Qualquer data</FilterChip>
                  <FilterChip active={dateFilter === "today"} onClick={() => setDateFilter("today")}>Hoje</FilterChip>
                  <FilterChip active={dateFilter === "7d"} onClick={() => setDateFilter("7d")}>7 dias</FilterChip>
                  <FilterChip active={dateFilter === "30d"} onClick={() => setDateFilter("30d")}>30 dias</FilterChip>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => setShowLabels(true)} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Tag className="h-3 w-3" /> Criar etiquetas rápidas
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 h-full">
              <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground">Nenhuma conversa</p>
              <p className="text-xs text-muted-foreground">Conversas aparecerão com interações</p>
            </div>
          ) : (
            filtered.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors",
                  selectedConv?.id === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {getInitials(conv.contact_name || conv.contact_phone)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground truncate">{conv.contact_name || conv.contact_phone}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message || "Sem mensagens"}</p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex gap-1 flex-wrap">
                      {((conv.labels as string[]) || []).slice(0, 2).map((label, i) => (
                        <span key={label} className={cn("text-[10px] px-1.5 py-0.5 rounded border", labelColors[i % labelColors.length])}>
                          {label}
                        </span>
                      ))}
                    </div>
                    {(conv.unread_count || 0) > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 2: Chat */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {getInitials(selectedConv.contact_name || selectedConv.contact_phone)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedConv.contact_name || selectedConv.contact_phone}</p>
                <p className="text-xs text-muted-foreground">{selectedConv.contact_phone}</p>
              </div>
              {orderData && (
                <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary border-primary/30">
                  Pedido: {orderData.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", showInfo ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-background/50">
            {msgLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                </div>
              </div>
            ) : (
              groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-4">
                    <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground font-medium">
                      {formatDateSeparator(group.messages[0].timestamp)}
                    </span>
                  </div>
                  {group.messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-card p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
            {/* Template Selector */}
            {showTemplates && (
              <div className="bg-card border border-border rounded-xl shadow-lg p-3 mb-2 max-h-48 overflow-y-auto">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Templates Aprovados</h4>
                {approvedFlows && approvedFlows.length > 0 ? (
                  approvedFlows.map((flow: any) => {
                    const tmpl = flow.flow_templates?.find((t: any) => t.status === "APPROVED" || t.status === "approved") || flow.flow_templates?.[0];
                    return (
                      <button
                        key={flow.id}
                        onClick={() => selectTemplateFlow(flow)}
                        disabled={sendingTemplate}
                        className="w-full text-left p-2.5 hover:bg-primary/5 rounded-lg text-sm mb-1 transition-colors border border-transparent hover:border-primary/20 disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{flow.name}</span>
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                            Aprovado
                          </Badge>
                        </div>
                        {tmpl && (
                          <span className="text-xs text-muted-foreground mt-0.5 block">
                            {tmpl.template_name} • {tmpl.language || "pt_BR"}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-3">
                    <Layout className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-xs text-muted-foreground">
                      Nenhum template aprovado.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vá em <span className="text-primary font-medium">Fluxos → Enviar para aprovação</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            {showEmojiPicker && (
              <div className="relative">
                <EmojiStickerPicker
                  onSelectEmoji={(emoji) => {
                    setNewMessage(prev => prev + emoji);
                    textareaRef.current?.focus();
                  }}
                  onSelectSticker={(text) => {
                    setNewMessage(text);
                    setShowEmojiPicker(false);
                    setTimeout(() => sendMessage(), 100);
                  }}
                  onSelectGif={async (url) => {
                    setShowEmojiPicker(false);
                    if (!selectedConv || !user) return;
                    setSending(true);
                    try {
                      const { error } = await supabase.functions.invoke("send-whatsapp-message", {
                        body: { conversationId: selectedConv.id, content: "", type: "image", mediaUrl: url },
                      });
                      if (error) throw new Error(error.message);
                    } catch (err: any) {
                      toast.error(err.message || "Falha ao enviar GIF");
                    }
                    setSending(false);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    showEmojiPicker ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setShowTemplates(!showTemplates); setShowEmojiPicker(false); }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    showTemplates ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Usar template"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border bg-input px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 max-h-32"
              />
              <div className="flex items-center gap-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-background/30">
          <div className="rounded-2xl bg-muted/30 p-6 mb-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Selecione uma conversa</h3>
          <p className="text-sm text-muted-foreground">Escolha um contato para visualizar mensagens</p>
        </div>
      )}

      {/* COLUMN 3: Contact Info */}
      {selectedConv && showInfo && (
        <div className="w-[280px] min-w-[280px] border-l border-border bg-card overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações</p>
              <button onClick={() => setShowInfo(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-16 w-16 mb-3">
                <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                  {getInitials(selectedConv.contact_name || selectedConv.contact_phone)}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-foreground">{selectedConv.contact_name || "Contato"}</p>
              <p className="text-xs text-muted-foreground">{selectedConv.contact_phone}</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-4 border-b border-border space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</p>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">{selectedConv.contact_phone}</span>
            </div>
            {leadData?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span className="text-foreground">{leadData.email}</span>
              </div>
            )}
          </div>

          {/* Order */}
          {orderData && (
            <div className="p-4 border-b border-border space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedido Recente</p>
              <div className="rounded-lg border border-border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">#{orderData.order_number || orderData.id.slice(0, 8)}</span>
                  <Badge variant="outline" className="text-[10px]">{orderData.status}</Badge>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(orderData.order_final_price))}
                </p>
              </div>
            </div>
          )}

          {/* Labels */}
          <div className="p-4 border-b border-border space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etiquetas</p>
            <div className="flex flex-wrap gap-1.5">
              {((selectedConv.labels as string[]) || []).map((label, i) => (
                <Badge key={label} variant="outline" className={cn("text-xs gap-1", labelColors[i % labelColors.length])}>
                  {label}
                  <button onClick={() => removeLabel(selectedConv.id, label)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                placeholder="Nova etiqueta..."
                className="h-7 flex-1 rounded border border-border bg-input px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                    addLabel(selectedConv.id, (e.target as HTMLInputElement).value.trim());
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* Lead Tags */}
          {leadData && (
            <div className="p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags do Lead</p>
              <div className="flex flex-wrap gap-1.5">
                {((leadData.tags as string[]) || []).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
                {(!leadData.tags || (leadData.tags as string[]).length === 0) && (
                  <p className="text-xs text-muted-foreground">Sem tags</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Labels CRUD Modal */}
      <Dialog open={showLabels} onOpenChange={setShowLabels}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Etiquetas Rápidas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Adicione etiquetas às conversas para organizar seu atendimento.</p>
            <div className="flex gap-2">
              <input
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
                placeholder="Nome da etiqueta..."
                className="h-9 flex-1 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newLabelName.trim()) {
                    toast.success(`Etiqueta "${newLabelName}" disponível para uso`);
                    setNewLabelName("");
                  }
                }}
                className="bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              {["Urgente", "VIP", "Novo Cliente", "Pendente", "Suporte"].map((label, i) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", i === 0 ? "bg-destructive" : i === 1 ? "bg-warning" : i === 2 ? "bg-success" : i === 3 ? "bg-primary" : "bg-accent")} />
                    <span className="text-sm text-foreground">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Variables Modal */}
      <Dialog open={!!selectedTemplateFlow} onOpenChange={(open) => { if (!open) setSelectedTemplateFlow(null); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Preencher variáveis do template
            </DialogTitle>
          </DialogHeader>
          {selectedTemplateFlow && (() => {
            const tmpl = selectedTemplateFlow.flow_templates?.find((t: any) => t.status === "APPROVED" || t.status === "approved") || selectedTemplateFlow.flow_templates?.[0];
            const bodyComp = (tmpl?.components as any[])?.find((c: any) => c.type === "BODY");
            const bodyText = bodyComp?.text || "";

            let preview = bodyText;
            templateVars.forEach((v, i) => {
              preview = preview.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`);
            });

            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template</p>
                  <p className="text-sm font-medium text-foreground">{selectedTemplateFlow.name}</p>
                  <p className="text-xs text-muted-foreground">{tmpl?.template_name} • {tmpl?.language || "pt_BR"}</p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Pré-visualização</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{preview}</p>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variáveis</p>
                  {templateVars.map((val, idx) => (
                    <div key={idx}>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {`{{${idx + 1}}}`}
                      </label>
                      <input
                        value={val}
                        onChange={e => {
                          const updated = [...templateVars];
                          updated[idx] = e.target.value;
                          setTemplateVars(updated);
                        }}
                        placeholder={`Valor para {{${idx + 1}}}...`}
                        className="h-9 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedTemplateFlow(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-primary-foreground"
                    disabled={sendingTemplate || templateVars.some(v => !v.trim())}
                    onClick={() => sendTemplateMessage(selectedTemplateFlow, templateVars)}
                  >
                    {sendingTemplate ? "Enviando..." : "Enviar Template"}
                    {!sendingTemplate && <Send className="h-4 w-4 ml-1.5" />}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Test Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Enviar Teste
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex rounded-lg bg-muted p-1 gap-1">
            <button
              onClick={() => setTestMode("message")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                testMode === "message"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Send className="h-3.5 w-3.5 inline mr-1.5" />
              Mensagem Avulsa
            </button>
            <button
              onClick={() => setTestMode("flow")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                testMode === "flow"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="h-3.5 w-3.5 inline mr-1.5" />
              Disparar Fluxo
            </button>
          </div>

          <div className="space-y-4 mt-2">
            {/* Phone (shared) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Número (com DDD)</label>
              <input
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="5511999999999"
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {testMode === "message" ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mensagem</label>
                  <textarea
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    placeholder="Digite a mensagem de teste..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground"
                  disabled={!testPhone.trim() || !testMessage.trim() || testSending}
                  onClick={sendTestMessage}
                >
                  {testSending ? "Enviando..." : "Enviar Mensagem"}
                  {!testSending && <Send className="h-4 w-4 ml-1.5" />}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Escolha um fluxo</label>
                  <Select value={testFlowId} onValueChange={setTestFlowId}>
                    <SelectTrigger className="w-full bg-input border-border text-foreground">
                      <SelectValue placeholder="Selecione um fluxo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {userFlows && userFlows.length > 0 ? (
                        userFlows.map(flow => (
                          <SelectItem key={flow.id} value={flow.id}>
                            <span className="flex items-center gap-2">
                              {flow.name}
                              <span className="text-muted-foreground text-[10px]">
                                {flow.message_count || 0} msgs
                              </span>
                            </span>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>Nenhum fluxo ativo</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground"
                  disabled={!testPhone.trim() || !testFlowId || testSending}
                  onClick={triggerTestFlow}
                >
                  {testSending ? "Disparando..." : "Disparar Fluxo"}
                  {!testSending && <Zap className="h-4 w-4 ml-1.5" />}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Conversas;
