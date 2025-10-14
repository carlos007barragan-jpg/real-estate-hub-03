import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, Calendar, User, Building2, Send, PlusCircle, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TwilioCallInterface } from "@/components/TwilioCallInterface";
import { CallHistory } from "@/components/CallHistory";

interface Message {
  id: string;
  text: string;
  sender: "agent" | "lead";
  timestamp: string;
}

interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

// Pipeline stages
const pipelineStages = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Showing Scheduled",
  "Offer Made",
  "Under Contract",
  "Closed Won",
  "Closed Lost"
] as const;

type PipelineStage = typeof pipelineStages[number];


const LeadProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState<PipelineStage>("New Lead");

  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data) {
          setLeadData({
            id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: data.status,
            source: data.source,
            value: data.value || "$0",
            date: new Date(data.created_at).toLocaleDateString(),
            assignedTo: data.assigned_to || "Unassigned",
            pipelineStage: data.pipeline_stage as PipelineStage,
            propertyInterest: {
              address: data.property_address || "Not specified",
              propertyType: data.property_type || "Not specified",
              bedrooms: data.bedrooms || 0,
              bathrooms: data.bathrooms || 0,
              sqft: data.sqft || "0",
              budget: data.budget || "Not specified",
            },
          });
          setCurrentStage(data.pipeline_stage as PipelineStage);
        }
      } catch (error: any) {
        console.error("Error fetching lead:", error);
        toast({
          title: "Error loading lead",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLead();

    // Fetch SMS logs
    const fetchMessages = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('sms_logs')
          .select('*')
          .eq('lead_id', id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data) {
          const formattedMessages: Message[] = data.map((log) => ({
            id: log.id,
            text: log.message,
            sender: "agent",
            timestamp: new Date(log.created_at).toLocaleString(),
          }));
          setMessages(formattedMessages);
        }
      } catch (error: any) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Subscribe to real-time SMS updates
    const channel = supabase
      .channel('sms_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sms_logs',
          filter: `lead_id=eq.${id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, toast]);

  const [messages, setMessages] = useState<Message[]>([]);

  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      content: "Lead is very interested in properties with large backyards. Has a budget of $450k.",
      author: "John Smith",
      timestamp: "2024-01-15 2:30 PM",
    },
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [newNote, setNewNote] = useState("");

  const handleSendMessage = async () => {
    if (newMessage.trim() && leadData) {
      try {
        const { error } = await supabase.functions.invoke('send-sms', {
          body: {
            to: leadData.phone,
            message: newMessage,
            leadId: leadData.id
          }
        });

        if (error) throw error;

        toast({
          title: "Message sent!",
          description: `Message sent to ${leadData.name}`,
        });
        setNewMessage("");
      } catch (error: any) {
        console.error('Error sending message:', error);
        toast({
          title: "Failed to send message",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: (notes.length + 1).toString(),
        content: newNote,
        author: "Current Agent",
        timestamp: new Date().toLocaleString(),
      };
      setNotes([...notes, note]);
      setNewNote("");
    }
  };

  const handleStageChange = async (newStage: PipelineStage) => {
    if (!leadData) return;
    
    try {
      const { error } = await supabase
        .from("leads")
        .update({ pipeline_stage: newStage })
        .eq("id", leadData.id);

      if (error) throw error;

      setCurrentStage(newStage);
      toast({
        title: "Pipeline Stage Updated",
        description: `Lead moved to ${newStage}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCall = async () => {
    try {
      toast({
        title: "Sending SMS...",
        description: "Please wait",
      });

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: leadData.phone,
          message: `Hi ${leadData.name}, this is ${leadData.assignedTo} from RealEstate CRM. I'd like to discuss your property interest. When would be a good time to talk?`,
          leadId: leadData.id
        }
      });

      if (error) throw error;

      toast({
        title: "SMS Sent Successfully!",
        description: `Message sent to ${leadData.phone}`,
      });
    } catch (error: any) {
      console.error('SMS error:', error);
      toast({
        title: "Failed to send SMS",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMakeCall = async () => {
    try {
      toast({
        title: "Initiating call...",
        description: "Please wait",
      });

      const { data, error } = await supabase.functions.invoke('make-call', {
        body: {
          to: leadData.phone,
          leadName: leadData.name
        }
      });

      if (error) throw error;

      toast({
        title: "Call initiated!",
        description: `Calling ${leadData.name} at ${leadData.phone}`,
      });
    } catch (error: any) {
      console.error('Call error:', error);
      toast({
        title: "Failed to initiate call",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStageProgress = () => {
    const index = pipelineStages.indexOf(currentStage);
    return ((index + 1) / pipelineStages.length) * 100;
  };

  const statusColors = {
    new: "bg-info text-info-foreground",
    contacted: "bg-warning text-warning-foreground",
    qualified: "bg-success text-success-foreground",
    unqualified: "bg-muted text-muted-foreground",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <p className="text-muted-foreground">Loading lead profile...</p>
      </div>
    );
  }

  if (!leadData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Lead not found</p>
          <Button onClick={() => navigate("/leads")}>Back to Leads</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/leads")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{leadData.name}</h1>
            <p className="text-muted-foreground">Lead Profile</p>
          </div>
          <Badge className={statusColors[leadData.status as keyof typeof statusColors]}>
            {leadData.status}
          </Badge>
        </div>

        {/* Pipeline Stage Card */}
        <Card className="border-border/50 shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MoveRight className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Pipeline Stage</h3>
              </div>
              <Select value={currentStage} onValueChange={handleStageChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Progress value={getStageProgress()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {pipelineStages.indexOf(currentStage) + 1} of {pipelineStages.length} stages complete
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Contact & Property Info */}
          <div className="xl:col-span-3 space-y-6">
            {/* Contact Information */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium truncate">{leadData.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{leadData.phone}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lead Date</p>
                    <p className="font-medium">{leadData.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="font-medium">{leadData.source}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="font-medium">{leadData.assignedTo || "Unassigned"}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <TwilioCallInterface 
                    leadPhone={leadData.phone}
                    leadName={leadData.name}
                  />
                  
                  <Button onClick={handleCall} className="w-full gap-2" variant="outline">
                    <Phone className="h-4 w-4" />
                    Send SMS
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Property Interest */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Property Interest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Address</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="font-medium text-sm">{leadData.propertyInterest.address}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium">{leadData.propertyInterest.propertyType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Beds/Baths</p>
                    <p className="font-medium">{leadData.propertyInterest.bedrooms} / {leadData.propertyInterest.bathrooms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sq Ft</p>
                    <p className="font-medium">{leadData.propertyInterest.sqft}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="font-medium text-primary">{leadData.propertyInterest.budget}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Messages */}
          <div className="xl:col-span-5">
            <Card className="border-border/50 shadow-lg h-[calc(100vh-12rem)] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.sender === "agent"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.sender === "agent"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} className="gap-2">
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notes & Call History */}
          <div className="xl:col-span-4 space-y-6">
            {/* Notes Section */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <Card key={note.id} className="p-3 bg-muted/50">
                        <p className="text-sm mb-2">{note.content}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium">{note.author}</span>
                          <span>{note.timestamp}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="space-y-2 pt-2">
                  <Textarea
                    placeholder="Add a new note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleAddNote} className="w-full gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add Note
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Call History Section */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Call History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <CallHistory leadId={id!} />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadProfile;
