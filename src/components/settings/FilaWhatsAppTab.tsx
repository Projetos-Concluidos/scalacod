import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, Trash2, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  processing: "bg-primary/10 text-primary border-primary/20",
  sent: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  sent: "Enviado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const FilaWhatsAppTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: messages = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["message-queue", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("message_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("clear-message-queue");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data.deleted || 0} mensagens pendentes removidas!`);
      queryClient.invalidateQueries({ queryKey: ["message-queue"] });
    },
    onError: () => toast.error("Erro ao limpar fila"),
  });

  const pendingCount = messages.filter((m) => m.status === "pending").length;
  const sentCount = messages.filter((m) => m.status === "sent").length;
  const failedCount = messages.filter((m) => m.status === "failed").length;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return d;
    }
  };

  const formatPhone = (p: string) => {
    if (!p) return "-";
    const clean = p.replace(/\D/g, "");
    if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    return p;
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pendentes", value: pendingCount, icon: Clock, color: "text-warning" },
          { label: "Enviados", value: sentCount, icon: CheckCircle, color: "text-success" },
          { label: "Falhas", value: failedCount, icon: XCircle, color: "text-destructive" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="ninja-card flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40 bg-input text-sm">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={pendingCount === 0 || clearMutation.isPending}>
              <Trash2 className="h-4 w-4" />
              Limpar Fila ({pendingCount})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar fila de mensagens?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso removerá todas as {pendingCount} mensagens pendentes. Mensagens já enviadas ou com falha não serão afetadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => clearMutation.mutate()}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Table */}
      <div className="ninja-card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-muted-foreground">
            <MessageSquare className="h-8 w-8" />
            <p className="text-sm">Nenhuma mensagem na fila</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead className="w-[160px]">Telefone</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px] text-center">Tentativas</TableHead>
                <TableHead className="w-[200px]">Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatPhone(msg.phone)}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs" title={msg.message}>
                    {msg.message.substring(0, 80)}{msg.message.length > 80 ? "..." : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[msg.status] || ""}`}>
                      {STATUS_LABELS[msg.status] || msg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs">{msg.retry_count}/{msg.max_retries}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-destructive" title={msg.error_message || ""}>
                    {msg.error_message || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default FilaWhatsAppTab;
