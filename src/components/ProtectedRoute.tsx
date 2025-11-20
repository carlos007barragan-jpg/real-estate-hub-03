import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { CompleteProfileModal } from "./CompleteProfileModal";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
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
      if (!session?.user) {
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
          // No profile exists, show modal
          setShowProfileModal(true);
          setCheckingProfile(false);
          return;
        }

        // Check if profile is complete
        const isComplete = profile.first_name && 
                          profile.last_name && 
                          profile.phone_number && 
                          profile.email;

        if (!isComplete) {
          // Profile exists but incomplete, show modal
          setShowProfileModal(true);
          setCheckingProfile(false);
          return;
        }

        setShowProfileModal(false);
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
  }, [session, loading]);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login");
    }
  }, [session, loading, navigate]);

  const handleProfileComplete = async () => {
    console.log("Profile completion callback triggered");
    setShowProfileModal(false);
    setCheckingProfile(true);
    
    // Wait a moment for state to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify profile was created
    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      console.log("Profile verification after completion:", profile);
      
      if (profile) {
        console.log("Profile verified, reloading page");
        window.location.reload();
      } else {
        console.error("Profile not found after completion");
        toast.error("Profile creation failed. Please try again.");
        setShowProfileModal(true);
      }
    }
    
    setCheckingProfile(false);
  };

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

  return (
    <>
      {showProfileModal && session.user && (
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
