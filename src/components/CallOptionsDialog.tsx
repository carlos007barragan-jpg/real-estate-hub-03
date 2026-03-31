import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, PhoneOutgoing, PhoneCall, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CallOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadPhone: string;
  leadName: string;
  leadId: string;
  onSystemCall: () => void;
  onCallLogged?: () => void;
}

export const CallOptionsDialog = ({
  open,
  onOpenChange,
  leadPhone,
  leadName,
  leadId,
  onSystemCall,
  onCallLogged,
}: CallOptionsDialogProps) => {
  const { toast } = useToast();
  const [showLogForm, setShowLogForm] = useState(false);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("connected");
  const [logging, setLogging] = useState(false);

  const handleSystemCall = () => {
    onOpenChange(false);
    setShowLogForm(false);
    onSystemCall();
  };

  const handleLogManualCall = async () => {
    setLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const durationSecs = duration ? parseInt(duration) * 60 : 0;
      const callStatus = outcome === "connected" ? "completed" : outcome;

      const { error } = await supabase.from("call_logs").insert({
        user_id: user.id,
        lead_id: leadId,
        call_sid: `manual-${Date.now()}`,
        from_number: "personal",
        to_number: leadPhone,
        status: callStatus,
        duration: durationSecs,
        direction: "outbound",
      });

      if (error) throw error;

      // Also add a note if provided
      if (notes.trim()) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", user.id)
          .maybeSingle();

        const authorName = profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown"
          : "Unknown";

        const outcomeLabels: Record<string, string> = {
          connected: "Connected",
          "no-answer": "No Answer",
          voicemail: "Left Voicemail",
          "call-back": "Call Back Later",
          busy: "Busy",
        };
        const outcomeLabel = outcomeLabels[outcome] || outcome;

        await supabase.from("notes").insert({
          lead_id: leadId,
          user_id: user.id,
          author: authorName,
          content: `📞 Manual call logged (${outcomeLabel}${duration ? `, ${duration} min` : ""}): ${notes}`,
          note_type: "call_note",
        });
      }

      // Auto-complete matching pending follow-up (call type) only if connected
      if (outcome === "connected") {
        await supabase
          .from("follow_ups")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("lead_id", leadId)
          .eq("action_type", "call")
          .eq("status", "pending")
          .order("sequence_order", { ascending: true })
          .limit(1);
      }

      const outcomeToast = outcome === "connected" ? "Call logged" : "Call attempt logged";
      toast({ title: outcomeToast, description: outcome === "connected" ? "Manual call has been recorded successfully" : `Recorded as: ${outcome === "no-answer" ? "No Answer" : outcome}` });
      setShowLogForm(false);
      setDuration("");
      setNotes("");
      setOutcome("connected");
      onOpenChange(false);
      onCallLogged?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLogging(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setShowLogForm(false);
      setDuration("");
      setNotes("");
      setOutcome("connected");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Call {leadName}
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to reach out to this contact.
          </DialogDescription>
        </DialogHeader>

        {!showLogForm ? (
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleSystemCall}
              className="w-full justify-start gap-3 h-14 text-left bg-success hover:bg-success/90"
            >
              <PhoneOutgoing className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Call from System</p>
                <p className="text-xs opacity-80">Use the built-in phone to call {leadPhone}</p>
              </div>
            </Button>

            <Button
              onClick={() => setShowLogForm(true)}
              variant="outline"
              className="w-full justify-start gap-3 h-14 text-left"
            >
              <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-sm">Log a Manual Call</p>
                <p className="text-xs text-muted-foreground">Record a call made from your personal phone</p>
              </div>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Call Outcome
              </label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="no-answer">No Answer</SelectItem>
                  <SelectItem value="voicemail">Left Voicemail</SelectItem>
                  <SelectItem value="call-back">Call Back Later</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Call Duration (minutes)
              </label>
              <Input
                type="number"
                placeholder="e.g. 15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="0"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Call Notes (optional)
              </label>
              <Textarea
                placeholder="What was discussed? Any follow-up needed?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleLogManualCall} disabled={logging} className="flex-1">
                {logging ? "Logging..." : "Log Call"}
              </Button>
              <Button variant="outline" onClick={() => setShowLogForm(false)}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
