import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TeamContext {
  /** The user_id to use in queries — owner_id if member, own id if owner */
  effectiveUserId: string | null;
  /** The team role if user is a member (admin, operator, viewer), null if owner */
  teamRole: string | null;
  /** Whether this user is a team member (not the owner) */
  isTeamMember: boolean;
  /** Whether still loading */
  loading: boolean;
  /** Helpers */
  canEdit: boolean;
  canDelete: boolean;
  isViewer: boolean;
}

export const useTeamContext = (): TeamContext => {
  const { user } = useAuth();
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEffectiveUserId(null);
      setTeamRole(null);
      setLoading(false);
      return;
    }

    const fetchTeamMembership = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("team_members")
        .select("owner_id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setEffectiveUserId(data.owner_id);
        setTeamRole(data.role);
      } else {
        setEffectiveUserId(user.id);
        setTeamRole(null);
      }
      setLoading(false);
    };

    fetchTeamMembership();
  }, [user]);

  const isTeamMember = teamRole !== null;
  const canEdit = !isTeamMember || teamRole === "admin" || teamRole === "operator";
  const canDelete = !isTeamMember || teamRole === "admin";
  const isViewer = teamRole === "viewer";

  return { effectiveUserId, teamRole, isTeamMember, loading, canEdit, canDelete, isViewer };
};
