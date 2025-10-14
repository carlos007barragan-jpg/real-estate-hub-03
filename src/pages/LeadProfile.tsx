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
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/leads")}
            className="hover:bg-muted/50 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {leadData.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Lead Profile</p>
          </div>
          <Badge className={`${statusColors[leadData.status as keyof typeof statusColors]} px-4 py-1.5 text-sm font-medium`}>
            {leadData.status}
          </Badge>
        </div>

        {/* Pipeline Stage Card */}
        <Card className="border border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MoveRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Pipeline Progress</h3>
                  <p className="text-sm text-muted-foreground">Track deal progression</p>
                </div>
              </div>
              <Select value={currentStage} onValueChange={handleStageChange}>
                <SelectTrigger className="w-full sm:w-[220px] bg-muted/50 border-border/50">
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
            <div className="space-y-3">
              <Progress value={getStageProgress()} className="h-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">
                  Stage {pipelineStages.indexOf(currentStage) + 1} of {pipelineStages.length}
                </span>
                <span className="text-primary font-semibold">{Math.round(getStageProgress())}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact & Property Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <Card className="border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                    <p className="font-medium text-sm truncate">{leadData.email}</p>
                  </div>
                </div>
                
                <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                    <p className="font-medium text-sm">{leadData.phone}</p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Lead Date</p>
                      <p className="font-medium text-sm">{leadData.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 rounded-lg">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Source</p>
                      <p className="font-medium text-sm">{leadData.source}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
                      <p className="font-medium text-sm">{leadData.assignedTo || "Unassigned"}</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-2 pt-2">
                  <TwilioCallInterface 
                    leadPhone={leadData.phone}
                    leadName={leadData.name}
                  />
                  
                  <Button onClick={handleCall} className="w-full gap-2 hover:scale-[1.02] transition-transform" variant="outline">
                    <Phone className="h-4 w-4" />
                    Send SMS
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Property Interest */}
            <Card className="border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  Property Interest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Address</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="font-medium text-sm leading-relaxed">{leadData.propertyInterest.address}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Type</p>
                    <p className="font-semibold text-sm">{leadData.propertyInterest.propertyType}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Beds/Baths</p>
                    <p className="font-semibold text-sm">{leadData.propertyInterest.bedrooms} / {leadData.propertyInterest.bathrooms}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Square Feet</p>
                    <p className="font-semibold text-sm">{leadData.propertyInterest.sqft}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Budget</p>
                    <p className="font-bold text-sm text-primary">{leadData.propertyInterest.budget}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tabbed Content */}
          <div className="lg:col-span-2">
            <Card className="border border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
              <Tabs defaultValue="messages" className="w-full">
                <CardHeader className="pb-4 bg-muted/20">
                  <TabsList className="grid w-full grid-cols-3 h-12 bg-background">
                    <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Messages</span>
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <PlusCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Notes</span>
                    </TabsTrigger>
                    <TabsTrigger value="calls" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="hidden sm:inline">Call History</span>
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <TabsContent value="messages" className="px-6 pb-6 m-0">
                  <div className="flex flex-col h-[calc(100vh-20rem)]">
                    <ScrollArea className="flex-1 pr-4 mb-4">
                      <div className="space-y-3 py-2">
                        {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="p-4 rounded-full bg-muted/50 mb-3">
                              <Send className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">No messages yet</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">Start the conversation below</p>
                          </div>
                        ) : (
                          messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"} animate-fade-in`}
                            >
                              <div
                                className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm ${
                                  message.sender === "agent"
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-muted/80 rounded-bl-sm border border-border/40"
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.text}</p>
                                <p
                                  className={`text-xs mt-1.5 ${
                                    message.sender === "agent"
                                      ? "text-primary-foreground/70"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {message.timestamp}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2 pt-2 border-t border-border/40">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        className="flex-1 bg-muted/50 border-border/50 focus-visible:ring-primary"
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        className="gap-2 hover:scale-[1.02] transition-transform"
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="px-6 pb-6 m-0">
                  <div className="flex flex-col h-[calc(100vh-20rem)]">
                    <ScrollArea className="flex-1 pr-4 mb-4">
                      <div className="space-y-3 py-2">
                        {notes.map((note) => (
                          <Card 
                            key={note.id} 
                            className="p-4 bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors animate-fade-in"
                          >
                            <p className="text-sm leading-relaxed mb-3">{note.content}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground px-2 py-1 rounded-md bg-background/80">
                                {note.author}
                              </span>
                              <span className="text-muted-foreground">{note.timestamp}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <Textarea
                        placeholder="Add a new note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[100px] bg-muted/50 border-border/50 focus-visible:ring-primary resize-none"
                      />
                      <Button 
                        onClick={handleAddNote} 
                        className="w-full gap-2 hover:scale-[1.01] transition-transform"
                        disabled={!newNote.trim()}
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add Note
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="calls" className="px-6 pb-6 m-0">
                  <div className="h-[calc(100vh-20rem)]">
                    <ScrollArea className="h-full pr-4">
                      <CallHistory leadId={id!} />
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadProfile;
