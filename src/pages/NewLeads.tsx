import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, Play, Pause, Voicemail, Globe, User, Calendar, Trash2, History, GitMerge } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  property_of_interest: string | null;
  last_inbound_at: string | null;
  is_returning: boolean;
  call_count: number;
  note_count: number;
}

export default function NewLeads() {
  const [inboundLeads, setInboundLeads] = useState<NewLead[]>([]);
  const [websiteLeads, setWebsiteLeads] = useState<NewLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingLeadId, setPlayingLeadId] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [inboundStats, setInboundStats] = useState({ total: 0, answered: 0, unanswered: 0 });
  const [websiteStats, setWebsiteStats] = useState({ total: 0, assigned: 0, unassigned: 0 });
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; title: string; leads: any[] }>({ open: false, title: '', leads: [] });
  const [allInboundLeads, setAllInboundLeads] = useState<any[]>([]);
  const [allWebsiteLeads, setAllWebsiteLeads] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchNewLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization to fetch all org leads
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      const orgId = profile?.organization_id;

      // Get all user_ids in the organization
      let orgUserIds: string[] = [user.id];
      if (orgId) {
        const { data: orgProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('organization_id', orgId);
        if (orgProfiles && orgProfiles.length > 0) {
          orgUserIds = orgProfiles.map(p => p.user_id);
        }
      }

      // Fetch unassigned inbound call leads for the whole org
      const { data: inboundData, error: inboundError } = await supabase
        .from('leads')
        .select(`id, name, email, phone, status, source, created_at, source_call_sid, assigned_to, property_of_interest, last_inbound_at`)
        .in('user_id', orgUserIds)
        .eq('is_inbound_call', true)
        .eq('assigned_to', 'unassigned')
        .order('created_at', { ascending: false });

      if (inboundError) throw inboundError;

      // Fetch call logs for inbound leads
      const inboundIds = inboundData?.map(l => l.id) || [];
      const { data: callLogs } = inboundIds.length > 0
        ? await supabase.from('call_logs').select('*').in('lead_id', inboundIds)
        : { data: [] };

      // Fetch note counts & call counts for returning-lead detection
      const { data: callCounts } = inboundIds.length > 0
        ? await supabase.from('call_logs').select('lead_id').in('lead_id', inboundIds)
        : { data: [] };
      const { data: noteCounts } = inboundIds.length > 0
        ? await supabase.from('notes').select('lead_id').in('lead_id', inboundIds)
        : { data: [] };

      const mergedInbound = inboundData?.map(lead => {
        const callLog = callLogs?.find(log => log.lead_id === lead.id);
        const leadCallCount = callCounts?.filter(c => c.lead_id === lead.id).length || 0;
        const leadNoteCount = noteCounts?.filter(n => n.lead_id === lead.id).length || 0;
        // A lead is "returning" if it was created before this latest inbound contact
        const isReturning = lead.last_inbound_at && new Date(lead.last_inbound_at).getTime() > new Date(lead.created_at).getTime() + 60000;
        return {
          ...lead,
          recording_url: callLog?.recording_url || null,
          transcription: callLog?.transcription || null,
          duration: callLog?.duration || null,
          direction: callLog?.direction || 'inbound',
          property_of_interest: lead.property_of_interest,
          last_inbound_at: lead.last_inbound_at,
          is_returning: !!isReturning || leadCallCount > 1,
          call_count: leadCallCount,
          note_count: leadNoteCount,
        };
      }) || [];

      setInboundLeads(mergedInbound);

      // Fetch website leads (unassigned) for the whole org
      const { data: webData, error: webError } = await supabase
        .from('leads')
        .select(`id, name, email, phone, status, source, created_at, assigned_to, property_of_interest, last_inbound_at`)
        .in('user_id', orgUserIds)
        .eq('source', 'Online Lead - Website')
        .eq('assigned_to', 'unassigned')
        .order('created_at', { ascending: false });

      if (webError) throw webError;

      setWebsiteLeads((webData || []).map(l => ({
        ...l,
        source_call_sid: null,
        recording_url: null,
        transcription: null,
        duration: null,
        direction: 'website',
        property_of_interest: l.property_of_interest,
        last_inbound_at: l.last_inbound_at,
        is_returning: !!(l.last_inbound_at && new Date(l.last_inbound_at).getTime() > new Date(l.created_at).getTime() + 60000),
        call_count: 0,
        note_count: 0,
      })));

      // Inbound call stats (org-wide) - fetch with details for history
      const { data: allInbound } = await supabase
        .from('leads')
        .select('id, name, phone, email, assigned_to, created_at, source')
        .in('user_id', orgUserIds)
        .eq('is_inbound_call', true)
        .order('created_at', { ascending: false });

      const inTotal = allInbound?.length || 0;
      const inAnswered = allInbound?.filter(l => l.assigned_to !== 'unassigned' && l.assigned_to !== 'discarded').length || 0;
      const inDiscarded = allInbound?.filter(l => l.assigned_to === 'discarded').length || 0;
      setInboundStats({ total: inTotal, answered: inAnswered, unanswered: inTotal - inAnswered - inDiscarded });
      setAllInboundLeads(allInbound || []);

      // Website lead stats (org-wide) - fetch with details for history
      const { data: allWebsite } = await supabase
        .from('leads')
        .select('id, name, phone, email, assigned_to, created_at, source')
        .in('user_id', orgUserIds)
        .eq('source', 'Online Lead - Website')
        .order('created_at', { ascending: false });

      const webTotal = allWebsite?.length || 0;
      const webAssigned = allWebsite?.filter(l => l.assigned_to !== 'unassigned' && l.assigned_to !== 'discarded').length || 0;
      setWebsiteStats({ total: webTotal, assigned: webAssigned, unassigned: webTotal - webAssigned });
      setAllWebsiteLeads(allWebsite || []);

    } catch (error: any) {
      console.error('Error fetching new leads:', error);
      toast({ title: "Error", description: "Failed to load new leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewLeads();

    const channel = supabase
      .channel('new-leads-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => fetchNewLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, () => fetchNewLeads())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
      if (audioRef.current) audioRef.current.pause();

      const { data, error } = await supabase.functions.invoke('get-recording', { body: { recordingUrl: url } });
      if (error) throw error;

      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingLeadId(null);
      audio.oncanplay = () => setLoadingAudio(null);
      await audio.play();
      setPlayingLeadId(leadId);
    } catch (error: any) {
      console.error('Error playing recording:', error);
      toast({ title: "Error", description: "Failed to play recording", variant: "destructive" });
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
      const { error } = await supabase.from('leads').update({ assigned_to: agentName }).eq('id', leadId);
      if (error) throw error;
      toast({ title: "Success", description: "Lead assigned to you" });
      fetchNewLeads();
    } catch (error: any) {
      console.error('Error assigning lead:', error);
      toast({ title: "Error", description: "Failed to assign lead", variant: "destructive" });
    }
  };

  const handleDiscard = async (leadId: string) => {
    try {
      const { error } = await supabase.from('leads').update({ assigned_to: 'discarded' }).eq('id', leadId);
      if (error) throw error;
      toast({ title: "Discarded", description: "Lead has been discarded" });
      fetchNewLeads();
    } catch (error: any) {
      console.error('Error discarding lead:', error);
      toast({ title: "Error", description: "Failed to discard lead", variant: "destructive" });
    }
  };

  const openHistory = (title: string, leads: any[]) => {
    setHistoryDialog({ open: true, title, leads });
  };

  const renderLeadCard = (lead: NewLead, isWebsite: boolean) => (
    <Card key={lead.id} className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${isWebsite ? 'bg-primary/10' : 'bg-info/10'}`}>
              {isWebsite ? <Globe className="w-5 h-5 text-primary" /> : <Phone className="w-5 h-5 text-info" />}
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
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Badge variant={isWebsite ? "default" : "outline"}>{lead.source}</Badge>
              {!isWebsite && <Badge variant="secondary">Duration: {formatDuration(lead.duration)}</Badge>}
              {lead.property_of_interest && (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="w-3 h-3" />
                  {lead.property_of_interest}
                </Badge>
              )}
            </div>
          </div>

          {lead.transcription && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-1">Voicemail Transcription:</div>
              <p className="text-sm">{lead.transcription}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4 flex-wrap">
            <Button onClick={() => handleAssignToMe(lead.id)} variant="default">Assign to Me</Button>
            <ForwardLeadDialog leadId={lead.id} onSuccess={fetchNewLeads} />
            <Button onClick={() => navigate(`/leads/${lead.id}`)} variant="outline">View Details</Button>
            <Button onClick={() => handleDiscard(lead.id)} variant="destructive" size="sm" className="gap-1">
              <Trash2 className="w-4 h-4" /> Discard
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
              <><Pause className="w-4 h-4" /> Pause</>
            ) : (
              <><Play className="w-4 h-4" /> {loadingAudio === lead.id ? 'Loading...' : 'Play Voicemail'}</>
            )}
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Inbound Leads</h1>
        <p className="text-muted-foreground mt-2">
          Unassigned leads from inbound calls and website submissions — assign to agents
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All ({inboundLeads.length + websiteLeads.length})
          </TabsTrigger>
          <TabsTrigger value="website" className="gap-1.5">
            <Globe className="w-4 h-4" />
            Website ({websiteLeads.length})
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-1.5">
            <Phone className="w-4 h-4" />
            Inbound Calls ({inboundLeads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-4">
          {/* Combined stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('All Inbound Calls', allInboundLeads)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Inbound Calls</div>
                  <div className="text-3xl font-bold mt-2">{inboundStats.total}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('Calls Answered', allInboundLeads.filter(l => l.assigned_to !== 'unassigned' && l.assigned_to !== 'discarded'))}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Calls Answered</div>
                  <div className="text-3xl font-bold mt-2 text-success">{inboundStats.answered}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6 border-primary/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('All Website Leads', allWebsiteLeads)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Website Leads</div>
                  <div className="text-3xl font-bold mt-2">{websiteStats.total}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('Website Unassigned', allWebsiteLeads.filter(l => l.assigned_to === 'unassigned'))}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Website Unassigned</div>
                  <div className="text-3xl font-bold mt-2 text-warning">{websiteStats.unassigned}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {inboundLeads.length + websiteLeads.length === 0 ? (
            <Card className="p-8 text-center">
              <Voicemail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No new inbound leads</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {[...websiteLeads, ...inboundLeads]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map(lead => renderLeadCard(lead, lead.source === 'Online Lead - Website'))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="website" className="space-y-6 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6 border-primary/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('All Website Leads', allWebsiteLeads)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Website Leads</div>
                  <div className="text-3xl font-bold mt-2">{websiteStats.total}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('Assigned Website Leads', allWebsiteLeads.filter(l => l.assigned_to !== 'unassigned' && l.assigned_to !== 'discarded'))}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Assigned</div>
                  <div className="text-3xl font-bold mt-2 text-success">{websiteStats.assigned}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('Unassigned Website Leads', allWebsiteLeads.filter(l => l.assigned_to === 'unassigned'))}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Unassigned</div>
                  <div className="text-3xl font-bold mt-2 text-warning">{websiteStats.unassigned}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {websiteLeads.length === 0 ? (
            <Card className="p-8 text-center">
              <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No unassigned website leads</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {websiteLeads.map(lead => renderLeadCard(lead, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calls" className="space-y-6 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('All Inbound Calls', allInboundLeads)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Inbound Calls</div>
                  <div className="text-3xl font-bold mt-2">{inboundStats.total}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('Answered Calls', allInboundLeads.filter(l => l.assigned_to !== 'unassigned' && l.assigned_to !== 'discarded'))}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Answered</div>
                  <div className="text-3xl font-bold mt-2 text-success">{inboundStats.answered}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('Unanswered Calls', allInboundLeads.filter(l => l.assigned_to === 'unassigned'))}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Unanswered</div>
                  <div className="text-3xl font-bold mt-2 text-warning">{inboundStats.unanswered}</div>
                </div>
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {inboundLeads.length === 0 ? (
            <Card className="p-8 text-center">
              <Voicemail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No new inbound call leads</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {inboundLeads.map(lead => renderLeadCard(lead, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => setHistoryDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{historyDialog.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {historyDialog.leads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No leads found</p>
            ) : (
              <div className="space-y-3">
                {historyDialog.leads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setHistoryDialog(prev => ({ ...prev, open: false })); navigate(`/leads/${lead.id}`); }}
                  >
                    <div>
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone} · {lead.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={lead.assigned_to === 'unassigned' ? 'outline' : lead.assigned_to === 'discarded' ? 'destructive' : 'default'} className="text-xs">
                        {lead.assigned_to === 'unassigned' ? 'Unassigned' : lead.assigned_to === 'discarded' ? 'Discarded' : lead.assigned_to}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(lead.created_at), 'MMM dd, h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
