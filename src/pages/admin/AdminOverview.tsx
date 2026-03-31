import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, ShoppingCart, MessageSquare, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";

interface Stats {
  totalSubscribers: number;
  mrr: number;
  ordersToday: number;
  messagesToday: number;
  tokensUsed: number;
}

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalSubscribers: 0,
    mrr: 0,
    ordersToday: 0,
    messagesToday: 0,
    tokensUsed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [profilesRes, ordersRes, messagesRes, tokensRes] = await Promise.all([
        supabase.from("profiles").select("id, subscription_status, plan_id"),
        supabase.from("orders").select("id, created_at").gte("created_at", today),
        supabase.from("messages").select("id, created_at").gte("created_at", today),
        supabase.from("voice_tokens").select("total_used"),
      ]);

      const activeProfiles = profilesRes.data?.filter(
        (p) => p.subscription_status === "active" || p.subscription_status === "trial"
      ) || [];

      // Calculate MRR from plans
      let mrr = 0;
      if (activeProfiles.length > 0) {
        const planIds = [...new Set(activeProfiles.map((p) => p.plan_id).filter(Boolean))];
        if (planIds.length > 0) {
          const { data: plans } = await supabase
            .from("plans")
            .select("id, price_monthly")
            .in("id", planIds);
          const planPriceMap = new Map(plans?.map((p) => [p.id, p.price_monthly]) || []);
          mrr = activeProfiles.reduce((sum, p) => sum + (planPriceMap.get(p.plan_id) || 0), 0);
        }
      }

      const totalTokensUsed = tokensRes.data?.reduce((sum, t) => sum + (t.total_used || 0), 0) || 0;

      setStats({
        totalSubscribers: activeProfiles.length,
        mrr,
        ordersToday: ordersRes.data?.length || 0,
        messagesToday: messagesRes.data?.length || 0,
        tokensUsed: totalTokensUsed,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const cards = [
    { label: "Assinantes Ativos", value: stats.totalSubscribers, icon: Users, color: "text-primary" },
    { label: "MRR", value: `R$ ${stats.mrr.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
    { label: "Pedidos Hoje", value: stats.ordersToday, icon: ShoppingCart, color: "text-primary" },
    { label: "Mensagens Hoje", value: stats.messagesToday, icon: MessageSquare, color: "text-primary" },
    { label: "Tokens Consumidos", value: stats.tokensUsed, icon: Mic, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Overview" subtitle="Visão geral da plataforma ScalaNinja" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <div className="h-8 w-16 animate-pulse rounded bg-muted" /> : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
