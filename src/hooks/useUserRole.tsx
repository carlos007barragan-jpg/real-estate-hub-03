import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = 'admin' | 'agent' | 'marketing_manager' | 'marketing' | 'owner_user';

export const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      const userRole = data?.role as AppRole | null;
      setRole(userRole);
      setIsAdmin(userRole === 'admin');
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsAdmin(false);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, role, loading };
};
