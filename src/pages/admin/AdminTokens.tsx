import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, TrendingUp } from "lucide-react";

interface TokenRow {
  user_id: string;
  total_purchased: number | null;
  total_used: number | null;
  balance: number | null;
}

const AdminTokens = () => {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("voice_tokens")
        .select("user_id, total_purchased, total_used, balance")
        .order("total_used", { ascending: false })
        .limit(50);
      setTokens((data || []) as TokenRow[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalPurchased = tokens.reduce((s, t) => s + (t.total_purchased || 0), 0);
  const totalUsed = tokens.reduce((s, t) => s + (t.total_used || 0), 0);

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

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Comprados</TableHead>
              <TableHead>Usados</TableHead>
              <TableHead>Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : tokens.map((t) => (
              <TableRow key={t.user_id}>
                <TableCell className="font-mono text-xs">{t.user_id.slice(0, 8)}...</TableCell>
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
