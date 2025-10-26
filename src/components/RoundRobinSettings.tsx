import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const RoundRobinSettings = () => {
  const [autoRoundRobin, setAutoRoundRobin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('crm_settings')
        .select('auto_roundrobin_unanswered')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setAutoRoundRobin(data.auto_roundrobin_unanswered);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setAutoRoundRobin(checked);

      // Check if settings exist
      const { data: existing } = await supabase
        .from('crm_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('crm_settings')
          .update({ auto_roundrobin_unanswered: checked })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('crm_settings')
          .insert({ user_id: user.id, auto_roundrobin_unanswered: checked });

        if (error) throw error;
      }

      toast({
        title: "Settings Updated",
        description: `Auto round-robin for unanswered calls ${checked ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      setAutoRoundRobin(!checked); // Revert on error
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">Round Robin Settings</h2>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="auto-roundrobin" className="text-base font-medium cursor-pointer">
                Auto Round-Robin Unanswered Calls
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign unanswered inbound calls to agents using round-robin
              </p>
            </div>
          </div>
          <Switch
            id="auto-roundrobin"
            checked={autoRoundRobin}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>
    </Card>
  );
};
