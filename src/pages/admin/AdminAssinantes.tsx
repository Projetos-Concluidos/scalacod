import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Ban, Coins, Edit, Unlock } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  token_balance: number | null;
  created_at: string | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
}

const AdminAssinantes = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Token modal
  const [tokenModal, setTokenModal] = useState<{ open: boolean; tenant: Tenant | null }>({ open: false, tenant: null });
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenReason, setTokenReason] = useState("");

  // Plan modal
  const [planModal, setPlanModal] = useState<{ open: boolean; tenant: Tenant | null }>({ open: false, tenant: null });
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const fetchTenants = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, plan, plan_id, subscription_status, token_balance, created_at")
      .order("created_at", { ascending: false });
    setTenants(data || []);
    setLoading(false);
  };

  const fetchPlans = async () => {
    const { data } = await supabase.from("plans").select("id, name, slug").eq("is_active", true).order("sort_order");
    setPlans(data || []);
  };

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const handleAddTokens = async () => {
    if (!tokenModal.tenant || !tokenAmount) return;
    const { error } = await supabase.rpc("admin_add_tokens", {
      p_user_id: tokenModal.tenant.id,
      p_amount: parseInt(tokenAmount),
      p_reason: tokenReason || "Admin credit",
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${tokenAmount} tokens creditados para ${tokenModal.tenant.name}`);
      setTokenModal({ open: false, tenant: null });
      setTokenAmount("");
      setTokenReason("");
      fetchTenants();
    }
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

  return (
    <div className="space-y-6">
      <PageHeader title="Assinantes" subtitle="Gerenciar todos os tenants da plataforma" />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum assinante encontrado</TableCell>
              </TableRow>
            ) : (
              tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell className="capitalize">{t.plan || "free"}</TableCell>
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
                        title="Adicionar tokens"
                        onClick={() => setTokenModal({ open: true, tenant: t })}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Tokens</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Assinante: <strong>{tokenModal.tenant?.email}</strong></p>
            <div className="space-y-2">
              <Label>Quantidade de tokens</Label>
              <Input type="number" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} placeholder="1000" />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={tokenReason} onChange={(e) => setTokenReason(e.target.value)} placeholder="Bônus promocional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenModal({ open: false, tenant: null })}>Cancelar</Button>
            <Button onClick={handleAddTokens} disabled={!tokenAmount}>Confirmar Crédito</Button>
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
            <p className="text-sm text-muted-foreground">Assinante: <strong>{planModal.tenant?.email}</strong></p>
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
