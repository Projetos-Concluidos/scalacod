import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile?.role !== "superadmin") {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, loading, navigate]);

  if (loading || profile?.role !== "superadmin") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
