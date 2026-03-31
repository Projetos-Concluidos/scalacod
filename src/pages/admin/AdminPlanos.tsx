import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Edit, Plus } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  trial_days: number | null;
  sort_order: number | null;
  limits: Json;
  mp_plan_id: string | null;
}

const defaultLimits = {
  checkouts: 3,
  orders_per_month: 100,
  leads: 500,
  flows: 5,
  campaigns_per_month: 2,
  whatsapp_instances: 1,
  voice_tokens_included: 0,
  team_members: 1,
  api_access: false,
  custom_domain: false,
  advanced_analytics: false,
  priority_support: false,
};

const AdminPlanos = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });
  const [form, setForm] = useState({
    name: "",
    slug: "",
    price_monthly: "",
    price_yearly: "",
    trial_days: "7",
    mp_plan_id: "",
    is_featured: false,
    limits: { ...defaultLimits },
  });

  const fetchPlans = async () => {
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setPlans((data || []) as Plan[]);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const openEdit = (plan: Plan) => {
    const limits = typeof plan.limits === "object" && plan.limits !== null ? plan.limits : defaultLimits;
    setForm({
      name: plan.name,
      slug: plan.slug,
      price_monthly: String(plan.price_monthly),
      price_yearly: plan.price_yearly ? String(plan.price_yearly) : "",
      trial_days: String(plan.trial_days || 7),
      mp_plan_id: plan.mp_plan_id || "",
      is_featured: plan.is_featured || false,
      limits: { ...defaultLimits, ...(limits as Record<string, unknown>) } as typeof defaultLimits,
    });
    setModal({ open: true, plan });
  };

  const openNew = () => {
    setForm({
      name: "",
      slug: "",
      price_monthly: "",
      price_yearly: "",
      trial_days: "7",
      mp_plan_id: "",
      is_featured: false,
      limits: { ...defaultLimits },
    });
    setModal({ open: true, plan: null });
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      slug: form.slug,
      price_monthly: parseFloat(form.price_monthly),
      price_yearly: form.price_yearly ? parseFloat(form.price_yearly) : null,
      trial_days: parseInt(form.trial_days),
      mp_plan_id: form.mp_plan_id || null,
      is_featured: form.is_featured,
      limits: form.limits as unknown as Json,
    };

    if (modal.plan) {
      const { error } = await supabase.from("plans").update(payload).eq("id", modal.plan.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Plano atualizado");
    } else {
      const { error } = await supabase.from("plans").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Plano criado");
    }
    setModal({ open: false, plan: null });
    fetchPlans();
  };

  const toggleActive = async (plan: Plan) => {
    await supabase.from("plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
    fetchPlans();
  };

  const setLimit = (key: string, value: string | boolean) => {
    setForm((f) => ({
      ...f,
      limits: { ...f.limits, [key]: typeof value === "string" ? (isNaN(Number(value)) ? value : Number(value)) : value },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Planos" subtitle="Gerenciar planos de assinatura" />
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Plano</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Preço Mensal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Destaque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                <TableCell>R$ {Number(p.price_monthly).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleActive(p)}>
                    {p.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>{p.is_featured ? "⭐" : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Modal */}
      <Dialog open={modal.open} onOpenChange={(v) => setModal({ open: v, plan: v ? modal.plan : null })}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modal.plan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Mensal (R$)</Label>
                <Input type="number" value={form.price_monthly} onChange={(e) => setForm((f) => ({ ...f, price_monthly: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Preço Anual (R$)</Label>
                <Input type="number" value={form.price_yearly} onChange={(e) => setForm((f) => ({ ...f, price_yearly: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dias de Trial</Label>
                <Input type="number" value={form.trial_days} onChange={(e) => setForm((f) => ({ ...f, trial_days: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>MP Plan ID</Label>
                <Input value={form.mp_plan_id} onChange={(e) => setForm((f) => ({ ...f, mp_plan_id: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} />
              <Label>Destaque no pricing</Label>
            </div>

            <h4 className="pt-2 text-sm font-semibold">Limites</h4>
            <div className="grid grid-cols-2 gap-3">
              {(["checkouts", "orders_per_month", "leads", "flows", "campaigns_per_month", "whatsapp_instances", "voice_tokens_included", "team_members"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                  <Input
                    type="number"
                    value={String((form.limits as Record<string, unknown>)[key] ?? 0)}
                    onChange={(e) => setLimit(key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <h4 className="pt-2 text-sm font-semibold">Features</h4>
            <div className="grid grid-cols-2 gap-3">
              {(["api_access", "custom_domain", "advanced_analytics", "priority_support"] as const).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={Boolean((form.limits as Record<string, unknown>)[key])}
                    onCheckedChange={(v) => setLimit(key, v)}
                  />
                  <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal({ open: false, plan: null })}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.slug || !form.price_monthly}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlanos;
