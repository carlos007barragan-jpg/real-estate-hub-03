import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Phone, CheckCircle, XCircle } from "lucide-react";

export function AgentPhoneSetup() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasAgent, setHasAgent] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgentInfo();
  }, []);

  const fetchAgentInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (agent) {
        setHasAgent(true);
        setCurrentAgent(agent);
        setPhoneNumber(agent.phone_number);
        setIsActive(agent.is_active);
      }
    } catch (error) {
      console.error('Error fetching agent info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      if (hasAgent) {
        // Update existing agent
        const { error } = await supabase
          .from('agents')
          .update({
            phone_number: phoneNumber,
            is_active: isActive,
          })
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Agent phone number updated",
        });
      } else {
        // Create new agent
        const { error } = await supabase
          .from('agents')
          .insert({
            user_id: user.id,
            phone_number: phoneNumber,
            is_active: isActive,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Agent phone number registered",
        });
        setHasAgent(true);
      }

      fetchAgentInfo();
    } catch (error: any) {
      console.error('Error saving agent info:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save agent info",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Inbound Call Settings</h3>
          <p className="text-sm text-muted-foreground">
            Register your phone to receive inbound calls
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (with country code)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Format: +[country code][number] (e.g., +12025551234)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="active">Active for inbound calls</Label>
            <p className="text-xs text-muted-foreground">
              Receive calls when new leads contact the CRM
            </p>
          </div>
          <Switch
            id="active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {hasAgent && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${isActive ? 'bg-success/10' : 'bg-muted'}`}>
            {isActive ? (
              <>
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Active - Receiving inbound calls</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Inactive - Not receiving calls</span>
              </>
            )}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Saving...' : hasAgent ? 'Update Phone Number' : 'Register Phone Number'}
        </Button>
      </form>
    </Card>
  );
}
