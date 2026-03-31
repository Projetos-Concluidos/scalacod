import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Invoice {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  amount: number;
  status: string | null;
  due_date: string | null;
  paid_at: string | null;
  mp_payment_id: string | null;
  created_at: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  paid: { label: "💚 Paga", variant: "default" },
  failed: { label: "🔴 Falhou", variant: "destructive" },
  pending: { label: "🟡 Pendente", variant: "secondary" },
  refunded: { label: "🔵 Reembolsada", variant: "outline" },
};

const AdminCobrancas = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      let query = supabase.from("subscription_invoices").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter !== "all") query = query.eq("status", filter);
      const { data } = await query;
      setInvoices((data || []) as Invoice[]);
      setLoading(false);
    };
    fetch();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Cobranças" subtitle="Histórico de pagamentos de assinatura" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
            <SelectItem value="refunded">Reembolsadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Pagamento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Pago em</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : invoices.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma cobrança encontrada</TableCell></TableRow>
            ) : invoices.map((inv) => {
              const sc = statusConfig[inv.status || "pending"] || statusConfig.pending;
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.mp_payment_id || "—"}</TableCell>
                  <TableCell>R$ {Number(inv.amount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                  <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>{inv.created_at ? new Date(inv.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminCobrancas;
