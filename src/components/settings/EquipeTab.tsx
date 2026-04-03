import { useState, useEffect, useMemo } from "react";
import { Users, UserPlus, Send, Trash2, History, Loader2, Copy, RefreshCw, Shield, Eye, Wrench, Crown, Power, RotateCw, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
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
  updated_at: string | null;
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
  toggle_active: "Ativou/desativou membro",
  resend_invite: "Reenviou convite",
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["Ver pedidos", "Editar pedidos", "Ver leads", "Editar leads", "Ver conversas", "Ver fluxos", "Ver checkouts", "Gerenciar equipe"],
  operator: ["Ver pedidos", "Editar pedidos", "Ver leads", "Editar leads", "Ver conversas", "Ver fluxos", "Ver checkouts"],
  viewer: ["Ver pedidos", "Ver leads", "Ver conversas"],
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
  const [logSearch, setLogSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("all");

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

  useEffect(() => { loadData(); }, [user]);

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

      await supabase.from("team_audit_logs").insert({
        owner_id: user.id, actor_id: user.id, actor_email: user.email,
        action: "invite_member", resource_type: "team_invite",
        metadata: { email: inviteEmail.trim(), role: inviteRole },
      });

      toast.success("Convite criado com sucesso!");
      setInviteEmail("");
      setInviteRole("viewer");
      loadData();
    } catch {
      toast.error("Erro ao criar convite");
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!user) return;
    await supabase.from("team_invites").update({ status: "revoked" }).eq("id", id);
    await supabase.from("team_audit_logs").insert({
      owner_id: user.id, actor_id: user.id, actor_email: user.email,
      action: "revoke_invite", resource_type: "team_invite", resource_id: id,
    });
    toast.success("Convite revogado");
    loadData();
  };

  const handleResendInvite = async (invite: Invite) => {
    if (!user) return;
    // Revoke old and create new
    await supabase.from("team_invites").update({ status: "revoked" }).eq("id", invite.id);
    const { data, error } = await supabase.from("team_invites").insert({
      owner_id: user.id, email: invite.email, role: invite.role,
    }).select().single();
    if (error) { toast.error("Erro ao reenviar"); return; }

    await supabase.from("team_audit_logs").insert({
      owner_id: user.id, actor_id: user.id, actor_email: user.email,
      action: "resend_invite", resource_type: "team_invite",
      metadata: { email: invite.email, role: invite.role },
    });
    toast.success("Novo convite criado!");
    loadData();
  };

  const handleRemoveMember = async (member: Member) => {
    if (!user) return;
    await supabase.from("team_members").delete().eq("id", member.id);
    await supabase.from("team_audit_logs").insert({
      owner_id: user.id, actor_id: user.id, actor_email: user.email,
      action: "remove_member", resource_type: "team_member", resource_id: member.id,
      metadata: { removed_email: member.profile?.email },
    });
    toast.success("Membro removido");
    loadData();
  };

  const handleToggleActive = async (member: Member) => {
    if (!user) return;
    const newState = !member.is_active;
    await supabase.from("team_members").update({ is_active: newState }).eq("id", member.id);
    await supabase.from("team_audit_logs").insert({
      owner_id: user.id, actor_id: user.id, actor_email: user.email,
      action: "toggle_active", resource_type: "team_member", resource_id: member.id,
      metadata: { email: member.profile?.email, active: newState },
    });
    toast.success(newState ? "Membro ativado" : "Membro desativado");
    loadData();
  };

  const handleChangeRole = async (member: Member, newRole: string) => {
    if (!user) return;
    await supabase.from("team_members").update({ role: newRole }).eq("id", member.id);
    await supabase.from("team_audit_logs").insert({
      owner_id: user.id, actor_id: user.id, actor_email: user.email,
      action: "change_role", resource_type: "team_member", resource_id: member.id,
      metadata: { from: member.role, to: newRole, email: member.profile?.email },
    });
    toast.success("Papel atualizado");
    loadData();
  };

  const loadMoreLogs = async () => {
    if (!user) return;
    const nextPage = logsPage + 1;
    const from = nextPage * LOGS_PER_PAGE;
    const { data } = await supabase.from("team_audit_logs").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).range(from, from + LOGS_PER_PAGE - 1);
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
    try { return format(new Date(d), "dd/MM/yy HH:mm", { locale: ptBR }); } catch { return d; }
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  const filteredLogs = useMemo(() => {
    let result = auditLogs;
    if (logSearch) {
      const s = logSearch.toLowerCase();
      result = result.filter(l => l.actor_email?.toLowerCase().includes(s) || l.action.toLowerCase().includes(s));
    }
    if (logActionFilter !== "all") {
      result = result.filter(l => l.action === logActionFilter);
    }
    return result;
  }, [auditLogs, logSearch, logActionFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <TooltipProvider>
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

          {/* Role permissions info */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["admin", "operator", "viewer"] as const).map((role) => (
              <div key={role} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TeamRoleBadge role={role} />
                </div>
                <ul className="space-y-1">
                  {ROLE_PERMISSIONS[role].map((perm) => (
                    <li key={perm} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
              <Input type="email" placeholder="membro@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="w-full sm:w-44">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Papel</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => {
                  const expired = isExpired(inv.expires_at);
                  return (
                    <TableRow key={inv.id} className={expired ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell><TeamRoleBadge role={inv.role} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.expires_at)}</TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-xs">Expirado</Badge>
                        ) : (
                          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning text-xs">Aguardando</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar link</TooltipContent>
                          </Tooltip>
                          {expired && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleResendInvite(inv)} className="text-primary hover:text-primary">
                                  <RotateCw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reenviar convite</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleRevokeInvite(inv.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revogar convite</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Membros da Equipe */}
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
                <TableHead>Status</TableHead>
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
                <TableCell>
                  <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs">Ativo</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">—</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">Proprietário</TableCell>
              </TableRow>

              {members.map((m) => (
                <TableRow key={m.id} className={!m.is_active ? "opacity-50" : ""}>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={m.is_active} onCheckedChange={() => handleToggleActive(m)} />
                      <span className="text-xs text-muted-foreground">{m.is_active ? "Ativo" : "Inativo"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(m.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remover membro</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Logs de Auditoria */}
        <div className="ninja-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Logs de Auditoria</h2>
                <p className="text-xs text-muted-foreground">Registro de todas as ações realizadas pela equipe</p>
              </div>
            </div>
          </div>

          {/* Log filters */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Buscar por membro ou ação..."
                className="pl-9"
              />
            </div>
            <Select value={logActionFilter} onValueChange={setLogActionFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum log de auditoria encontrado.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Membro</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(log.created_at)}</TableCell>
                      <TableCell className="text-sm">{log.actor_email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <Tooltip>
                            <TooltipTrigger className="underline decoration-dotted cursor-help">
                              {log.resource_type ? `${log.resource_type}` : "ver detalhes"}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                            </TooltipContent>
                          </Tooltip>
                        )}
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
    </TooltipProvider>
  );
};

export default EquipeTab;
