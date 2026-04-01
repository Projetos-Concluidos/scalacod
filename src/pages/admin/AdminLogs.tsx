import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  admin_email?: string;
  target_email?: string;
}

const actionLabels: Record<string, { label: string; color: "default" | "secondary" | "destructive" | "outline" }> = {
  add_tokens: { label: "Crédito Tokens", color: "default" },
  update_plan: { label: "Alteração Plano", color: "secondary" },
  block_user: { label: "Bloqueio", color: "destructive" },
  unblock_user: { label: "Desbloqueio", color: "outline" },
};

const AdminLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("admin_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        // Collect unique user IDs
        const userIds = new Set<string>();
        data.forEach((log) => {
          userIds.add(log.admin_id);
          if (log.target_user_id) userIds.add(log.target_user_id);
        });

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", Array.from(userIds));

        const emailMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

        const enriched = data.map((log) => ({
          ...log,
          admin_email: emailMap.get(log.admin_id) || log.admin_id.slice(0, 8) + "...",
          target_email: log.target_user_id ? emailMap.get(log.target_user_id) || log.target_user_id.slice(0, 8) + "..." : "—",
        }));
        setLogs(enriched as LogEntry[]);
      } else {
        setLogs([]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Logs do Sistema" subtitle="Ações administrativas recentes" />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ação</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell></TableRow>
            ) : logs.map((log) => {
              const ac = actionLabels[log.action] || { label: log.action, color: "outline" as const };
              return (
                <TableRow key={log.id}>
                  <TableCell><Badge variant={ac.color}>{ac.label}</Badge></TableCell>
                  <TableCell className="text-sm">{log.admin_email}</TableCell>
                  <TableCell className="text-sm">{log.target_email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminLogs;
