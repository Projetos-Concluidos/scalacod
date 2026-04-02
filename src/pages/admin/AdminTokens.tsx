import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import NinjaBadge from "@/components/NinjaBadge";
import { Coins, TrendingUp, Search, DollarSign, ShoppingCart, CheckCircle, Clock, Package, Plus, Pencil, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";

interface TokenRow {
  user_id: string;
  total_purchased: number | null;
  total_used: number | null;
  balance: number | null;
  user_name?: string;
  user_email?: string;
}

interface PurchaseRow {
  id: string;
  user_id: string;
  pack_id: string;
  tokens: number;
  amount: number;
  status: string | null;
  mp_payment_id: string | null;
  created_at: string | null;
  paid_at: string | null;
  user_name?: string;
  user_email?: string;
}

interface TokenPack {
  id: string;
  name: string;
  slug: string;
  tokens: number;
  price: number;
  original_price: number | null;
  is_active: boolean;
  is_popular: boolean;
  badge_type: string | null;
  badge_label: string | null;
  sort_order: number;
}

const packNames: Record<string, string> = {
  starter: "Iniciante",
  essencial: "Essencial",
  profissional: "Profissional",
  enterprise: "Enterprise",
};

const BADGE_OPTIONS = [
  { value: "", label: "Sem badge", color: "" },
  { value: "blackfriday", label: "🖤 Black Friday", color: "bg-black text-yellow-400" },
  { value: "promo", label: "🔥 Promoção", color: "bg-red-600 text-white" },
  { value: "oferta", label: "💰 Em Oferta", color: "bg-emerald-600 text-white" },
  { value: "semana_assinante", label: "🎉 Semana do Assinante", color: "bg-purple-600 text-white" },
];

const AdminTokens = () => {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("");

  // Packs state
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<TokenPack | null>(null);
  const [packForm, setPackForm] = useState({
    name: "", slug: "", tokens: 0, price: 0, original_price: "",
    is_active: true, is_popular: false, badge_type: "", badge_label: "", sort_order: 0,
  });

  // Calculator state
  const [calcApiCost, setCalcApiCost] = useState(0.030);
  const [calcExchange, setCalcExchange] = useState(5.20);
  const [calcGatewayFee, setCalcGatewayFee] = useState(4.99);
  const [calcTokens, setCalcTokens] = useState(10000);

  useEffect(() => {
    fetchTokens();
    fetchPurchases();
    fetchPacks();
  }, []);

  const fetchTokens = async () => {
    const { data: tokenData } = await supabase
      .from("voice_tokens")
      .select("user_id, total_purchased, total_used, balance")
      .order("total_used", { ascending: false })
      .limit(200);

    if (tokenData && tokenData.length > 0) {
      const userIds = tokenData.map((t) => t.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setTokens(tokenData.map((t) => ({
        ...t,
        user_name: profileMap.get(t.user_id)?.name || "—",
        user_email: profileMap.get(t.user_id)?.email || "—",
      })));
    } else {
      setTokens([]);
    }
    setLoading(false);
  };

  const fetchPurchases = async () => {
    const { data: purchaseData } = await supabase
      .from("token_purchases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (purchaseData && purchaseData.length > 0) {
      const userIds = [...new Set(purchaseData.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setPurchases(purchaseData.map((p) => ({
        ...p,
        user_name: profileMap.get(p.user_id)?.name || "—",
        user_email: profileMap.get(p.user_id)?.email || "—",
      })));
    } else {
      setPurchases([]);
    }
    setPurchasesLoading(false);
  };

  const fetchPacks = async () => {
    setPacksLoading(true);
    const { data } = await supabase
      .from("token_packs")
      .select("*")
      .order("sort_order", { ascending: true });
    setPacks((data as TokenPack[]) || []);
    setPacksLoading(false);
  };

  // Sales metrics
  const totalRevenue = purchases.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalSales = purchases.length;
  const paidSales = purchases.filter(p => p.status === "paid").length;
  const pendingSales = purchases.filter(p => p.status === "pending").length;

  // Consumption metrics
  const totalPurchased = tokens.reduce((s, t) => s + (t.total_purchased || 0), 0);
  const totalUsed = tokens.reduce((s, t) => s + (t.total_used || 0), 0);

  const filteredTokens = tokens.filter(
    (t) =>
      !search ||
      t.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPurchases = purchases.filter((p) => {
    if (salesFilter && p.status !== salesFilter) return false;
    if (salesSearch && !p.user_name?.toLowerCase().includes(salesSearch.toLowerCase()) && !p.user_email?.toLowerCase().includes(salesSearch.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "paid": return <NinjaBadge variant="success">✅ Pago</NinjaBadge>;
      case "pending": return <NinjaBadge variant="warning">⏳ Pendente</NinjaBadge>;
      case "failed": return <NinjaBadge variant="danger">❌ Falhou</NinjaBadge>;
      case "refunded": return <NinjaBadge variant="info">↩️ Estornado</NinjaBadge>;
      default: return <NinjaBadge variant="default">{status || "—"}</NinjaBadge>;
    }
  };

  const openNewPack = () => {
    setEditingPack(null);
    setPackForm({ name: "", slug: "", tokens: 0, price: 0, original_price: "", is_active: true, is_popular: false, badge_type: "", badge_label: "", sort_order: packs.length + 1 });
    setPackModalOpen(true);
  };

  const openEditPack = (pack: TokenPack) => {
    setEditingPack(pack);
    setPackForm({
      name: pack.name, slug: pack.slug, tokens: pack.tokens, price: Number(pack.price),
      original_price: pack.original_price ? String(pack.original_price) : "",
      is_active: pack.is_active, is_popular: pack.is_popular,
      badge_type: pack.badge_type || "", badge_label: pack.badge_label || "",
      sort_order: pack.sort_order,
    });
    setPackModalOpen(true);
  };

  const handleSavePack = async () => {
    if (!packForm.name || !packForm.slug || !packForm.tokens || !packForm.price) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const payload = {
      name: packForm.name,
      slug: packForm.slug,
      tokens: packForm.tokens,
      price: packForm.price,
      original_price: packForm.original_price ? Number(packForm.original_price) : null,
      is_active: packForm.is_active,
      is_popular: packForm.is_popular,
      badge_type: packForm.badge_type || null,
      badge_label: packForm.badge_label || null,
      sort_order: packForm.sort_order,
    };

    if (editingPack) {
      const { error } = await supabase.from("token_packs").update(payload).eq("id", editingPack.id);
      if (error) { toast.error("Erro ao atualizar pack"); return; }
      toast.success("Pack atualizado!");
    } else {
      const { error } = await supabase.from("token_packs").insert(payload);
      if (error) { toast.error(error.message.includes("duplicate") ? "Slug já existe" : "Erro ao criar pack"); return; }
      toast.success("Pack criado!");
    }
    setPackModalOpen(false);
    fetchPacks();
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pack?")) return;
    await supabase.from("token_packs").delete().eq("id", id);
    toast.success("Pack excluído");
    fetchPacks();
  };

  const costPerToken = (price: number, tokens: number) => {
    if (!tokens) return "—";
    return `R$ ${(price / tokens).toFixed(5).replace(".", ",")}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tokens de Voz" subtitle="Vendas, receita, consumo e gerenciamento de packs" />

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList>
          <TabsTrigger value="vendas">💰 Vendas</TabsTrigger>
          <TabsTrigger value="consumo">📊 Consumo</TabsTrigger>
          <TabsTrigger value="packs">📦 Packs</TabsTrigger>
        </TabsList>

        {/* ══════ VENDAS TAB ══════ */}
        <TabsContent value="vendas" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
                <ShoppingCart className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalSales}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Pagas</CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-success">{paidSales}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-warning">{pendingSales}</div></CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={salesSearch} onChange={(e) => setSalesSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={salesFilter} onChange={e => setSalesFilter(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
              <option value="">Todos status</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
              <option value="refunded">Estornado</option>
            </select>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID Pagamento</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchasesLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filteredPurchases.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
                ) : filteredPurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.user_name}</p>
                        <p className="text-xs text-muted-foreground">{p.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{packNames[p.pack_id] || p.pack_id}</TableCell>
                    <TableCell className="text-sm font-medium">{p.tokens.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-sm font-medium">R$ {p.amount.toFixed(2)}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{p.mp_payment_id || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ══════ CONSUMO TAB ══════ */}
        <TabsContent value="consumo" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Adquirido</CardTitle>
                <Coins className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalPurchased.toLocaleString("pt-BR")}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Consumido</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalUsed.toLocaleString("pt-BR")}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Uso</CardTitle>
                <Coins className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalPurchased > 0 ? ((totalUsed / totalPurchased) * 100).toFixed(1) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Adquirido</TableHead>
                  <TableHead>Usados</TableHead>
                  <TableHead>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filteredTokens.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                ) : filteredTokens.map((t) => (
                  <TableRow key={t.user_id}>
                    <TableCell className="font-medium">{t.user_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.user_email}</TableCell>
                    <TableCell>{(t.total_purchased || 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{(t.total_used || 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-semibold">{(t.balance || 0).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ══════ PACKS TAB ══════ */}
        <TabsContent value="packs" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gerencie os packs de tokens disponíveis para compra</p>
            <Button onClick={openNewPack} className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> Novo Pack
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Preço Original</TableHead>
                  <TableHead>Custo/Token</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packsLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : packs.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum pack cadastrado</TableCell></TableRow>
                ) : packs.map((pack) => {
                  const badge = BADGE_OPTIONS.find(b => b.value === pack.badge_type);
                  return (
                    <TableRow key={pack.id}>
                      <TableCell className="font-medium">{pack.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{pack.slug}</TableCell>
                      <TableCell>{pack.tokens.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">R$ {Number(pack.price).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {pack.original_price ? `R$ ${Number(pack.original_price).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{costPerToken(Number(pack.price), pack.tokens)}</TableCell>
                      <TableCell>
                        {badge && badge.value ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>
                            {pack.badge_label || badge.label}
                          </span>
                        ) : pack.is_popular ? (
                          <NinjaBadge variant="success">⭐ Popular</NinjaBadge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <NinjaBadge variant={pack.is_active ? "success" : "danger"}>
                          {pack.is_active ? "Ativo" : "Inativo"}
                        </NinjaBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditPack(pack)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeletePack(pack.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Pack Modal */}
      <Dialog open={packModalOpen} onOpenChange={setPackModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingPack ? "Editar Pack" : "Novo Pack"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input value={packForm.name} onChange={e => setPackForm(f => ({ ...f, name: e.target.value }))} placeholder="Pack Iniciante" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug *</Label>
                <Input value={packForm.slug} onChange={e => setPackForm(f => ({ ...f, slug: e.target.value }))} placeholder="starter" disabled={!!editingPack} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Tokens *</Label>
                <Input type="number" value={packForm.tokens || ""} onChange={e => setPackForm(f => ({ ...f, tokens: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço (R$) *</Label>
                <Input type="number" step="0.01" value={packForm.price || ""} onChange={e => setPackForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço Original (R$)</Label>
                <Input type="number" step="0.01" value={packForm.original_price} onChange={e => setPackForm(f => ({ ...f, original_price: e.target.value }))} placeholder="Riscado" />
              </div>
            </div>
            {packForm.tokens > 0 && packForm.price > 0 && (
              <p className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
                💡 Custo por token: <strong>R$ {(packForm.price / packForm.tokens).toFixed(5).replace(".", ",")}</strong>
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={packForm.sort_order} onChange={e => setPackForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="space-y-3 pt-5">
                <div className="flex items-center gap-2">
                  <Switch checked={packForm.is_active} onCheckedChange={v => setPackForm(f => ({ ...f, is_active: v }))} />
                  <Label className="text-xs">Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={packForm.is_popular} onCheckedChange={v => setPackForm(f => ({ ...f, is_popular: v }))} />
                  <Label className="text-xs">Popular</Label>
                </div>
              </div>
            </div>

            {/* Badge selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Badge Promocional</Label>
              <div className="flex flex-wrap gap-2">
                {BADGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPackForm(f => ({ ...f, badge_type: opt.value }))}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                      packForm.badge_type === opt.value
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border"
                    } ${opt.color || "bg-muted text-foreground"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {packForm.badge_type && (
                <Input
                  value={packForm.badge_label}
                  onChange={e => setPackForm(f => ({ ...f, badge_label: e.target.value }))}
                  placeholder="Texto personalizado do badge (opcional)"
                  className="text-xs"
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setPackModalOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSavePack} className="flex-1 gradient-primary text-primary-foreground">
                {editingPack ? "Salvar" : "Criar Pack"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTokens;
