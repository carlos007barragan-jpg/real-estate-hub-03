import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, Play, Pause, Voicemail, Globe, Calendar, Trash2, History, GitMerge, Building } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ForwardLeadDialog } from "@/components/ForwardLeadDialog";

interface NewLead {
  id: string;
  lead_record_id: string | null;
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
  call_status: string | null;
  assigned_to: string | null;
}

export default function NewLeads() {
  const [allLeads, setAllLeads] = useState<NewLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingLeadId, setPlayingLeadId] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; title: string; leads: any[] }>({ open: false, title: '', leads: [] });
  const [allHistoryLeads, setAllHistoryLeads] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const SOURCE_CALLS = "Inbound Call";
  const SOURCE_RL = "Real Living Website";
  const SOURCE_OF = "Owner Finance Website";

  const fetchNewLeads = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      const orgId = profile?.organization_id;
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

      const { data: websiteLeadsData, error: websiteLeadsError } = await supabase
        .from('leads')
        .select('id, name, email, phone, status, source, created_at, source_call_sid, assigned_to, property_of_interest, last_inbound_at, is_inbound_call')
        .in('user_id', orgUserIds)
        .eq('assigned_to', 'unassigned')
        .in('source', [SOURCE_RL, SOURCE_OF, 'Online Lead - Website'])
        .order('created_at', { ascending: false });

      if (websiteLeadsError) throw websiteLeadsError;

      const { data: liveCallLogs, error: liveCallLogsError } = await supabase
        .from('call_logs')
        .select('id, lead_id, call_sid, from_number, to_number, status, duration, recording_url, transcription, created_at, direction')
        .in('user_id', orgUserIds)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false });

      if (liveCallLogsError) throw liveCallLogsError;

      const liveCallLeadIds = Array.from(new Set((liveCallLogs || []).map(log => log.lead_id).filter(Boolean)));
      const { data: liveCallLeadRows, error: liveCallLeadRowsError } = liveCallLeadIds.length > 0
        ? await supabase
            .from('leads')
            .select('id, name, email, phone, status, source, assigned_to, property_of_interest, last_inbound_at, created_at')
            .in('id', liveCallLeadIds)
        : { data: [], error: null };

      if (liveCallLeadRowsError) throw liveCallLeadRowsError;

      const callLeadMap = new Map((liveCallLeadRows || []).map(lead => [lead.id, lead]));
      const callCountsByLeadId = new Map<string, number>();

      for (const log of liveCallLogs || []) {
        if (!log.lead_id) continue;
        callCountsByLeadId.set(log.lead_id, (callCountsByLeadId.get(log.lead_id) || 0) + 1);
      }

      const liveCalls: NewLead[] = (liveCallLogs || [])
        .filter((log) => {
          const linkedLead = callLeadMap.get(log.lead_id);
          // Hide if the linked lead has been assigned (to anyone other than unassigned) or discarded
          if (linkedLead && linkedLead.assigned_to && linkedLead.assigned_to !== 'unassigned') return false;
          return true;
        })
        .map((log) => {
        const linkedLead = callLeadMap.get(log.lead_id);
        const callCount = log.lead_id ? (callCountsByLeadId.get(log.lead_id) || 1) : 1;

        return {
          id: log.id,
          lead_record_id: log.lead_id,
          name: linkedLead?.name || `Inbound Call - ${log.from_number}`,
          email: linkedLead?.email || `inbound+${log.from_number.replace(/\D/g, '')}@placeholder.com`,
          phone: log.from_number || linkedLead?.phone || 'Unknown',
          status: linkedLead?.status || 'new',
          source: SOURCE_CALLS,
          created_at: log.created_at,
          source_call_sid: log.call_sid,
          recording_url: log.recording_url || null,
          transcription: log.transcription || null,
          duration: log.duration || null,
          direction: log.direction || 'inbound',
          property_of_interest: linkedLead?.property_of_interest || null,
          last_inbound_at: linkedLead?.last_inbound_at || log.created_at,
          is_returning: callCount > 1,
          call_count: callCount,
          note_count: 0,
          call_status: log.status || null,
          assigned_to: linkedLead?.assigned_to || 'unassigned',
        };
      });

      const websiteLeads: NewLead[] = (websiteLeadsData || []).map((lead) => {
        const normalizedSource = lead.source === 'Online Lead - Website' ? SOURCE_RL : lead.source;
        return {
          ...lead,
          lead_record_id: lead.id,
          source: normalizedSource,
          recording_url: null,
          transcription: null,
          duration: null,
          direction: 'website',
          property_of_interest: lead.property_of_interest,
          last_inbound_at: lead.last_inbound_at,
          is_returning: false,
          call_count: 0,
          note_count: 0,
          call_status: null,
          assigned_to: lead.assigned_to,
        };
      });

      const merged = [...liveCalls, ...websiteLeads].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllLeads(merged);

      const { data: websiteHistory } = await supabase
        .from('leads')
        .select('id, name, phone, email, assigned_to, created_at, source')
        .in('user_id', orgUserIds)
        .in('source', [SOURCE_RL, SOURCE_OF, 'Online Lead - Website'])
        .order('created_at', { ascending: false });

      setAllHistoryLeads([
        ...liveCalls.map((call) => ({
          id: call.lead_record_id || call.id,
          name: call.name,
          phone: call.phone,
          email: call.email,
          assigned_to: call.assigned_to,
          created_at: call.created_at,
          source: call.source,
        })),
        ...(websiteHistory || []),
      ]);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_logs' }, () => fetchNewLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_logs' }, () => fetchNewLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const callLeads = allLeads.filter(l => l.source === SOURCE_CALLS);
  const rlLeads = allLeads.filter(l => l.source === SOURCE_RL);
  const ofLeads = allLeads.filter(l => l.source === SOURCE_OF);

  const normalizeSource = (s: string) => s === 'Online Lead - Website' ? SOURCE_RL : s;
  const unassignedCalls = callLeads.filter(l => l.assigned_to === 'unassigned').length;
  const unassignedRL = allHistoryLeads.filter(l => normalizeSource(l.source) === SOURCE_RL && l.assigned_to === 'unassigned').length;
  const unassignedOF = allHistoryLeads.filter(l => normalizeSource(l.source) === SOURCE_OF && l.assigned_to === 'unassigned').length;
  const totalUnassigned = unassignedCalls + unassignedRL + unassignedOF;

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
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .single();
      const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
      const agentName = fullName || profile?.email || user.email?.split('@')[0] || 'Agent';
      const { error } = await supabase.from('leads').update({ assigned_to: agentName }).eq('id', leadId);
      if (error) throw error;
      toast({ title: "Success", description: "Lead assigned to you" });
      fetchNewLeads();
    } catch (error: any) {
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
      toast({ title: "Error", description: "Failed to discard lead", variant: "destructive" });
    }
  };

  const openHistory = (title: string, leads: any[]) => {
    setHistoryDialog({ open: true, title, leads });
  };

  const getSourceIcon = (source: string) => {
    if (source === SOURCE_CALLS) return <Phone className="w-5 h-5 text-info" />;
    if (source === SOURCE_OF) return <Building className="w-5 h-5 text-amber-600" />;
    return <Globe className="w-5 h-5 text-primary" />;
  };

  const renderLeadCard = (lead: NewLead) => {
    const targetLeadId = lead.lead_record_id || lead.id;
    const isUnassigned = !lead.assigned_to || lead.assigned_to === 'unassigned';

    return (
      <Card key={lead.id} className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${lead.source === SOURCE_CALLS ? 'bg-info/10' : lead.source === SOURCE_OF ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                {getSourceIcon(lead.source)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{lead.name}</h3>
                  {lead.is_returning && (
                    <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 bg-amber-50">
                      <GitMerge className="w-3 h-3" /> Returning Lead
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {lead.is_returning ? (
                    <>Originally added {format(new Date(lead.created_at), 'MMM dd, yyyy')} · Last contact {format(new Date(lead.last_inbound_at!), 'MMM dd, h:mm a')}</>
                  ) : (
                    format(new Date(lead.created_at), 'MMM dd, yyyy h:mm a')
                  )}
                </p>
              </div>
            </div>

            {lead.is_returning && (
              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                  <GitMerge className="w-3 h-3" /> Existing Lead — Merged Automatically
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  This contact already exists in the CRM{lead.call_count > 1 ? ` with ${lead.call_count} previous calls` : ''}. Click "View Details" to see full history.
                </p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" /><span>{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" /><span>{lead.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <Badge variant="default">{lead.source}</Badge>
                {lead.source === SOURCE_CALLS && lead.call_status && (
                  <Badge variant={lead.call_status === 'completed' ? 'default' : lead.call_status === 'no-answer' ? 'destructive' : 'secondary'}>
                    {lead.call_status === 'completed' ? 'Completed' : lead.call_status === 'no-answer' ? 'No Answer' : lead.call_status === 'busy' ? 'Missed' : lead.call_status === 'in-progress' ? 'In Progress' : lead.call_status}
                  </Badge>
                )}
                {lead.source === SOURCE_CALLS && !isUnassigned && lead.assigned_to && (
                  <Badge variant="outline">Assigned: {lead.assigned_to}</Badge>
                )}
                {lead.source === SOURCE_CALLS && <Badge variant="secondary">Duration: {formatDuration(lead.duration)}</Badge>}
                {lead.property_of_interest && (
                  <Badge variant="secondary" className="gap-1"><Calendar className="w-3 h-3" />{lead.property_of_interest}</Badge>
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
              {isUnassigned && targetLeadId && (
                <Button onClick={() => handleAssignToMe(targetLeadId)} variant="default">
                  {lead.source === SOURCE_CALLS ? 'Assign Lead' : 'Assign to Me'}
                </Button>
              )}
              {isUnassigned && targetLeadId && <ForwardLeadDialog leadId={targetLeadId} onSuccess={fetchNewLeads} />}
              {targetLeadId && <Button onClick={() => navigate(`/leads/${targetLeadId}`)} variant="outline">View Details</Button>}
              {isUnassigned && targetLeadId && (
                <Button onClick={() => handleDiscard(targetLeadId)} variant="destructive" size="sm" className="gap-1">
                  <Trash2 className="w-4 h-4" /> Discard
                </Button>
              )}
            </div>
          </div>

          {lead.recording_url && (
            <Button size="sm" variant="outline" onClick={() => playRecording(lead.id, lead.recording_url!)} disabled={loadingAudio === lead.id} className="gap-2 ml-4">
              {playingLeadId === lead.id ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> {loadingAudio === lead.id ? 'Loading...' : 'Play Voicemail'}</>}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const renderLeadList = (leads: NewLead[], emptyIcon: React.ReactNode, emptyText: string) => (
    leads.length === 0 ? (
      <Card className="p-8 text-center">
        {emptyIcon}
        <p className="text-muted-foreground">{emptyText}</p>
      </Card>
    ) : (
      <div className="grid gap-4">
        {leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(lead => renderLeadCard(lead))}
      </div>
    )
  );

  const renderMetricCards = () => (
    <div className="grid gap-4 md:grid-cols-4">
      <Card
        className={`p-6 cursor-pointer hover:shadow-md transition-shadow ${unassignedCalls > 0 ? 'border-destructive/50 bg-destructive/5' : ''}`}
        onClick={() => openHistory('Unassigned Calls', callLeads.filter(l => l.assigned_to === 'unassigned'))}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Unassigned Calls</div>
            <div className={`text-3xl font-bold mt-2 ${unassignedCalls > 0 ? 'text-destructive' : ''}`}>{unassignedCalls}</div>
          </div>
          <Phone className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
      <Card
        className={`p-6 cursor-pointer hover:shadow-md transition-shadow ${unassignedRL > 0 ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/10' : ''}`}
        onClick={() => openHistory('Unassigned Real Living Leads', allHistoryLeads.filter(l => normalizeSource(l.source) === SOURCE_RL && l.assigned_to === 'unassigned'))}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Unassigned Real Living</div>
            <div className={`text-3xl font-bold mt-2 ${unassignedRL > 0 ? 'text-amber-600' : ''}`}>{unassignedRL}</div>
          </div>
          <Globe className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
      <Card
        className={`p-6 cursor-pointer hover:shadow-md transition-shadow ${unassignedOF > 0 ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/10' : ''}`}
        onClick={() => openHistory('Unassigned Owner Finance Leads', allHistoryLeads.filter(l => normalizeSource(l.source) === SOURCE_OF && l.assigned_to === 'unassigned'))}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Unassigned Owner Finance</div>
            <div className={`text-3xl font-bold mt-2 ${unassignedOF > 0 ? 'text-amber-600' : ''}`}>{unassignedOF}</div>
          </div>
          <Building className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
      <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistory('All Unassigned', allHistoryLeads.filter(l => l.assigned_to === 'unassigned'))}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Total Unassigned</div>
            <div className="text-3xl font-bold mt-2">{totalUnassigned}</div>
          </div>
          <History className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Inbound Leads</h1>
        <p className="text-muted-foreground mt-2">
          Unassigned leads from calls, Real Living website, and Owner Finance website
        </p>
      </div>

      {renderMetricCards()}

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({allLeads.length})</TabsTrigger>
          <TabsTrigger value="calls" className="gap-1.5"><Phone className="w-4 h-4" />Live Calls ({callLeads.length})</TabsTrigger>
          <TabsTrigger value="rl" className="gap-1.5"><Globe className="w-4 h-4" />Real Living Web ({rlLeads.length})</TabsTrigger>
          <TabsTrigger value="of" className="gap-1.5"><Building className="w-4 h-4" />Owner Finance ({ofLeads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-4">
          {renderLeadList(allLeads, <Voicemail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />, "No new inbound leads")}
        </TabsContent>

        <TabsContent value="calls" className="space-y-6 mt-4">
          {renderLeadList(callLeads, <Voicemail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />, "No inbound call records")}
        </TabsContent>

        <TabsContent value="rl" className="space-y-6 mt-4">
          {renderLeadList(rlLeads, <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />, "No unassigned Real Living website leads")}
        </TabsContent>

        <TabsContent value="of" className="space-y-6 mt-4">
          {renderLeadList(ofLeads, <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />, "No unassigned Owner Finance website leads")}
        </TabsContent>
      </Tabs>

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
