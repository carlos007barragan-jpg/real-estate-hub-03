import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, Calendar, User, Building2, Send, PlusCircle, MoveRight, LayoutGrid, Columns2, Table2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TwoColumnLayout } from "@/components/layouts/TwoColumnLayout";
import { SingleColumnLayout } from "@/components/layouts/SingleColumnLayout";
import { TableLayout } from "@/components/layouts/TableLayout";
import { ForwardLeadDialog } from "@/components/ForwardLeadDialog";

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

// Lead Lifecycle stages - before moving to pipeline
const leadLifecycleStages = [
  "Contact",
  "Book Consult",
  "Execute Consult",
  "Showings",
  "Moved to Pipeline"
] as const;

type LeadLifecycle = typeof leadLifecycleStages[number];

// Pipeline stages - after lifecycle is complete
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
type LayoutVariant = "two-column" | "single-column" | "table";

const LeadProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentLifecycle, setCurrentLifecycle] = useState<LeadLifecycle>("Contact");
  const [currentStage, setCurrentStage] = useState<PipelineStage>("New Lead");
  const [currentPipeline, setCurrentPipeline] = useState<string>("");
  const [layoutVariant, setLayoutVariant] = useState<LayoutVariant>("two-column");

  const availablePipelines = [
    { id: "real-estate", name: "Real Estate Sales" },
    { id: "commercial", name: "Commercial Properties" },
  ];

  const fetchNotes = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotes(data?.map(note => ({
        id: note.id,
        content: note.content,
        author: note.author,
        timestamp: new Date(note.created_at).toLocaleString(),
      })) || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

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
          spousePhone: data.spouse_phone || null,
          spouseEmail: data.spouse_email || null,
          status: data.status,
          source: data.source,
          value: data.value || "$0",
          date: new Date(data.created_at).toLocaleDateString(),
          assignedTo: data.assigned_to || "Unassigned",
          timeframe: data.timeframe || "Not specified",
          leadLifecycle: data.lead_lifecycle as LeadLifecycle,
          pipelineStage: data.pipeline_stage as PipelineStage,
          pipeline: data.pipeline || null,
          downPayment: data.down_payment || null,
          financingType: data.financing_type || null,
          area: data.area || null,
          maritalStatus: data.marital_status || null,
          currentAddress: data.current_address || null,
          leadTemperature: data.lead_temperature || null,
          languagePreference: data.language_preference || null,
          preferredContactMethod: data.preferred_contact_method || null,
          socialStatus: data.social_status || null,
          propertyInterest: {
            address: data.property_address || "Not specified",
            propertyType: data.property_type || "Not specified",
            bedrooms: data.bedrooms || 0,
            bathrooms: data.bathrooms || 0,
            sqft: data.sqft || "0",
            budget: data.budget || "Not specified",
          },
        });
        setCurrentLifecycle(data.lead_lifecycle as LeadLifecycle);
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

  useEffect(() => {
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
  const [notes, setNotes] = useState<Note[]>([]);
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

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("notes").insert({
        lead_id: id,
        user_id: userData.user.id,
        content: newNote,
        author: "Agent",
        note_type: "general",
      });

      if (error) throw error;

      toast({
        title: "Note added",
        description: "Note has been saved successfully",
      });

      setNewNote("");
      await fetchNotes();
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLifecycleChange = async (newLifecycle: LeadLifecycle) => {
    if (!leadData) return;
    
    try {
      const { error } = await supabase
        .from("leads")
        .update({ lead_lifecycle: newLifecycle })
        .eq("id", leadData.id);

      if (error) throw error;

      setCurrentLifecycle(newLifecycle);
      toast({
        title: "Lead Lifecycle Updated",
        description: `Lead moved to ${newLifecycle}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  const handlePipelineChange = async (newPipeline: string) => {
    if (!leadData) return;
    
    try {
      const { error } = await supabase
        .from("leads")
        .update({ pipeline: newPipeline })
        .eq("id", leadData.id);

      if (error) throw error;

      setCurrentPipeline(newPipeline);
      toast({
        title: "Pipeline Updated",
        description: `Lead assigned to ${availablePipelines.find(p => p.id === newPipeline)?.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLeadTemperatureChange = async (newTemperature: 'hot' | 'warm' | 'cold') => {
    if (!leadData) return;
    
    try {
      const { error } = await supabase
        .from("leads")
        .update({ lead_temperature: newTemperature })
        .eq("id", leadData.id);

      if (error) throw error;

      setLeadData({ ...leadData, leadTemperature: newTemperature });
      toast({
        title: "Lead Status Updated",
        description: `Lead status changed to ${newTemperature}`,
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

  const getLifecycleProgress = () => {
    const index = leadLifecycleStages.indexOf(currentLifecycle);
    return ((index + 1) / leadLifecycleStages.length) * 100;
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {leadData.name}
              </h1>
              <Select value={leadData.leadTemperature || 'warm'} onValueChange={handleLeadTemperatureChange}>
                <SelectTrigger className={`w-[110px] h-8 text-xs capitalize px-3 py-1 ${
                  leadData.leadTemperature === 'hot' 
                    ? 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400' 
                    : leadData.leadTemperature === 'warm' 
                    ? 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400'
                    : 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
                }`}>
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">🔥 Hot</SelectItem>
                  <SelectItem value="warm">☀️ Warm</SelectItem>
                  <SelectItem value="cold">❄️ Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Lead Profile</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={layoutVariant === "two-column" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayoutVariant("two-column")}
              className="h-8 w-8"
            >
              <Columns2 className="h-4 w-4" />
            </Button>
            <Button
              variant={layoutVariant === "single-column" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayoutVariant("single-column")}
              className="h-8 w-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layoutVariant === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayoutVariant("table")}
              className="h-8 w-8"
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <div className="h-8 w-px bg-border mx-2" />
            <ForwardLeadDialog
              leadId={leadData.id}
              currentAgent={leadData.assignedTo}
              onSuccess={fetchLead}
            />
          </div>
          <Badge className={`${statusColors[leadData.status as keyof typeof statusColors]} px-4 py-1.5 text-sm font-medium`}>
            {leadData.status}
          </Badge>
        </div>

        {/* Lifecycle Progress Bar */}
        <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
          <MoveRight className="h-4 w-4 text-primary" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Lead Lifecycle</span>
              <span className="text-xs text-muted-foreground">{Math.round(getLifecycleProgress())}%</span>
            </div>
            <Progress value={getLifecycleProgress()} className="h-1.5" />
          </div>
          <Select value={currentLifecycle} onValueChange={handleLifecycleChange}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leadLifecycleStages.map((stage) => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentLifecycle === "Moved to Pipeline" && (
          <>
            <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
              <Layers className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <span className="text-xs font-medium">Select Pipeline</span>
              </div>
              <Select value={currentPipeline} onValueChange={handlePipelineChange}>
                <SelectTrigger className="w-[180px] h-7 text-xs">
                  <SelectValue placeholder="Choose pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
              <Building2 className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Pipeline Progress</span>
                  <span className="text-xs text-muted-foreground">{Math.round(getStageProgress())}%</span>
                </div>
                <Progress value={getStageProgress()} className="h-1.5" />
              </div>
              <Select value={currentStage} onValueChange={handleStageChange}>
                <SelectTrigger className="w-[140px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {layoutVariant === "two-column" && (
          <TwoColumnLayout
            leadData={leadData}
            handleCall={handleCall}
            handleSendMessage={handleSendMessage}
            handleAddNote={handleAddNote}
            messages={messages}
            notes={notes}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            newNote={newNote}
            setNewNote={setNewNote}
            id={id}
            onLeadUpdate={fetchLead}
          />
        )}

        {layoutVariant === "single-column" && (
          <SingleColumnLayout
            leadData={leadData}
            handleCall={handleCall}
            handleSendMessage={handleSendMessage}
            handleAddNote={handleAddNote}
            messages={messages}
            notes={notes}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            newNote={newNote}
            setNewNote={setNewNote}
            id={id}
            onLeadUpdate={fetchLead}
          />
        )}

        {layoutVariant === "table" && (
          <TableLayout
            leadData={leadData}
            handleCall={handleCall}
            handleSendMessage={handleSendMessage}
            handleAddNote={handleAddNote}
            messages={messages}
            notes={notes}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            newNote={newNote}
            setNewNote={setNewNote}
            id={id}
            onLeadUpdate={fetchLead}
          />
        )}
      </div>
    </div>
  );
};

export default LeadProfile;
