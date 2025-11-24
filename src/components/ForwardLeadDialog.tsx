import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, RefreshCw } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface Agent {
  user_id: string;
  phone_number: string;
  email: string;
  name: string;
}

interface ForwardLeadDialogProps {
  leadId: string;
  currentAgent?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ForwardLeadDialog({ leadId, currentAgent, onSuccess, trigger }: ForwardLeadDialogProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [forwardType, setForwardType] = useState<'agent' | 'roundrobin'>('agent');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open]);

  const fetchAgents = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          user_id,
          phone_number,
          profiles!inner(first_name, last_name)
        `)
        .eq('is_active', true);

      if (agentsError) throw agentsError;

      // Map agents with their profile names
      const agentsWithDetails = (agentsData || []).map((agent: any) => {
        const fullName = `${agent.profiles.first_name || ''} ${agent.profiles.last_name || ''}`.trim();
        return {
          user_id: agent.user_id,
          phone_number: agent.phone_number,
          email: '', // Not needed for display
          name: fullName || 'Unknown Agent',
        };
      });

      setAgents(agentsWithDetails);
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    }
  };

  const handleForward = async () => {
    setLoading(true);

    try {
      if (forwardType === 'roundrobin') {
        // Round-robin assignment
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get or create settings
        let { data: settings } = await supabase
          .from('crm_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!settings) {
          const { data: newSettings, error: settingsError } = await supabase
            .from('crm_settings')
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (settingsError) throw settingsError;
          settings = newSettings;
        }

        // Get active agents
        const { data: activeAgents, error: agentsError } = await supabase
          .from('agents')
          .select('user_id, phone_number')
          .eq('is_active', true);

        if (agentsError) throw agentsError;
        if (!activeAgents || activeAgents.length === 0) {
          throw new Error("No active agents available");
        }

        // Get profiles for these agents
        const userIds = activeAgents.map(a => a.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Map profiles to agents
        const agentsWithProfiles = activeAgents.map(agent => ({
          ...agent,
          profile: profiles?.find(p => p.user_id === agent.user_id) || null
        }));

        // Get next agent
        const nextIndex = settings.last_assigned_agent_index % agentsWithProfiles.length;
        const nextAgent = agentsWithProfiles[nextIndex];
        const agentName = nextAgent.profile 
          ? `${nextAgent.profile.first_name || ''} ${nextAgent.profile.last_name || ''}`.trim() || 'Unknown Agent'
          : 'Unknown Agent';

        // Update lead
        const { error: updateError } = await supabase
          .from('leads')
          .update({ 
            assigned_to: agentName,
            agent_phone: nextAgent.phone_number,
          })
          .eq('id', leadId);

        if (updateError) throw updateError;

        // Update round-robin index
        await supabase
          .from('crm_settings')
          .update({ last_assigned_agent_index: nextIndex + 1 })
          .eq('user_id', user.id);

        toast({
          title: "Success",
          description: `Lead assigned via round-robin`,
        });
      } else {
        // Direct agent assignment
        if (!selectedAgent) {
          toast({
            title: "Error",
            description: "Please select an agent",
            variant: "destructive",
          });
          return;
        }

        const selectedAgentData = agents.find(a => a.user_id === selectedAgent);
        
        const { error } = await supabase
          .from('leads')
          .update({ 
            assigned_to: selectedAgentData?.name || 'Agent',
            agent_phone: selectedAgentData?.phone_number,
          })
          .eq('id', leadId);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Lead forwarded to ${selectedAgentData?.name}`,
        });
      }

      setOpen(false);
      setSelectedAgent("");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error forwarding lead:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to forward lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Forward
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forward Lead to Agent</DialogTitle>
          <DialogDescription>
            {isAdmin ? "Choose to forward to a specific agent or use round-robin" : "Select an agent to forward this lead to"}
            {currentAgent && (
              <span className="block mt-1 text-sm">
                Currently assigned to: <strong>{currentAgent}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                variant={forwardType === 'agent' ? 'default' : 'outline'}
                onClick={() => setForwardType('agent')}
                className="flex-1 gap-2"
                type="button"
              >
                <UserPlus className="h-4 w-4" />
                Specific Agent
              </Button>
              <Button
                variant={forwardType === 'roundrobin' ? 'default' : 'outline'}
                onClick={() => setForwardType('roundrobin')}
                className="flex-1 gap-2"
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
                Round Robin
              </Button>
            </div>
          )}

          {forwardType === 'agent' && (
            <div className="space-y-2">
              <Label htmlFor="agent">Select Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger id="agent">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No active agents found
                    </SelectItem>
                  ) : (
                    agents.map((agent) => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        {agent.name} ({agent.phone_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {forwardType === 'roundrobin' && isAdmin && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                The lead will be automatically assigned to the next available agent in rotation.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleForward} 
            disabled={loading || (forwardType === 'agent' && !selectedAgent)}
          >
            {loading ? 'Forwarding...' : 'Forward Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
