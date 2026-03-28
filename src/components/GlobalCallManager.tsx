import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Device, Call } from "@twilio/voice-sdk";
import { ForwardLeadDialog } from "@/components/ForwardLeadDialog";
import { useUserRole } from "@/hooks/useUserRole";

// Refresh token 5 minutes before it expires (token lasts 1 hour)
const TOKEN_REFRESH_MS = 55 * 60 * 1000;

export const GlobalCallManager = () => {
  const { toast } = useToast();
  const [device, setDevice] = useState<Device | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [incomingFrom, setIncomingFrom] = useState<string>("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [outgoingCallDetails, setOutgoingCallDetails] = useState<{ phoneNumber: string; contactName: string } | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'connecting' | 'ready' | 'error'>('connecting');
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const tokenRefreshRef = useRef<number | null>(null);
  const { isAdmin } = useUserRole();

  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke('get-twilio-token', {
        body: { identity: user.email }
      });

      if (error) throw error;
      return data.token;
    } catch (error: any) {
      console.error('Error fetching Twilio token:', error);
      return null;
    }
  }, []);

  const initializeDevice = useCallback(async () => {
    try {
      setDeviceStatus('connecting');
      const token = await fetchToken();
      if (!token) {
        setDeviceStatus('error');
        return;
      }

      // Destroy previous device if exists
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }

      const newDevice = new Device(token, { logLevel: 1 });

      newDevice.on('registered', () => {
        console.log('Twilio Device ready to receive calls');
        setDeviceStatus('ready');
      });

      newDevice.on('error', (error) => {
        console.error('Twilio Device error:', error);
        setDeviceStatus('error');
      });

      newDevice.on('unregistered', () => {
        console.log('Twilio Device unregistered');
        setDeviceStatus('error');
      });

      newDevice.on('tokenWillExpire', async () => {
        console.log('Twilio token expiring soon, refreshing...');
        const newToken = await fetchToken();
        if (newToken) {
          newDevice.updateToken(newToken);
          console.log('Twilio token refreshed successfully');
        }
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
      deviceRef.current = newDevice;

      // Schedule token refresh
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
      tokenRefreshRef.current = window.setInterval(async () => {
        console.log('Proactive token refresh...');
        const newToken = await fetchToken();
        if (newToken && deviceRef.current) {
          deviceRef.current.updateToken(newToken);
          console.log('Token refreshed proactively');
        }
      }, TOKEN_REFRESH_MS);

    } catch (error: any) {
      console.error('Error initializing device:', error);
      setDeviceStatus('error');
    }
  }, [fetchToken, toast]);

  useEffect(() => {
    initializeDevice();
    
    // Listen for outgoing call requests
    const handleInitiateCall = (event: any) => {
      const { phoneNumber, contactName } = event.detail;
      makeOutgoingCall(phoneNumber, contactName);
    };
    
    window.addEventListener('initiateCall', handleInitiateCall);
    
    return () => {
      window.removeEventListener('initiateCall', handleInitiateCall);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (callRef.current) callRef.current.disconnect();
      if (deviceRef.current) deviceRef.current.destroy();
    };
  }, []);

  const acceptIncoming = async () => {
    if (!incomingCall) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setCall(incomingCall);
    callRef.current = incomingCall;
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
      callRef.current = null;
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

  const makeOutgoingCall = async (phoneNumber: string, contactName: string) => {
    if (!deviceRef.current) {
      toast({
        title: "Device not ready",
        description: "Please wait for the device to initialize",
        variant: "destructive",
      });
      return;
    }

    try {
      setOutgoingCallDetails({ phoneNumber, contactName });
      
      const outgoingCall = await deviceRef.current.connect({
        params: {
          To: phoneNumber,
        },
      });

      setCall(outgoingCall);
      callRef.current = outgoingCall;
      setIncomingFrom(contactName);
      setCallDuration(0);

      intervalRef.current = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      outgoingCall.on('disconnect', () => {
        endCall();
      });

      toast({
        title: "Call Connected",
        description: `Calling ${contactName}...`,
      });
    } catch (error: any) {
      console.error('Error making outgoing call:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
      setOutgoingCallDetails(null);
    }
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
    callRef.current = null;
    setCallDuration(0);
    setIsMuted(false);
    setLeadId(null);
    setOutgoingCallDetails(null);
    
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

  // Phone status indicator (small, bottom-right)
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={deviceStatus === 'error' ? initializeDevice : undefined}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-colors ${
          deviceStatus === 'ready'
            ? 'bg-success/10 text-success border border-success/30'
            : deviceStatus === 'connecting'
            ? 'bg-warning/10 text-warning border border-warning/30 animate-pulse'
            : 'bg-destructive/10 text-destructive border border-destructive/30 cursor-pointer hover:bg-destructive/20'
        }`}
        title={deviceStatus === 'error' ? 'Click to reconnect' : deviceStatus === 'ready' ? 'Phone system connected' : 'Connecting...'}
      >
        {deviceStatus === 'ready' ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {deviceStatus === 'ready' ? 'Phone Ready' : deviceStatus === 'connecting' ? 'Connecting...' : 'Reconnect'}
      </button>
    </div>
  );
};
