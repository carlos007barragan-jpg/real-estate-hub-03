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
import { UserPlus } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

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
        .select('user_id, phone_number')
        .eq('is_active', true);

      if (agentsError) throw agentsError;

      // For each agent, we'll use their email from a profiles table or derive from user_id
      // Since we can't call admin.getUserById from client, we'll just use user_id as identifier
      const agentsWithDetails = (agentsData || []).map((agent) => {
        // Use a simple name based on phone number for now
        const name = agent.phone_number.substring(agent.phone_number.length - 4);
        return {
          ...agent,
          email: `agent-${name}@crm.local`,
          name: `Agent ${name}`,
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
    if (!selectedAgent) {
      toast({
        title: "Error",
        description: "Please select an agent",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
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

      setOpen(false);
      setSelectedAgent("");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error forwarding lead:', error);
      toast({
        title: "Error",
        description: "Failed to forward lead",
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
            Select an agent to forward this lead to
            {currentAgent && (
              <span className="block mt-1 text-sm">
                Currently assigned to: <strong>{currentAgent}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleForward} disabled={loading || !selectedAgent}>
            {loading ? 'Forwarding...' : 'Forward Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
