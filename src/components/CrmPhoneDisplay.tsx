import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Copy, Check, PhoneIncoming } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function CrmPhoneDisplay() {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCrmPhone();
  }, []);

  const fetchCrmPhone = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-crm-phone");
      if (error) throw error;
      setPhoneNumber(data?.phone_number || null);
    } catch (error) {
      console.error("Error fetching CRM phone:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!phoneNumber) return;
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      toast({ title: "Copied!", description: "CRM phone number copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <PhoneIncoming className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">CRM Inbound Phone Number</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        This is the number clients call to reach your team. Inbound calls ring all active agents logged into the CRM simultaneously.
      </p>

      {loading ? (
        <Skeleton className="h-12 w-64" />
      ) : phoneNumber ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-lg">
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-lg font-mono font-semibold text-foreground">{phoneNumber}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Badge variant="secondary" className="text-xs">
            Rings all active agents
          </Badge>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No CRM phone number configured. Contact your administrator to set up Twilio integration.
        </p>
      )}
    </Card>
  );
}
