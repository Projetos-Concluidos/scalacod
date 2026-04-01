import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Coins, TrendingUp, Search } from "lucide-react";

interface TokenRow {
  user_id: string;
  total_purchased: number | null;
  total_used: number | null;
  balance: number | null;
  user_name?: string;
  user_email?: string;
}

const AdminTokens = () => {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data: tokenData } = await supabase
        .from("voice_tokens")
        .select("user_id, total_purchased, total_used, balance")
        .order("total_used", { ascending: false })
        .limit(100);

      if (tokenData && tokenData.length > 0) {
        const userIds = tokenData.map((t) => t.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        const enriched = tokenData.map((t) => ({
          ...t,
          user_name: profileMap.get(t.user_id)?.name || "—",
          user_email: profileMap.get(t.user_id)?.email || "—",
        }));
        setTokens(enriched);
      } else {
        setTokens([]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const totalPurchased = tokens.reduce((s, t) => s + (t.total_purchased || 0), 0);
  const totalUsed = tokens.reduce((s, t) => s + (t.total_used || 0), 0);

  const filtered = tokens.filter(
    (t) =>
      !search ||
      t.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Tokens de Voz" subtitle="Visão geral do consumo de tokens" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Comprados</CardTitle>
            <Coins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalPurchased.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Consumidos</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalUsed.toLocaleString()}</div></CardContent>
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
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Comprados</TableHead>
              <TableHead>Usados</TableHead>
              <TableHead>Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
            ) : filtered.map((t) => (
              <TableRow key={t.user_id}>
                <TableCell className="font-medium">{t.user_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.user_email}</TableCell>
                <TableCell>{(t.total_purchased || 0).toLocaleString()}</TableCell>
                <TableCell>{(t.total_used || 0).toLocaleString()}</TableCell>
                <TableCell>{(t.balance || 0).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminTokens;
