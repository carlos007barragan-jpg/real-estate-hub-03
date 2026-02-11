import { useAuth } from "@/contexts/AuthContext";

type AppRole = 'admin' | 'agent' | 'marketing_manager' | 'marketing' | 'owner_user';

export const useUserRole = () => {
  const { isAdmin, role, roleLoading } = useAuth();
  return { isAdmin, role: role as AppRole | null, loading: roleLoading };
};
