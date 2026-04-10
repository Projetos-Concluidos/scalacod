import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageSquare, Send, Clock, CheckCircle2, AlertCircle, Filter,
  ChevronDown, User, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  is_admin: boolean;
  content: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const categoryLabels: Record<string, string> = {
  geral: "Geral",
  bug: "Bug",
  duvida: "Dúvida",
  financeiro: "Financeiro",
  sugestao: "Sugestão",
};

const AdminTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase.from("support_tickets" as any).select("*").order("created_at", { ascending: false });
    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    const { data } = await query;
    
    if (data && data.length > 0) {
      // Fetch user profiles for all tickets
      const userIds = [...new Set((data as any[]).map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const enriched = (data as any[]).map((t: any) => ({
        ...t,
        user_email: profileMap.get(t.user_id)?.email || "—",
        user_name: profileMap.get(t.user_id)?.name || "—",
      }));
      setTickets(enriched);
    } else {
      setTickets([]);
    }
    setLoading(false);
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const { data } = await supabase
      .from("support_messages" as any)
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages((data as any[]) || []);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket || !user) return;
    setSending(true);
    try {
      await supabase.from("support_messages" as any).insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        is_admin: true,
        content: reply.trim(),
      } as any);

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === "open") {
        await supabase
          .from("support_tickets" as any)
          .update({ status: "in_progress" } as any)
          .eq("id", selectedTicket.id);
        setSelectedTicket({ ...selectedTicket, status: "in_progress" });
      }

      // Notify user about the reply
      await supabase.from("notifications").insert({
        user_id: selectedTicket.user_id,
        title: `Resposta no ticket: ${selectedTicket.subject}`,
        body: reply.trim().slice(0, 100),
        type: "info",
        metadata: { ticket_id: selectedTicket.id },
      });

      setReply("");
      openTicket(selectedTicket);
      toast.success("Resposta enviada!");
    } catch {
      toast.error("Erro ao enviar resposta");
    }
    setSending(false);
  };

  const updateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;
    await supabase
      .from("support_tickets" as any)
      .update({ status } as any)
      .eq("id", selectedTicket.id);
    setSelectedTicket({ ...selectedTicket, status });
    fetchTickets();
    toast.success(`Ticket marcado como ${statusLabels[status]}`);
  };

  const getSLAStatus = (createdAt: string, status: string) => {
    if (status === "resolved" || status === "closed") return null;
    const diff = Date.now() - new Date(createdAt).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours > 1) return { label: "SLA excedido", color: "text-destructive" };
    return { label: `${Math.round(60 - (hours * 60))}min restantes`, color: "text-amber-500" };
  };

  return (
    <div className="py-6">
      <PageHeader
        title="Tickets de Suporte 🎫"
        subtitle={`${tickets.length} ticket(s) — gerencie o suporte aos assinantes`}
      />

      <div className="flex items-center gap-3 mt-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="closed">Fechados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum ticket encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const sla = getSLAStatus(ticket.created_at, ticket.status);
            return (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-card-foreground truncate">{ticket.subject}</h3>
                    <Badge variant="outline" className={statusColors[ticket.status]}>
                      {statusLabels[ticket.status]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[ticket.category] || ticket.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{ticket.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.user_name} ({ticket.user_email})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    {sla && (
                      <span className={`text-xs font-medium flex items-center gap-1 ${sla.color}`}>
                        <Clock className="h-3 w-3" />
                        {sla.label}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTicket.subject}
                  <Badge variant="outline" className={statusColors[selectedTicket.status]}>
                    {statusLabels[selectedTicket.status]}
                  </Badge>
                </DialogTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{selectedTicket.user_name} — {selectedTicket.user_email}</span>
                  <span>{format(new Date(selectedTicket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  <Badge variant="outline" className="text-xs">{priorityLabels[selectedTicket.priority]}</Badge>
                </div>
              </DialogHeader>

              {/* Original description */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground">
                <p className="text-xs font-medium text-muted-foreground mb-1">Descrição original:</p>
                {selectedTicket.description}
              </div>

              {/* Messages */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg text-sm ${
                      msg.is_admin
                        ? "bg-primary/10 border border-primary/20 ml-8"
                        : "bg-muted/50 mr-8"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {msg.is_admin ? "🛡️ Admin" : "👤 Assinante"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>

              {/* Reply area */}
              {selectedTicket.status !== "closed" && (
                <div className="space-y-3 border-t border-border pt-3">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escreva sua resposta..."
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={sendReply} disabled={sending || !reply.trim()} size="sm">
                      <Send className="h-4 w-4 mr-1" />
                      {sending ? "Enviando..." : "Responder"}
                    </Button>
                    {selectedTicket.status !== "resolved" && (
                      <Button variant="outline" size="sm" onClick={() => updateTicketStatus("resolved")}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Resolver
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => updateTicketStatus("closed")} className="text-muted-foreground">
                      <X className="h-4 w-4 mr-1" />
                      Fechar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTickets;
