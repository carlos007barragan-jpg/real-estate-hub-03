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
import { useToast } from "@/hooks/use-toast";
import { UserPlus, RefreshCw } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { MultiAgentSelect } from "@/components/MultiAgentSelect";

interface ForwardLeadDialogProps {
  leadId: string;
  currentAgent?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ForwardLeadDialog({ leadId, currentAgent, onSuccess, trigger }: ForwardLeadDialogProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [forwardType, setForwardType] = useState<'agent' | 'roundrobin'>('agent');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  const handleForward = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (forwardType === 'roundrobin') {
        // Round-robin assignment
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

        // Clear existing assignments and add new one
        await supabase.from('lead_assignments').delete().eq('lead_id', leadId);
        await supabase.from('lead_assignments').insert({
          lead_id: leadId,
          user_id: nextAgent.user_id,
          assigned_by: user.id,
        });

        // Update round-robin index
        await supabase
          .from('crm_settings')
          .update({ last_assigned_agent_index: nextIndex + 1 })
          .eq('user_id', user.id);

        toast({
          title: "Success",
          description: `Lead assigned via round-robin to ${agentName}`,
        });
      } else {
        // Direct multi-agent assignment
        if (selectedAgents.length === 0) {
          toast({
            title: "Error",
            description: "Please select at least one team member",
            variant: "destructive",
          });
          return;
        }

        // Get profiles for selected agents
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone_number')
          .in('user_id', selectedAgents);

        const firstAgent = profiles?.find(p => p.user_id === selectedAgents[0]);
        const firstAgentName = firstAgent 
          ? `${firstAgent.first_name || ''} ${firstAgent.last_name || ''}`.trim() 
          : 'Agent';

        // Update lead with first assigned agent for legacy field
        const { error: updateError } = await supabase
          .from('leads')
          .update({ 
            assigned_to: firstAgentName,
            agent_phone: firstAgent?.phone_number || null,
          })
          .eq('id', leadId);

        if (updateError) throw updateError;

        // Clear existing assignments and add new ones
        await supabase.from('lead_assignments').delete().eq('lead_id', leadId);
        
        const assignments = selectedAgents.map(agentId => ({
          lead_id: leadId,
          user_id: agentId,
          assigned_by: user.id,
        }));

        const { error: assignError } = await supabase
          .from('lead_assignments')
          .insert(assignments);

        if (assignError) throw assignError;

        // Send notifications to assigned agents
        const notifications = selectedAgents
          .filter(agentId => agentId !== user.id)
          .map(agentId => ({
            user_id: agentId,
            type: "lead_assignment",
            title: "Lead Assigned to You",
            description: `You have been assigned a lead`,
            link: `/lead/${leadId}`,
          }));

        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }

        const assignedNames = profiles
          ?.filter(p => selectedAgents.includes(p.user_id))
          .map(p => `${p.first_name || ''} ${p.last_name || ''}`.trim())
          .join(', ');

        toast({
          title: "Success",
          description: `Lead assigned to ${assignedNames || 'selected team members'}`,
        });
      }

      setOpen(false);
      setSelectedAgents([]);
      
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
            Assign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Lead</DialogTitle>
          <DialogDescription>
            {isAdmin ? "Choose to assign to specific team members or use round-robin" : "Select team members to assign this lead to"}
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
                Select Team Members
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
              <Label>Select Team Members</Label>
              <MultiAgentSelect
                selectedIds={selectedAgents}
                onSelectionChange={setSelectedAgents}
                placeholder="Choose team members..."
              />
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
            disabled={loading || (forwardType === 'agent' && selectedAgents.length === 0)}
          >
            {loading ? 'Assigning...' : 'Assign Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}