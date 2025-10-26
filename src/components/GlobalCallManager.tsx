import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Device, Call } from "@twilio/voice-sdk";
import { ForwardLeadDialog } from "@/components/ForwardLeadDialog";
import { useUserRole } from "@/hooks/useUserRole";

export const GlobalCallManager = () => {
  const { toast } = useToast();
  const [device, setDevice] = useState<Device | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [incomingFrom, setIncomingFrom] = useState<string>("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    initializeDevice();
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (call) call.disconnect();
      if (device) device.destroy();
    };
  }, []);

  const initializeDevice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('get-twilio-token', {
        body: { identity: user.email }
      });

      if (error) throw error;

      const newDevice = new Device(data.token, { logLevel: 1 });

      newDevice.on('registered', () => {
        console.log('Twilio Device ready to receive calls');
      });

      newDevice.on('error', (error) => {
        console.error('Twilio Device error:', error);
      });

      newDevice.on('incoming', async (incoming) => {
        const fromNumber = (incoming as any).parameters?.From || 'Unknown';
        console.log('Incoming call from:', fromNumber);
        
        setIncomingFrom(fromNumber);
        setIncomingCall(incoming);
        
        // Find the lead for this call
        const { data: leadData } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', fromNumber)
          .single();
        
        if (leadData) {
          setLeadId(leadData.id);
        }
        
        // Play ringtone
        if (!audioRef.current) {
          audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSx+zPLTgjMGHm7A7+OZSA4PVKvo8K5aGAg+ltryxHYpBSyAzvLZiTYIGWe77OifTRALUKfj8LZjHAY5ktbyyXouBih+zPLTgjQGHW3A7eeYSQ4PVKzo8K5aFwk/ltryxHYpBSyCzvLYiTYIGWi77OifTRALT6fj8LdjHAY4ktbyynouBSh+y/LTgjQGHW3A7eeYSQ4OVKzo8LBaFwk/ltryxXYpBSyCzvLYiTYHGWi77OifUBALT6fj8LdjHAY4ktbyyXkvBSh+yvLTgzQGHW3A7eaYSg4OVK3o8LBaFwk/ltrzxXYpBSyCzvLYijYHGWi67OifUBALT6fj8LdjHAU5ktbyyXkvBSh+yvLTgzQGHW3A7eaYSg4OVK3o8LBaFwk+ltvzxXYpBSyCzvLYijYHGGi67OifUBALT6bj8LhjHAU5ktbyyXkvBSh+yvLTgzQFHG3A7eaYSg4OVK3o8LFaFwk+ltvzxXYpBSyCzvLYijYHGGi67OmfUBAKT6bj8LhjHAU5ktfyyXkvBCh+yvLTgzQFHG3A7eaYSw4OVK3o8LFaFwk+ltvzxHYpBSyBzvLYijYHGGi77OmfUBAKT6bj8LhjHAU5ktfyyXkvBCh9yvLUgzQFHG3A7eaYSw4OVKzo8LFbFwk+ltvzxHYpBSyBzvLYijYHGGi77OmfUBAKT6bj8LhjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4OVKzo8LFbFwk+ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LhjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4OVKzo8LFbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LhjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4OVKzo8LFbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LhjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4NVKzo8LJbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LhjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4NVKzo8LJbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LdjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4NVKzo8LJbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LdjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4NVKzo8LJbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LdjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4NVKzo8LJbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LdjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4NVKzo8LJbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LdjHAU4ktfyynkvBCh9yvLUgzQFHG2/7eaZSw4NVKzo8LJbFwk9ltvzxHYpBSyBzvLYijYHGGi77OmfURAKT6bj8LdjHAU4ktfyynkvA==');
          audioRef.current.loop = true;
        }
        audioRef.current.play();
        
        toast({
          title: "📞 Incoming Call!",
          description: `Ring ring ring! Call from ${fromNumber}`,
        });
      });

      await newDevice.register();
      setDevice(newDevice);
    } catch (error: any) {
      console.error('Error initializing device:', error);
    }
  };

  const acceptIncoming = async () => {
    if (!incomingCall) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setCall(incomingCall);
    setIncomingCall(null);
    setCallDuration(0);
    
    intervalRef.current = window.setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    incomingCall.on('disconnect', () => {
      endCall();
    });
    
    try {
      await incomingCall.accept();
      toast({ title: '✅ Call connected' });
    } catch (e: any) {
      console.error('Failed to accept call', e);
      toast({ title: '❌ Failed to accept call', description: e.message, variant: 'destructive' });
      setCall(null);
    }
  };

  const declineIncoming = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try { incomingCall?.reject(); } catch (_) {}
    setIncomingCall(null);
    setIncomingFrom("");
    setLeadId(null);
  };

  const endCall = async () => {
    const finalDuration = callDuration;
    const currentCallSid = call?.parameters.CallSid;
    
    if (call) call.disconnect();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (currentCallSid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('call_logs').update({
          status: 'completed',
          duration: finalDuration,
        }).eq('call_sid', currentCallSid);
      }
    }
    
    setCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setLeadId(null);
    
    toast({
      title: "Call Ended",
      description: `Duration: ${formatDuration(finalDuration)}`,
    });
  };

  const toggleMute = () => {
    if (call) {
      call.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Incoming call notification
  if (incomingCall) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
        <Card className="border-warning shadow-2xl w-80">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">📞</div>
                <p className="text-lg font-bold animate-pulse">Ring Ring Ring Ring!</p>
                <p className="text-sm text-muted-foreground">Incoming call from</p>
                <p className="text-lg font-semibold">{incomingFrom}</p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={acceptIncoming} variant="default" className="flex-1 gap-2 bg-success hover:bg-success/90">
                  <Phone className="h-4 w-4" />
                  Answer
                </Button>
                <Button onClick={declineIncoming} variant="destructive" className="flex-1 gap-2">
                  <PhoneOff className="h-4 w-4" />
                  Decline
                </Button>
              </div>
              
              {leadId && isAdmin && (
                <ForwardLeadDialog 
                  leadId={leadId} 
                  onSuccess={() => {
                    toast({ title: "Lead forwarded" });
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active call interface
  if (call) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
        <Card className="border-success shadow-2xl w-80">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">On call with</p>
                <p className="text-lg font-semibold">{incomingFrom || 'Contact'}</p>
                <p className="text-3xl font-mono text-success">{formatDuration(callDuration)}</p>
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "destructive" : "outline"}
                  size="icon"
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                
                <Button onClick={endCall} variant="destructive" className="gap-2 flex-1">
                  <PhoneOff className="h-4 w-4" />
                  End Call
                </Button>
              </div>
              
              {leadId && isAdmin && (
                <ForwardLeadDialog 
                  leadId={leadId} 
                  onSuccess={() => {
                    toast({ title: "Lead forwarded" });
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
