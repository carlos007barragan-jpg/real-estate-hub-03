import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Device, Call } from "@twilio/voice-sdk";
import { CallOptionsDialog } from "@/components/CallOptionsDialog";

interface TwilioCallInterfaceProps {
  leadPhone: string;
  leadName: string;
  leadId?: string;
  onCallEnd?: () => void;
}

export const TwilioCallInterface = ({ leadPhone, leadName, leadId, onCallEnd }: TwilioCallInterfaceProps) => {
  const { toast } = useToast();
  const [device, setDevice] = useState<Device | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (call) {
        call.disconnect();
      }
      if (device) {
        device.destroy();
      }
    };
  }, []);

  const initializeDevice = async () => {
    try {
      setIsInitializing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke('get-twilio-token', {
        body: { identity: user.email }
      });

      if (error) throw error;

      const newDevice = new Device(data.token, {
        logLevel: 1,
      });

      newDevice.on('registered', () => {
        console.log('Twilio Device ready');
      });

      newDevice.on('error', (error) => {
        console.error('Twilio Device error:', error);
        toast({
          title: "Device Error",
          description: error.message,
          variant: "destructive",
        });
      });

      newDevice.on('incoming', (incoming) => {
        console.log('Incoming call from:', (incoming as any).parameters?.From);
        setIncomingCall(incoming);
        toast({
          title: 'Incoming call',
          description: `From ${(incoming as any).parameters?.From || 'Unknown'}`,
        });
      });

      await newDevice.register();
      setDevice(newDevice);
      
      return newDevice;
    } catch (error: any) {
      console.error('Error initializing device:', error);
      toast({
        title: "Initialization Failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsInitializing(false);
    }
  };

  // Auto-register device to receive incoming calls
  useEffect(() => {
    initializeDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = async () => {
    try {
      let activeDevice = device;
      
      if (!activeDevice) {
        activeDevice = await initializeDevice();
        if (!activeDevice) return;
      }

      // Normalize phone number
      const normalizedPhone = leadPhone.replace(/\D/g, '');
      const e164Phone = normalizedPhone.startsWith('1') 
        ? `+${normalizedPhone}` 
        : `+1${normalizedPhone}`;

      const outgoingCall = await activeDevice.connect({
        params: {
          To: e164Phone
        }
      });

      setCall(outgoingCall);
      setCallDuration(0);

      // Log the call initiation
      const { data: { user } } = await supabase.auth.getUser();
      if (user && outgoingCall.parameters.CallSid) {
        const leadId = window.location.pathname.split('/').pop();
        await supabase.from('call_logs').insert({
          user_id: user.id,
          lead_id: leadId,
          call_sid: outgoingCall.parameters.CallSid,
          from_number: 'browser',
          to_number: e164Phone,
          status: 'ringing',
        });
      }

      // Start duration counter
      intervalRef.current = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      outgoingCall.on('disconnect', () => {
        endCall();
      });

      toast({
        title: "Calling...",
        description: `Connecting to ${leadName}`,
      });
    } catch (error: any) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const acceptIncoming = async () => {
    if (!incomingCall) return;
    setCall(incomingCall);
    setIncomingCall(null);
    setCallDuration(0);
    // Start duration counter
    intervalRef.current = window.setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    incomingCall.on('disconnect', () => {
      endCall();
    });
    try {
      await incomingCall.accept();
      toast({ title: 'Call connected' });
    } catch (e: any) {
      console.error('Failed to accept call', e);
      toast({ title: 'Failed to accept call', description: e.message, variant: 'destructive' });
      setCall(null);
    }
  };

  const declineIncoming = () => {
    try { incomingCall?.reject(); } catch (_) {}
    setIncomingCall(null);
  };

  const endCall = async () => {
    const finalDuration = callDuration;
    const currentCallSid = call?.parameters.CallSid;
    
    console.log('Ending call - Duration:', finalDuration, 'seconds, CallSid:', currentCallSid);
    
    if (call) {
      call.disconnect();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Update call log with final duration
    if (currentCallSid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('call_logs').update({
          status: 'completed',
          duration: finalDuration,
        }).eq('call_sid', currentCallSid);
        
        if (error) {
          console.error('Error updating call duration:', error);
        } else {
          console.log('Call log updated with duration:', finalDuration);
        }
      }
    }
    
    setCall(null);
    setCallDuration(0);
    setIsMuted(false);
    
    toast({
      title: "Call Ended",
      description: `Duration: ${formatDuration(finalDuration)}`,
    });
    
    onCallEnd?.();
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

  if (incomingCall) {
    return (
      <Card className="border-warning">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Incoming call</p>
              <p className="text-lg font-semibold">{leadName}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={acceptIncoming} variant="default" className="gap-2">
                <Phone className="h-4 w-4" />
                Answer
              </Button>
              <Button onClick={declineIncoming} variant="destructive" className="gap-2">
                <PhoneOff className="h-4 w-4" />
                Decline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (call) {
    return (
      <Card className="border-success">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">On call with</p>
              <p className="text-lg font-semibold">{leadName}</p>
              <p className="text-2xl font-mono text-success">{formatDuration(callDuration)}</p>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              
              <Button
                onClick={endCall}
                variant="destructive"
                className="gap-2"
              >
                <PhoneOff className="h-4 w-4" />
                End Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const derivedLeadId = leadId || window.location.pathname.split('/').pop() || "";

  return (
    <>
      <Button
        id="start-call-button"
        onClick={() => setShowCallOptions(true)}
        disabled={isInitializing}
        size="default"
        className="w-full gap-2 bg-success hover:bg-success/90 hover-scale"
        title="Call Options"
        aria-label="Call Options"
      >
        <Phone className="h-4 w-4" />
        Call
      </Button>
      <CallOptionsDialog
        open={showCallOptions}
        onOpenChange={setShowCallOptions}
        leadPhone={leadPhone}
        leadName={leadName}
        leadId={derivedLeadId}
        onSystemCall={startCall}
        onCallLogged={onCallEnd}
      />
    </>
  );
};
