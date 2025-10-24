import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Phone, Play, Pause, Loader2, PhoneIncoming, PhoneOutgoing, User } from "lucide-react";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";

interface CallLog {
  id: string;
  call_sid: string;
  from_number: string;
  to_number: string;
  status: string;
  duration: number | null;
  recording_url: string | null;
  recording_duration: number | null;
  created_at: string;
  transcription: string | null;
  answered_by: string | null;
  direction: string;
}

interface CallHistoryProps {
  leadId: string;
}

export const CallHistory = ({ leadId }: CallHistoryProps) => {
  const { toast } = useToast();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchCallLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCallLogs(data || []);
    } catch (error) {
      console.error('Error fetching call logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('call_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          fetchCallLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTranscription = (callId: string) => {
    setExpandedCallId(expandedCallId === callId ? null : callId);
  };

  const playRecording = async (callId: string, url: string) => {
    try {
      setLoadingAudio(callId);

      // If already playing this recording, pause it
      if (playingCallId === callId && audioRef.current) {
        audioRef.current.pause();
        setPlayingCallId(null);
        setLoadingAudio(null);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Fetch the recording through our proxy - get raw response
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-recording`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ recordingUrl: url }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recording');
      }

      // Get the audio as a blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play the audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingCallId(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        toast({
          title: "Playback Error",
          description: "Failed to play the recording",
          variant: "destructive",
        });
        setPlayingCallId(null);
        setLoadingAudio(null);
      };

      await audio.play();
      setPlayingCallId(callId);
      setLoadingAudio(null);

    } catch (error) {
      console.error('Error playing recording:', error);
      toast({
        title: "Error",
        description: "Failed to load recording",
        variant: "destructive",
      });
      setLoadingAudio(null);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading call history...</div>;
  }

  if (callLogs.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">No call history yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {callLogs.map((log) => (
        <Card key={log.id} className="p-4">
          <div className="flex items-start justify-between">
            <div 
              className="flex items-start gap-3 flex-1 cursor-pointer" 
              onClick={() => log.transcription && toggleTranscription(log.id)}
            >
              <div className={`p-2 rounded-lg ${
                log.direction === 'inbound' 
                  ? 'bg-info/10' 
                  : 'bg-primary/10'
              }`}>
                {log.direction === 'inbound' ? (
                  <PhoneIncoming className={`h-4 w-4 ${
                    log.direction === 'inbound' ? 'text-info' : 'text-primary'
                  }`} />
                ) : (
                  <PhoneOutgoing className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {log.from_number} → {log.to_number}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {log.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-muted-foreground">
                    Duration: {formatDuration(log.duration)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    log.status === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {log.status}
                  </span>
                </div>
                {log.answered_by && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Answered by: {log.answered_by}</span>
                  </div>
                )}
                {log.transcription && (expandedCallId === log.id || playingCallId === log.id) && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Transcription:
                    </div>
                    <div className="text-sm">
                      {log.transcription}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {log.recording_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  playRecording(log.id, log.recording_url!);
                }}
                disabled={loadingAudio === log.id}
                className="gap-2 ml-4"
              >
                {loadingAudio === log.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : playingCallId === log.id ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {playingCallId === log.id ? 'Pause' : 'Play'}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
