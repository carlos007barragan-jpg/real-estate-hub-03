import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Phone, ShieldAlert, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const RoundRobinSettings = () => {
  const [autoRoundRobin, setAutoRoundRobin] = useState(false);
  const [smartRouting, setSmartRouting] = useState(true);
  const [fallbackPhone1, setFallbackPhone1] = useState("");
  const [fallbackPhone2, setFallbackPhone2] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { role: contextRole, roleLoading } = useAuth();
  
  const [freshRole, setFreshRole] = useState<string | null>(null);
  useEffect(() => {
    const fetchFreshRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setFreshRole(data.role);
    };
    fetchFreshRole();
  }, []);

  const effectiveRole = freshRole || contextRole;
  const isSupremeAdmin = effectiveRole === 'supreme_admin';
  const isLocked = !roleLoading && !isSupremeAdmin;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('crm_settings')
        .select('auto_roundrobin_unanswered, smart_routing_enabled, fallback_phone_1, fallback_phone_2')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
      }

      if (data) {
        setAutoRoundRobin(data.auto_roundrobin_unanswered);
        setSmartRouting((data as any).smart_routing_enabled ?? true);
        setFallbackPhone1(data.fallback_phone_1 || "");
        setFallbackPhone2(data.fallback_phone_2 || "");
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field: string, value: boolean, label: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('crm_settings').select('id, user_id').limit(1).maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('crm_settings').update({ [field]: value }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_settings').insert({ user_id: user.id, [field]: value });
        if (error) throw error;
      }

      toast({ title: "Settings Updated", description: `${label} ${value ? 'enabled' : 'disabled'}` });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  };

  const handleRoundRobinToggle = (checked: boolean) => {
    setAutoRoundRobin(checked);
    updateSetting('auto_roundrobin_unanswered', checked, 'Auto Round-Robin');
  };

  const handleSmartRoutingToggle = (checked: boolean) => {
    setSmartRouting(checked);
    updateSetting('smart_routing_enabled', checked, 'Smart Routing');
  };

  const handleSavePhoneNumbers = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('crm_settings').select('id, user_id').limit(1).maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('crm_settings')
          .update({ fallback_phone_1: fallbackPhone1 || null, fallback_phone_2: fallbackPhone2 || null })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_settings')
          .insert({ user_id: user.id, fallback_phone_1: fallbackPhone1 || null, fallback_phone_2: fallbackPhone2 || null });
        if (error) throw error;
      }

      toast({ title: "Phone Numbers Saved", description: "Fallback numbers updated" });
    } catch (error: any) {
      console.error('Error saving phone numbers:', error);
      toast({ title: "Error", description: "Failed to save phone numbers", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Call Routing Settings</h2>
        {isLocked && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>Supreme Admin only</span>
          </div>
        )}
      </div>
      <div className="space-y-6 max-w-2xl">
        {/* Auto Round-Robin Toggle */}
        <div className="flex items-center justify-between py-4 border-b">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="auto-roundrobin" className="text-base font-medium cursor-pointer">
                Auto Round-Robin
              </Label>
              <p className="text-sm text-muted-foreground">
                Ring all active agents simultaneously for unassigned callers. If OFF, calls go straight to fallback numbers.
              </p>
            </div>
          </div>
          <Switch
            id="auto-roundrobin"
            checked={autoRoundRobin}
            onCheckedChange={handleRoundRobinToggle}
            disabled={isLocked}
          />
        </div>

        {/* Smart Routing Toggle */}
        <div className="flex items-center justify-between py-4 border-b">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="smart-routing" className="text-base font-medium cursor-pointer">
                Smart Routing
              </Label>
              <p className="text-sm text-muted-foreground">
                Check if caller has an assigned agent and route directly to them. If OFF, all inbound calls ring all agents.
              </p>
            </div>
          </div>
          <Switch
            id="smart-routing"
            checked={smartRouting}
            onCheckedChange={handleSmartRoutingToggle}
            disabled={isLocked}
          />
        </div>

        {/* Fallback Phone Numbers */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-base font-medium">Fallback Phone Numbers</h3>
              <p className="text-sm text-muted-foreground">
                These numbers ring if no agent picks up within 30 seconds
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fallback-phone-1">Phone Number 1</Label>
            <Input
              id="fallback-phone-1"
              type="tel"
              placeholder="+1234567890"
              value={fallbackPhone1}
              onChange={(e) => setFallbackPhone1(e.target.value)}
              disabled={isLocked}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fallback-phone-2">Phone Number 2</Label>
            <Input
              id="fallback-phone-2"
              type="tel"
              placeholder="+1234567890"
              value={fallbackPhone2}
              onChange={(e) => setFallbackPhone2(e.target.value)}
              disabled={isLocked}
            />
          </div>

          {!isLocked && (
            <Button onClick={handleSavePhoneNumbers} disabled={saving} className="mt-4">
              {saving ? "Saving..." : "Save Phone Numbers"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
