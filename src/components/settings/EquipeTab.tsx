import { useState, useEffect } from "react";
import { Users, UserPlus, Send, Trash2, History, Loader2, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TeamRoleBadge from "@/components/TeamRoleBadge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profile?: { name: string; email: string };
}

interface AuditLog {
  id: string;
  actor_email: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  invite_member: "Convidou membro",
  revoke_invite: "Revogou convite",
  remove_member: "Removeu membro",
  change_role: "Alterou papel",
  accept_invite: "Aceitou convite",
  view_order: "Visualizou pedido",
  update_status: "Atualizou status",
};

const EquipeTab = () => {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);

  const LOGS_PER_PAGE = 20;

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [invitesRes, membersRes, logsRes] = await Promise.all([
        supabase.from("team_invites").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("team_members").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("team_audit_logs").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).range(0, LOGS_PER_PAGE - 1),
      ]);

      setInvites((invitesRes.data as Invite[]) || []);

      // Load profiles for members
      const membersData = (membersRes.data || []) as Member[];
      if (membersData.length > 0) {
        const userIds = membersData.map((m) => m.user_id);
        const { data: profiles } = await supabase.from("profiles").select("id, name, email").in("id", userIds);
        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        membersData.forEach((m) => {
          m.profile = profileMap.get(m.user_id) as { name: string; email: string } | undefined;
        });
      }
      setMembers(membersData);
      setAuditLogs((logsRes.data as AuditLog[]) || []);
      setHasMoreLogs((logsRes.data?.length || 0) >= LOGS_PER_PAGE);
      setLogsPage(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSendInvite = async () => {
    if (!user || !inviteEmail.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("team_invites").insert({
        owner_id: user.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      if (error) throw error;

      // Log audit
      await supabase.from("team_audit_logs").insert({
        owner_id: user.id,
        actor_id: user.id,
        actor_email: user.email,
        action: "invite_member",
        resource_type: "team_invite",
        metadata: { email: inviteEmail.trim(), role: inviteRole },
      });

      toast.success("Convite criado com sucesso!");
      setInviteEmail("");
      setInviteRole("viewer");
      loadData();
    } catch (err: unknown) {
      toast.error("Erro ao criar convite");
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!user) return;
    await supabase.from("team_invites").update({ status: "revoked" }).eq("id", id);
    await supabase.from("team_audit_logs").insert({
      owner_id: user.id,
      actor_id: user.id,
      actor_email: user.email,
      action: "revoke_invite",
      resource_type: "team_invite",
      resource_id: id,
    });
    toast.success("Convite revogado");
    loadData();
  };

  const handleRemoveMember = async (member: Member) => {
    if (!user) return;
    await supabase.from("team_members").delete().eq("id", member.id);
    await supabase.from("team_audit_logs").insert({
      owner_id: user.id,
      actor_id: user.id,
      actor_email: user.email,
      action: "remove_member",
      resource_type: "team_member",
      resource_id: member.id,
      metadata: { removed_email: member.profile?.email },
    });
    toast.success("Membro removido");
    loadData();
  };

  const handleChangeRole = async (member: Member, newRole: string) => {
    if (!user) return;
    await supabase.from("team_members").update({ role: newRole }).eq("id", member.id);
    await supabase.from("team_audit_logs").insert({
      owner_id: user.id,
      actor_id: user.id,
      actor_email: user.email,
      action: "change_role",
      resource_type: "team_member",
      resource_id: member.id,
      metadata: { from: member.role, to: newRole, email: member.profile?.email },
    });
    toast.success("Papel atualizado");
    loadData();
  };

  const loadMoreLogs = async () => {
    if (!user) return;
    const nextPage = logsPage + 1;
    const from = nextPage * LOGS_PER_PAGE;
    const { data } = await supabase
      .from("team_audit_logs")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, from + LOGS_PER_PAGE - 1);
    const newLogs = (data as AuditLog[]) || [];
    setAuditLogs((prev) => [...prev, ...newLogs]);
    setLogsPage(nextPage);
    setHasMoreLogs(newLogs.length >= LOGS_PER_PAGE);
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const fmtDate = (d: string) => {
    try {
      return format(new Date(d), "dd/MM/yy HH:mm", { locale: ptBR });
    } catch {
      return d;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      {/* Convidar Membro */}
      <div className="ninja-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Convidar Membro</h2>
            <p className="text-xs text-muted-foreground">Convide membros para sua equipe com diferentes níveis de acesso</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
            <Input
              type="email"
              placeholder="membro@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Papel</label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSendInvite} disabled={sending || !inviteEmail.trim()} className="gradient-primary text-primary-foreground">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Convite
          </Button>
        </div>
      </div>

      {/* Convites Pendentes */}
      {pendingInvites.length > 0 && (
        <div className="ninja-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Send className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Convites Pendentes</h2>
              <p className="text-xs text-muted-foreground">{pendingInvites.length} convite(s) aguardando aceitação</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell><TeamRoleBadge role={inv.role} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.expires_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)} title="Copiar link">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRevokeInvite(inv.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Membros Ativos */}
      <div className="ninja-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Membros da Equipe</h2>
              <p className="text-xs text-muted-foreground">{members.length + 1} membro(s) na equipe</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Owner row */}
            <TableRow>
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{user?.user_metadata?.name || "Você"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </TableCell>
              <TableCell><TeamRoleBadge role="owner" /></TableCell>
              <TableCell className="text-sm text-muted-foreground">—</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">Proprietário</TableCell>
            </TableRow>

            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{m.profile?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{m.profile?.email || "—"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={m.role} onValueChange={(v) => handleChangeRole(m, v)}>
                    <SelectTrigger className="w-36">
                      <TeamRoleBadge role={m.role} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operator">Operador</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(m.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Logs de Auditoria */}
      <div className="ninja-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <History className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Logs de Auditoria</h2>
            <p className="text-xs text-muted-foreground">Registro de todas as ações realizadas pela equipe</p>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum log de auditoria ainda.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Membro</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Recurso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(log.created_at)}</TableCell>
                    <TableCell className="text-sm">{log.actor_email || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{ACTION_LABELS[log.action] || log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.resource_type && <span>{log.resource_type}{log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ""}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasMoreLogs && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={loadMoreLogs}>
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EquipeTab;
