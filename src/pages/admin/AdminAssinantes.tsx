import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Ban, Coins, Edit, Unlock, Search, Plus, Minus, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  token_balance: number | null;
  created_at: string | null;
  store_name: string | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
}

interface TokenLog {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

const AdminAssinantes = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Token modal
  const [tokenModal, setTokenModal] = useState<{ open: boolean; tenant: Tenant | null }>({ open: false, tenant: null });
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenReason, setTokenReason] = useState("");
  const [tokenOperation, setTokenOperation] = useState<"credit" | "debit">("credit");
  const [tokenType, setTokenType] = useState("bonus");
  const [tokenLogs, setTokenLogs] = useState<TokenLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Plan modal
  const [planModal, setPlanModal] = useState<{ open: boolean; tenant: Tenant | null }>({ open: false, tenant: null });
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const planMap = useMemo(() => {
    const map: Record<string, string> = {};
    plans.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [plans]);

  const fetchTenants = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, plan, plan_id, subscription_status, token_balance, created_at, store_name")
      .order("created_at", { ascending: false });
    setTenants(data || []);
    setLoading(false);
  };

  const fetchPlans = async () => {
    const { data } = await supabase.from("plans").select("id, name, slug").eq("is_active", true).order("sort_order");
    setPlans(data || []);
  };

  const fetchTokenLogs = async (userId: string) => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("admin_action_logs")
      .select("id, action, metadata, created_at")
      .eq("target_user_id", userId)
      .in("action", ["add_tokens", "remove_tokens"])
      .order("created_at", { ascending: false })
      .limit(50);
    setTokenLogs((data as TokenLog[]) || []);
    setLoadingLogs(false);
  };

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const openTokenModal = (tenant: Tenant) => {
    setTokenModal({ open: true, tenant });
    setTokenAmount("");
    setTokenReason("");
    setTokenOperation("credit");
    setTokenType("bonus");
    fetchTokenLogs(tenant.id);
  };

  const handleTokenSubmit = async () => {
    if (!tokenModal.tenant || !tokenAmount) return;
    const amount = parseInt(tokenAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Quantidade inválida"); return; }

    const reason = `[${tokenType}] ${tokenReason || "Sem motivo"}`;

    if (tokenOperation === "credit") {
      const { error } = await supabase.rpc("admin_add_tokens", {
        p_user_id: tokenModal.tenant.id,
        p_amount: amount,
        p_reason: reason,
      });
      if (error) { toast.error(error.message); return; }
      toast.success(`+${amount} tokens creditados para ${tokenModal.tenant.name}`);
    } else {
      const { error } = await supabase.rpc("admin_remove_tokens", {
        p_user_id: tokenModal.tenant.id,
        p_amount: amount,
        p_reason: reason,
      });
      if (error) { toast.error(error.message); return; }
      toast.success(`-${amount} tokens debitados de ${tokenModal.tenant.name}`);
    }

    setTokenModal({ open: false, tenant: null });
    fetchTenants();
  };

  const handleUpdatePlan = async () => {
    if (!planModal.tenant || !selectedPlanId) return;
    const { error } = await supabase.rpc("admin_update_user_plan", {
      p_user_id: planModal.tenant.id,
      p_plan_id: selectedPlanId,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Plano atualizado com sucesso");
      setPlanModal({ open: false, tenant: null });
      setSelectedPlanId("");
      fetchTenants();
    }
  };

  const handleBlock = async (tenant: Tenant, block: boolean) => {
    const { error } = await supabase.rpc("admin_block_user", {
      p_user_id: tenant.id,
      p_block: block,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(block ? "Usuário bloqueado" : "Usuário desbloqueado");
      fetchTenants();
    }
  };

  const statusColor = (s: string | null) => {
    if (s === "active") return "default";
    if (s === "trial") return "secondary";
    if (s === "cancelled") return "destructive";
    return "outline";
  };

  const getPlanDisplay = (t: Tenant) => {
    if (t.plan_id && planMap[t.plan_id]) return planMap[t.plan_id];
    return t.plan || "free";
  };

  const filtered = tenants.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.store_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (t.subscription_status || "inactive") === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Assinantes" subtitle={`${tenants.length} tenants cadastrados`} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou loja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum assinante encontrado</TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm">{t.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.store_name || "—"}</TableCell>
                  <TableCell className="capitalize">{getPlanDisplay(t)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor(t.subscription_status)}>
                      {t.subscription_status || "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.token_balance || 0}</TableCell>
                  <TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar plano"
                        onClick={() => { setPlanModal({ open: true, tenant: t }); setSelectedPlanId(t.plan_id || ""); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Gerenciar tokens"
                        onClick={() => openTokenModal(t)}
                      >
                        <Coins className="h-4 w-4" />
                      </Button>
                      {t.subscription_status === "inactive" ? (
                        <Button size="icon" variant="ghost" title="Desbloquear" onClick={() => handleBlock(t, false)}>
                          <Unlock className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" title="Bloquear" onClick={() => handleBlock(t, true)}>
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Token Modal */}
      <Dialog open={tokenModal.open} onOpenChange={(v) => setTokenModal({ open: v, tenant: v ? tokenModal.tenant : null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Tokens</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
              <div>
                <p className="text-sm font-medium">{tokenModal.tenant?.name}</p>
                <p className="text-xs text-muted-foreground">{tokenModal.tenant?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo atual</p>
                <p className="text-lg font-bold">{tokenModal.tenant?.token_balance || 0}</p>
              </div>
            </div>

            <Tabs value={tokenOperation} onValueChange={(v) => setTokenOperation(v as "credit" | "debit")}>
              <TabsList className="w-full">
                <TabsTrigger value="credit" className="flex-1 gap-1">
                  <Plus className="h-3 w-3" /> Creditar
                </TabsTrigger>
                <TabsTrigger value="debit" className="flex-1 gap-1">
                  <Minus className="h-3 w-3" /> Debitar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="credit" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade</Label>
                    <Input type="number" min="1" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} placeholder="1000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={tokenType} onValueChange={setTokenType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bonus">Bônus</SelectItem>
                        <SelectItem value="correcao">Correção</SelectItem>
                        <SelectItem value="compra_manual">Compra manual</SelectItem>
                        <SelectItem value="estorno">Estorno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Motivo</Label>
                  <Input value={tokenReason} onChange={(e) => setTokenReason(e.target.value)} placeholder="Bônus promocional" />
                </div>
              </TabsContent>

              <TabsContent value="debit" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade</Label>
                    <Input type="number" min="1" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} placeholder="500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={tokenType} onValueChange={setTokenType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="correcao">Correção</SelectItem>
                        <SelectItem value="estorno">Estorno</SelectItem>
                        <SelectItem value="ajuste">Ajuste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Motivo</Label>
                  <Input value={tokenReason} onChange={(e) => setTokenReason(e.target.value)} placeholder="Correção de saldo" />
                </div>
              </TabsContent>
            </Tabs>

            {/* Histórico */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <History className="h-3 w-3" /> Histórico de operações
              </div>
              <ScrollArea className="h-36 rounded-md border">
                {loadingLogs ? (
                  <p className="text-xs text-muted-foreground p-3">Carregando...</p>
                ) : tokenLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">Nenhuma operação registrada</p>
                ) : (
                  <div className="divide-y">
                    {tokenLogs.map((log) => {
                      const isCredit = log.action === "add_tokens";
                      const amount = (log.metadata as Record<string, unknown>)?.amount as number;
                      const reason = (log.metadata as Record<string, unknown>)?.reason as string;
                      return (
                        <div key={log.id} className="flex items-center justify-between px-3 py-2 text-xs">
                          <div>
                            <span className={isCredit ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                              {isCredit ? "+" : "−"}{amount || "?"}
                            </span>
                            <span className="ml-2 text-muted-foreground">{reason || "—"}</span>
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {log.created_at ? new Date(log.created_at).toLocaleDateString("pt-BR") : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenModal({ open: false, tenant: null })}>Cancelar</Button>
            <Button
              onClick={handleTokenSubmit}
              disabled={!tokenAmount}
              variant={tokenOperation === "debit" ? "destructive" : "default"}
            >
              {tokenOperation === "credit" ? "Confirmar Crédito" : "Confirmar Débito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Modal */}
      <Dialog open={planModal.open} onOpenChange={(v) => setPlanModal({ open: v, tenant: v ? planModal.tenant : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Assinante: <strong>{planModal.tenant?.name}</strong> ({planModal.tenant?.email})</p>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanModal({ open: false, tenant: null })}>Cancelar</Button>
            <Button onClick={handleUpdatePlan} disabled={!selectedPlanId}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAssinantes;
