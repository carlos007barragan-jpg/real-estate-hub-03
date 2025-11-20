import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check profile completeness when session is available
  useEffect(() => {
    const checkProfile = async () => {
      if (!session?.user || location.pathname === "/complete-profile") {
        setCheckingProfile(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!profile) {
          // No profile exists, redirect to complete profile
          navigate("/complete-profile");
          return;
        }

        // Check if profile is complete
        const isComplete = profile.first_name && 
                          profile.last_name && 
                          profile.phone_number && 
                          profile.email;

        if (!isComplete) {
          // Profile exists but incomplete
          navigate("/complete-profile");
          return;
        }

        setCheckingProfile(false);
      } catch (error) {
        console.error("Error checking profile:", error);
        setCheckingProfile(false);
      }
    };

    if (!loading && session) {
      checkProfile();
    } else {
      setCheckingProfile(false);
    }
  }, [session, loading, navigate, location.pathname]);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login");
    }
  }, [session, loading, navigate]);

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
};
