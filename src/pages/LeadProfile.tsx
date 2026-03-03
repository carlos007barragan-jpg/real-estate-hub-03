import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, Calendar, User, Building2, Send, PlusCircle, MoveRight, Layers, Archive, ArchiveRestore, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TwoColumnLayout } from "@/components/layouts/TwoColumnLayout";
import { PipelineAssignmentDialog } from "@/components/PipelineAssignmentDialog";
import { DealClosedDialog } from "@/components/DealClosedDialog";
import { AddDealDialog } from "@/components/AddDealDialog";
import { LeadDealsAccordion } from "@/components/LeadDealsAccordion";
import { fireDealWonConfetti } from "@/lib/confetti";
import { useAuth } from "@/contexts/AuthContext";

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
  "Moved to Pipeline",
  "Archived"
] as const;

type LeadLifecycle = typeof leadLifecycleStages[number];

interface PipelineStageOption {
  id: string;
  name: string;
}

const LeadProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();
  
  const wonStageNames = ["closed", "sold", "funded", "closed won", "deal won"];
  
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentLifecycle, setCurrentLifecycle] = useState<LeadLifecycle>("Contact");
  const [currentStage, setCurrentStage] = useState<string>("New Lead");
  const [currentPipeline, setCurrentPipeline] = useState<string>("");
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [pipelineName, setPipelineName] = useState<string>("");
  const [pipelineStages, setPipelineStages] = useState<PipelineStageOption[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newNote, setNewNote] = useState("");
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [commissionStageName, setCommissionStageName] = useState("");
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [leadDeals, setLeadDeals] = useState<any[]>([]);

  const fetchLeadDeals = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("lead_deals")
        .select("*")
        .eq("lead_id", id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setLeadDeals(data || []);
    } catch (error) {
      console.error("Error fetching lead deals:", error);
    }
  };
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

  // Fetch pipeline details (name + stages) when pipeline ID changes
  const fetchPipelineDetails = async (pipelineId: string) => {
    if (!pipelineId) {
      setPipelineName("");
      setPipelineStages([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("pipelines")
        .select("name, stages")
        .eq("id", pipelineId)
        .single();

      if (error) throw error;

      if (data) {
        setPipelineName(data.name);
        const stages = (data.stages as any[]) || [];
        setPipelineStages(stages.map((s: any) => ({ id: s.id, name: s.name })));
      }
    } catch (error) {
      console.error("Error fetching pipeline details:", error);
      setPipelineName("");
      setPipelineStages([]);
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
          spouseName: data.spouse_name || null,
          status: data.status,
          source: data.source,
          value: data.value || "$0",
          date: new Date(data.created_at).toLocaleDateString(),
          assignedTo: data.assigned_to || "Unassigned",
          timeframe: data.timeframe || "Not specified",
          leadLifecycle: data.lead_lifecycle as LeadLifecycle,
          pipelineStage: data.pipeline_stage,
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
          closeDate: data.close_date ? new Date(data.close_date).toLocaleDateString() : null,
          commission: data.commission || null,
          propertyOfInterest: data.property_of_interest || null,
          titleOffice: data.title_office || null,
          inventory_id: data.inventory_id || null,
          property_address: data.property_address || null,
          property_type: data.property_type || null,
          bedrooms: data.bedrooms || null,
          bathrooms: data.bathrooms || null,
          sqft: data.sqft || null,
          budget: data.budget || null,
          user_id: data.user_id,
          agent_phone: data.agent_phone || null,
          // New transaction-type-specific fields
          title_company: (data as any).title_company || null,
          loan_details: (data as any).loan_details || null,
          llc_information: (data as any).llc_information || null,
          purchase_price: (data as any).purchase_price || null,
          rehab_amount: (data as any).rehab_amount || null,
          estimated_credit_score: (data as any).estimated_credit_score || null,
          estimated_close_date: (data as any).estimated_close_date || null,
          preferred_lender_id: (data as any).preferred_lender_id || null,
          list_price: (data as any).list_price || null,
          town: (data as any).town || null,
          school_district: (data as any).school_district || null,
          contract_price: (data as any).contract_price || null,
          property_condition: (data as any).property_condition || null,
          year_built: (data as any).year_built || null,
          listing_documents: (data as any).listing_documents || null,
          number_of_units: (data as any).number_of_units || null,
          unit_mix: (data as any).unit_mix || null,
          cap_rate: (data as any).cap_rate || null,
          noi: (data as any).noi || null,
          zoning: (data as any).zoning || null,
          commercial_property_type: (data as any).commercial_property_type || null,
          investor_deals: (data as any).investor_deals || [],
          propertyInterest: {
            address: data.property_address || "Not specified",
            propertyType: data.property_type || "Not specified",
            bedrooms: data.bedrooms || 0,
            bathrooms: data.bathrooms || 0,
            sqft: data.sqft || "0",
            budget: data.budget || "Not specified",
          },
          customData: data.custom_data || {},
        });
        setCurrentLifecycle(data.lead_lifecycle as LeadLifecycle);
        setCurrentStage(data.pipeline_stage || "New Lead");
        setCurrentPipeline(data.pipeline || "");
        
        // Fetch pipeline details if assigned
        if (data.pipeline) {
          await fetchPipelineDetails(data.pipeline);
        }
        
        // Fetch custom fields for this user
        await fetchCustomFields(data.user_id);
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

  const fetchCustomFields = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("user_id", userId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    }
  };

  useEffect(() => {
    fetchLead();
    fetchNotes();
    fetchLeadDeals();

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

  const handleUpdateNote = async (noteId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq("id", noteId);

      if (error) throw error;

      toast({ title: "Note updated" });
      await fetchNotes();
    } catch (error: any) {
      console.error("Error updating note:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLifecycleChange = async (newLifecycle: LeadLifecycle) => {
    if (!leadData) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // If moving to Pipeline, show assignment dialog
    if (newLifecycle === "Moved to Pipeline") {
      try {
        const { error } = await supabase
          .from("leads")
          .update({ 
            lead_lifecycle: newLifecycle,
            last_modified_by: user?.id,
            is_archived: false,
            archived_at: null,
          })
          .eq("id", leadData.id);

        if (error) throw error;

        setCurrentLifecycle(newLifecycle);
        setPipelineDialogOpen(true);
        await fetchLead();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    // Handle archiving
    const isArchiving = newLifecycle === "Archived";
    const archiveFields = isArchiving
      ? { is_archived: true, archived_at: new Date().toISOString() }
      : { is_archived: false, archived_at: null };
    
    try {
      const { error } = await supabase
        .from("leads")
        .update({ 
          lead_lifecycle: newLifecycle,
          last_modified_by: user?.id,
          ...archiveFields,
        })
        .eq("id", leadData.id);

      if (error) throw error;

      // When archiving, clean up all open items for this lead
      if (isArchiving) {
        await Promise.all([
          // Cancel open tasks
          supabase
            .from("tasks")
            .update({ status: "cancelled" })
            .eq("lead_id", leadData.id)
            .in("status", ["pending", "in_progress"]),
          // Cancel upcoming appointments
          supabase
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("lead_id", leadData.id)
            .in("status", ["scheduled", "pending"]),
          // Cancel pending follow-ups
          supabase
            .from("follow_ups")
            .update({ status: "cancelled" })
            .eq("lead_id", leadData.id)
            .eq("status", "pending"),
          // Cancel active workflow instances
          supabase
            .from("workflow_instances")
            .update({ status: "cancelled" })
            .eq("lead_id", leadData.id)
            .eq("status", "active"),
        ]);
      }

      setCurrentLifecycle(newLifecycle);
      await fetchLead();
      toast({
        title: isArchiving ? "Lead Archived" : "Lead Lifecycle Updated",
        description: isArchiving ? `${leadData.name} has been archived` : `Lead moved to ${newLifecycle}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!leadData) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Special handling for moving back to lifecycle
    if (newStage === "Back to Lifecycle") {
      try {
        const { error } = await supabase
          .from("leads")
          .update({ 
            lead_lifecycle: "Contact",
            pipeline: null,
            pipeline_stage: "New Lead",
            last_modified_by: user?.id,
          })
          .eq("id", id);
        
        if (!error) {
          toast({
            title: "Success",
            description: "Lead moved back to lifecycle stages",
          });
          await fetchLead();
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }
    
    try {
      const { error } = await supabase
        .from("leads")
        .update({ 
          pipeline_stage: newStage,
          last_modified_by: user?.id,
        })
        .eq("id", leadData.id);

      if (error) throw error;

      setCurrentStage(newStage);
      await fetchLead();
      
      // Check if this is a won stage
      const isWonStage = wonStageNames.includes(newStage.toLowerCase().trim());
      const isLastStage = pipelineStages.length > 0 && pipelineStages[pipelineStages.length - 1]?.name === newStage;
      
      if (isWonStage || isLastStage) {
        fireDealWonConfetti();
        setCommissionStageName(newStage);
        setCommissionDialogOpen(true);
      }
      
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

  const getLifecycleProgress = () => {
    const index = leadLifecycleStages.indexOf(currentLifecycle);
    return ((index + 1) / leadLifecycleStages.length) * 100;
  };

  const getStageProgress = () => {
    if (pipelineStages.length === 0) return 0;
    const index = pipelineStages.findIndex(s => s.name === currentStage);
    if (index === -1) return 0;
    return ((index + 1) / pipelineStages.length) * 100;
  };

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
        <div className="flex flex-wrap items-center gap-4 animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/leads")}
            className="hover:bg-muted/50 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {leadData.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Lead Profile</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className="bg-primary/10 text-primary px-4 py-1.5 text-sm font-medium border border-primary/20">
              {leadData.leadLifecycle || "Contact"}
            </Badge>
            {currentPipeline && pipelineName && (
              <>
                <span className="text-muted-foreground">→</span>
                <Badge className="bg-accent/50 text-accent-foreground px-4 py-1.5 text-sm font-medium border border-accent/30">
                  {pipelineName}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge className="bg-secondary text-secondary-foreground px-4 py-1.5 text-sm font-medium">
                  {leadData.pipelineStage}
                </Badge>
              </>
            )}
            {!currentPipeline && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setPipelineDialogOpen(true)}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Assign Pipeline
              </Button>
            )}
            {leadDeals.length < 3 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddDealOpen(true)}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Add Transaction
              </Button>
            )}
            {currentLifecycle === "Archived" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleLifecycleChange("Contact")}
                className="gap-2"
              >
                <ArchiveRestore className="h-4 w-4" />
                Unarchive
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm("Are you sure you want to archive this lead? It will be hidden from active leads.")) {
                    handleLifecycleChange("Archived");
                  }
                }}
                className="gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}
          </div>
        </div>

        {/* Show Lifecycle Progress Bar only when NOT in pipeline */}
        {leadData?.leadLifecycle !== "Moved to Pipeline" && (
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
              <SelectTrigger className="w-[160px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
               <SelectContent className="z-50 bg-popover">
                 {leadLifecycleStages.map((stage) => (
                   <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                 ))}
               </SelectContent>
            </Select>
          </div>
        )}

        {/* Show Pipeline Progress when lead is in pipeline */}
        {leadData?.leadLifecycle === "Moved to Pipeline" && (
          <>
            {(leadData?.status === "won" || ["sold", "funded", "closed", "closed won", "deal won", "won", "done", "completed"].includes(currentStage.toLowerCase().trim())) ? null : (currentPipeline || leadData?.pipeline) ? (
              <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                <Building2 className="h-4 w-4 text-primary" />
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                      <span className="text-xs font-medium">
                        {pipelineName || "Pipeline"} Progress
                      </span>
                      {leadData.propertyOfInterest && ["terms negotiation","contract signed","under contract","in process","closing","closed","sold","funded","closed won","deal won","won","pending close","settlement"].includes(currentStage.toLowerCase().trim()) && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {leadData.propertyOfInterest}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round(getStageProgress())}%</span>
                  </div>
                  <Progress value={getStageProgress()} className="h-1.5" />
                </div>
                <Select value={currentStage} onValueChange={handleStageChange}>
                  <SelectTrigger className="w-[160px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                   <SelectContent className="z-50 bg-popover">
                     <SelectItem value="Back to Lifecycle">← Back to Lifecycle</SelectItem>
                     {pipelineStages.map((stage) => (
                       <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>
                     ))}
                   </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPipelineDialogOpen(true)}
                  className="text-xs"
                >
                  Change Pipeline
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                <Layers className="h-4 w-4 text-warning" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-warning">No pipeline assigned</span>
                  <p className="text-xs text-muted-foreground">Assign a pipeline or move back to lifecycle</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleStageChange("Back to Lifecycle")}
                  >
                    ← Back to Lifecycle
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setPipelineDialogOpen(true)}
                  >
                    Assign Pipeline
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Additional Deals Accordion — only shows deals from lead_deals table */}
        {leadDeals.length > 0 && (
          <LeadDealsAccordion
            leadId={leadData.id}
            leadName={leadData.name}
            deals={leadDeals}
            onDealsChange={() => { fetchLeadDeals(); fetchLead(); }}
          />
        )}

        <TwoColumnLayout
          leadData={leadData}
          customFields={customFields}
          handleCall={handleCall}
          handleSendMessage={handleSendMessage}
          handleAddNote={handleAddNote}
          handleUpdateNote={handleUpdateNote}
          messages={messages}
          notes={notes}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          newNote={newNote}
          setNewNote={setNewNote}
          id={id}
          onLeadUpdate={() => { fetchLead(); fetchLeadDeals(); }}
          leadDeals={leadDeals}
        />

        <PipelineAssignmentDialog
          open={pipelineDialogOpen}
          onOpenChange={setPipelineDialogOpen}
          leadId={leadData.id}
          leadName={leadData.name}
          onSuccess={fetchLead}
        />

        <DealClosedDialog
          open={commissionDialogOpen}
          onOpenChange={setCommissionDialogOpen}
          leadId={leadData.id}
          leadName={leadData.name}
          stageName={commissionStageName}
          pipelineName={pipelineName}
          propertyOfInterest={leadData.property_of_interest || ""}
          onSuccess={fetchLead}
        />

        <AddDealDialog
          open={addDealOpen}
          onOpenChange={setAddDealOpen}
          leadId={leadData.id}
          leadName={leadData.name}
          onSuccess={() => { fetchLeadDeals(); fetchLead(); }}
        />
      </div>
    </div>
  );
};

export default LeadProfile;
