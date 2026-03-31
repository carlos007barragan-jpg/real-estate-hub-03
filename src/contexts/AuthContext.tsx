import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = 'admin' | 'agent' | 'marketing_manager' | 'marketing' | 'owner_user' | 'supreme_admin';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  role: AppRole | null;
  roleLoading: boolean;
  profileComplete: boolean;
  profileChecking: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  isAdmin: false,
  role: null,
  roleLoading: true,
  profileComplete: false,
  profileChecking: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileChecking, setProfileChecking] = useState(true);

  const isAdmin = role === 'admin' || role === 'supreme_admin';

  const checkRoleAndProfile = useCallback(async (userId: string) => {
    try {
      // Fetch role and profile in parallel
      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('first_name, last_name, phone_number, email')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      const userRole = roleResult.data?.role as AppRole | null;
      console.log('[AuthContext] Role query result:', roleResult.data, 'error:', roleResult.error, 'resolved role:', userRole);
      setRole(userRole);

      const profile = profileResult.data;
      const isComplete = !!(profile?.first_name && profile?.last_name && profile?.phone_number && profile?.email);
      setProfileComplete(isComplete);
    } catch (error) {
      console.error('Error checking role/profile:', error);
      setRole(null);
      setProfileComplete(false);
    } finally {
      setRoleLoading(false);
      setProfileChecking(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      setProfileChecking(true);
      await checkRoleAndProfile(session.user.id);
    }
  }, [session, checkRoleAndProfile]);

  // Heartbeat: update last_active_at every 60 seconds while logged in
  useEffect(() => {
    if (!session?.user) return;

    const updatePresence = () => {
      supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .then(({ error }) => {
          if (error) console.error('Presence heartbeat error:', error);
        });
    };

    // Update immediately on login
    updatePresence();
    const interval = setInterval(updatePresence, 60_000);

    return () => clearInterval(interval);
  }, [session?.user?.id]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkRoleAndProfile(session.user.id);
      } else {
        setRoleLoading(false);
        setProfileChecking(false);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          checkRoleAndProfile(session.user.id);
        } else {
          setRole(null);
          setProfileComplete(false);
          setRoleLoading(false);
          setProfileChecking(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [checkRoleAndProfile]);

  return (
    <AuthContext.Provider value={{
      session,
      loading,
      isAdmin,
      role,
      roleLoading,
      profileComplete,
      profileChecking,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
