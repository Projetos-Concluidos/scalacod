import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get auth user from request
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find invite by token
    const { data: invite, error: invErr } = await supabase
      .from("team_invites")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (invErr || !invite) {
      return new Response(JSON.stringify({ error: "Convite não encontrado ou já utilizado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Convite expirado" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("owner_id", invite.owner_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Você já é membro desta equipe" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create team member
    const { error: memberErr } = await supabase.from("team_members").insert({
      owner_id: invite.owner_id,
      user_id: user.id,
      role: invite.role,
    });

    if (memberErr) {
      console.error("[team-invite] memberErr:", memberErr);
      return new Response(JSON.stringify({ error: "Erro ao adicionar membro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark invite as accepted
    await supabase.from("team_invites").update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    }).eq("id", invite.id);

    // Audit log
    await supabase.from("team_audit_logs").insert({
      owner_id: invite.owner_id,
      actor_id: user.id,
      actor_email: user.email,
      action: "accept_invite",
      resource_type: "team_invite",
      resource_id: invite.id,
      metadata: { role: invite.role },
    });

    return new Response(JSON.stringify({ success: true, role: invite.role }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[team-invite] error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
