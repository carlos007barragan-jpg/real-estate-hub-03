import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Play, Pause, Voicemail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ForwardLeadDialog } from "@/components/ForwardLeadDialog";

interface NewLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  created_at: string;
  source_call_sid: string | null;
  recording_url: string | null;
  transcription: string | null;
  duration: number | null;
  direction: string;
}

export default function NewLeads() {
  const [leads, setLeads] = useState<NewLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingLeadId, setPlayingLeadId] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, answered: 0, unanswered: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchNewLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch unassigned inbound call leads with their call logs
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          phone,
          status,
          source,
          created_at,
          source_call_sid,
          assigned_to
        `)
        .eq('user_id', user.id)
        .eq('is_inbound_call', true)
        .eq('assigned_to', 'unassigned')
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch call logs for these leads
      const leadIds = leadsData?.map(l => l.id) || [];
      const { data: callLogs } = await supabase
        .from('call_logs')
        .select('*')
        .in('lead_id', leadIds);

      // Merge data
      const mergedLeads = leadsData?.map(lead => {
        const callLog = callLogs?.find(log => log.lead_id === lead.id);
        return {
          ...lead,
          recording_url: callLog?.recording_url || null,
          transcription: callLog?.transcription || null,
          duration: callLog?.duration || null,
          direction: callLog?.direction || 'inbound',
        };
      }) || [];

      setLeads(mergedLeads);
      
      // Calculate stats for all inbound calls
      const { data: allInboundLeads } = await supabase
        .from('leads')
        .select('id, assigned_to')
        .eq('user_id', user.id)
        .eq('is_inbound_call', true);
        
      const total = allInboundLeads?.length || 0;
      const answered = allInboundLeads?.filter(l => l.assigned_to !== 'unassigned').length || 0;
      const unanswered = total - answered;
      
      setStats({ total, answered, unanswered });
    } catch (error: any) {
      console.error('Error fetching new leads:', error);
      toast({
        title: "Error",
        description: "Failed to load new leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewLeads();

    // Set up realtime subscription for new inbound leads
    const channel = supabase
      .channel('new-leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: 'is_inbound_call=eq.true'
        },
        () => fetchNewLeads()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        () => fetchNewLeads()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const playRecording = async (leadId: string, url: string) => {
    try {
      setLoadingAudio(leadId);

      if (playingLeadId === leadId) {
        audioRef.current?.pause();
        setPlayingLeadId(null);
        setLoadingAudio(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const { data, error } = await supabase.functions.invoke('get-recording', {
        body: { recordingUrl: url }
      });

      if (error) throw error;

      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingLeadId(null);
      };

      audio.oncanplay = () => {
        setLoadingAudio(null);
      };

      await audio.play();
      setPlayingLeadId(leadId);
    } catch (error: any) {
      console.error('Error playing recording:', error);
      toast({
        title: "Error",
        description: "Failed to play recording",
        variant: "destructive",
      });
      setLoadingAudio(null);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAssignToMe = async (leadId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const agentName = user.email?.split('@')[0] || 'Agent';

      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: agentName })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead assigned to you",
      });

      fetchNewLeads();
    } catch (error: any) {
      console.error('Error assigning lead:', error);
      toast({
        title: "Error",
        description: "Failed to assign lead",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading new leads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Inbound Leads</h1>
        <p className="text-muted-foreground mt-2">
          Unassigned leads from inbound calls - listen to voicemails and assign to agents
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total Inbound Calls</div>
          <div className="text-3xl font-bold mt-2">{stats.total}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Answered</div>
          <div className="text-3xl font-bold mt-2 text-success">{stats.answered}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Unanswered</div>
          <div className="text-3xl font-bold mt-2 text-warning">{stats.unanswered}</div>
        </Card>
      </div>

      {leads.length === 0 ? (
        <Card className="p-8 text-center">
          <Voicemail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No new inbound leads</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <Card key={lead.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-info/10">
                      <Phone className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{lead.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{lead.source}</Badge>
                      <Badge variant="secondary">Duration: {formatDuration(lead.duration)}</Badge>
                    </div>
                  </div>

                  {lead.transcription && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Voicemail Transcription:
                      </div>
                      <p className="text-sm">{lead.transcription}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleAssignToMe(lead.id)}
                      variant="default"
                    >
                      Assign to Me
                    </Button>
                    <ForwardLeadDialog
                      leadId={lead.id}
                      onSuccess={fetchNewLeads}
                    />
                    <Button
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      variant="outline"
                    >
                      View Details
                    </Button>
                  </div>
                </div>

                {lead.recording_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => playRecording(lead.id, lead.recording_url!)}
                    disabled={loadingAudio === lead.id}
                    className="gap-2 ml-4"
                  >
                    {playingLeadId === lead.id ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        {loadingAudio === lead.id ? 'Loading...' : 'Play Voicemail'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
