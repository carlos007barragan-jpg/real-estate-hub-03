import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CompleteProfileModal } from "./CompleteProfileModal";

interface ProtectedRouteProps {
  children: React.ReactNode;
  loginPath?: string;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { session, loading, profileComplete, profileChecking, refreshProfile } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login");
    }
  }, [session, loading, navigate]);

  const handleProfileComplete = async () => {
    await refreshProfile();
    window.location.reload();
  };

  if (loading || profileChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      {!profileComplete && session.user && (
        <CompleteProfileModal
          userId={session.user.id}
          email={session.user.email || ""}
          onComplete={handleProfileComplete}
        />
      )}
      {children}
    </>
  );
};
