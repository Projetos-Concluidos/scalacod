import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NinjaBadge from "@/components/NinjaBadge";
import { Coins, TrendingUp, Search, DollarSign, ShoppingCart, CheckCircle, Clock } from "lucide-react";

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

const packNames: Record<string, string> = {
  starter: "Iniciante",
  essencial: "Essencial",
  profissional: "Profissional",
  enterprise: "Enterprise",
};

const AdminTokens = () => {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("");

  useEffect(() => {
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

    fetchTokens();
    fetchPurchases();
  }, []);

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
      case "failed": return <NinjaBadge variant="destructive">❌ Falhou</NinjaBadge>;
      case "refunded": return <NinjaBadge variant="info">↩️ Estornado</NinjaBadge>;
      default: return <NinjaBadge variant="default">{status || "—"}</NinjaBadge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tokens de Voz" subtitle="Vendas, receita e consumo de tokens da plataforma" />

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList>
          <TabsTrigger value="vendas">💰 Vendas</TabsTrigger>
          <TabsTrigger value="consumo">📊 Consumo</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default AdminTokens;
