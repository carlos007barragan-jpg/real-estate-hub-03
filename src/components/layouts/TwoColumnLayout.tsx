import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, Mail, MapPin, Calendar, User, Building2, MoreVertical, ChevronDown, Edit, ExternalLink, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { TwilioCallInterface } from "@/components/TwilioCallInterface";
import { EditContactInfoDialog } from "@/components/EditContactInfoDialog";
import { EditPropertyDialog } from "@/components/EditPropertyDialog";
import { TasksSection } from "@/components/TasksSection";
import { AppointmentsSection } from "@/components/AppointmentsSection";
import { DocumentsSection } from "@/components/DocumentsSection";
import { MessagingSection } from "@/components/MessagingSection";
import { ActivitySection } from "@/components/ActivitySection";

export const TwoColumnLayout = ({ leadData, customFields = [], handleCall, handleSendMessage, handleAddNote, messages, notes, newMessage, setNewMessage, newNote, setNewNote, id, onLeadUpdate }: any) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPropertyDialogOpen, setEditPropertyDialogOpen] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [createdByName, setCreatedByName] = useState<string>("Loading...");
  const [assignedAgent, setAssignedAgent] = useState<string>(leadData.agent_phone || "");
  const [transactionType, setTransactionType] = useState<string>(leadData.lead_temperature || "Unassigned");

  useEffect(() => {
    const fetchCreatorAndAgents = async () => {
      // Fetch creator's name
      if (leadData.user_id) {
        console.log("Fetching creator for user_id:", leadData.user_id);
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", leadData.user_id)
          .maybeSingle();
        
        console.log("Profile data:", profile, "Error:", error);
        
        if (profile) {
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          setCreatedByName(fullName || "Unknown User");
        } else {
          setCreatedByName("Unknown User");
        }
      } else {
        setCreatedByName("Unknown User");
      }

      // Fetch active agents with their names
      const { data: agentsData } = await supabase
        .from("agents")
        .select(`
          id,
          phone_number,
          user_id,
          profiles!inner(first_name, last_name)
        `)
        .eq("is_active", true);

      if (agentsData) {
        const formattedAgents = agentsData.map((agent: any) => ({
          id: agent.id,
          name: `${agent.profiles.first_name || ''} ${agent.profiles.last_name || ''}`.trim() || "Unknown Agent",
          phone: agent.phone_number,
        }));
        setAgents(formattedAgents);
      }
    };

    fetchCreatorAndAgents();
  }, [leadData.user_id]);

  const handleAssignmentChange = async (agentPhone: string) => {
    const selectedAgent = agents.find(a => a.phone === agentPhone);
    const isUnassigned = agentPhone === "unassigned";
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("leads")
      .update({
        agent_phone: isUnassigned ? null : agentPhone,
        assigned_to: selectedAgent?.name || "Unassigned",
        last_modified_by: user?.id,
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      });
    } else {
      setAssignedAgent(agentPhone);
      toast({
        title: "Success",
        description: "Lead assignment updated",
      });
      onLeadUpdate?.();
    }
  };

  const handleTransactionTypeChange = async (type: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("leads")
      .update({
        lead_temperature: type === "Unassigned" ? null : type,
        last_modified_by: user?.id,
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update transaction type",
        variant: "destructive",
      });
    } else {
      setTransactionType(type);
      toast({
        title: "Success",
        description: "Transaction type updated",
      });
      onLeadUpdate?.();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      {/* Left: Compact Summary and Documents */}
      <div className="space-y-3">
        {/* Action Buttons */}
        <Card className="border sticky top-0 z-20 bg-background">
          <CardContent className="p-3">
            <TwilioCallInterface leadPhone={leadData.phone} leadName={leadData.name} />
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Contact & Personal</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="z-50 bg-popover">
                   <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                     Edit Information
                   </DropdownMenuItem>
                 </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{leadData.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.phone}</span>
            </div>
            {leadData.spouseName && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>{leadData.spouseName}</span>
                <span className="text-muted-foreground">(Spouse Name)</span>
              </div>
            )}
            {leadData.spousePhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{leadData.spousePhone}</span>
                <span className="text-muted-foreground">(Spouse)</span>
              </div>
            )}
            {leadData.spouseEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{leadData.spouseEmail}</span>
                <span className="text-muted-foreground">(Spouse)</span>
              </div>
            )}
            {(leadData.maritalStatus || leadData.socialStatus || leadData.preferredContactMethod || leadData.languagePreference || leadData.currentAddress) && (
              <>
                <Separator className="my-2" />
                <Collapsible open={additionalInfoOpen} onOpenChange={setAdditionalInfoOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs px-2">
                      <span>More</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${additionalInfoOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-1">
                      {leadData.maritalStatus && (
                        <div>
                          <span className="text-muted-foreground">Marital:</span> 
                          <span className="capitalize ml-1">{leadData.maritalStatus}</span>
                        </div>
                      )}
                      {leadData.socialStatus && (
                        <div>
                          <span className="text-muted-foreground">SS Status:</span> 
                          <span className="ml-1">{leadData.socialStatus}</span>
                        </div>
                      )}
                      {leadData.preferredContactMethod && (
                        <div>
                          <span className="text-muted-foreground">Contact:</span> 
                          <span className="capitalize ml-1">{leadData.preferredContactMethod}</span>
                        </div>
                      )}
                      {leadData.languagePreference && (
                        <div>
                          <span className="text-muted-foreground">Language:</span> 
                          <span className="ml-1">{leadData.languagePreference}</span>
                        </div>
                      )}
                      {leadData.currentAddress && (
                        <div className="flex items-start gap-2 pt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-muted-foreground">Current:</span>
                            <span className="ml-1">{leadData.currentAddress}</span>
                          </div>
                        </div>
                      )}
                       {leadData.pipeline && (
                         <div>
                           <span className="text-muted-foreground">Pipeline:</span> 
                           <span className="ml-1">{leadData.pipeline}</span>
                           {leadData.pipelineStage && (
                             <>
                               <span className="ml-2 text-muted-foreground">• Stage:</span>
                               <span className="ml-1">{leadData.pipelineStage}</span>
                             </>
                           )}
                         </div>
                       )}
                      {/* Custom Fields */}
                      {customFields.map((field: any) => {
                        const value = leadData.customData?.[field.field_name];
                        if (!value) return null;
                        
                        return (
                          <div key={field.id}>
                            <span className="text-muted-foreground">{field.field_label}:</span> 
                            <span className="ml-1">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
            <Separator className="my-2" />
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.source}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Created By:</span>
              <span>{createdByName}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>Transaction Type:</span>
              </div>
              <Select value={transactionType || "Unassigned"} onValueChange={handleTransactionTypeChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                  <SelectItem value="Funding">Funding</SelectItem>
                  <SelectItem value="Listing">Listing</SelectItem>
                  <SelectItem value="Buyer's">Buyer's</SelectItem>
                  <SelectItem value="Investor's">Investor's</SelectItem>
                  <SelectItem value="Rental">Rental</SelectItem>
                  <SelectItem value="Multifamily">Multifamily</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Assigned To:</span>
              </div>
              <Select value={assignedAgent || "unassigned"} onValueChange={handleAssignmentChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.phone}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.timeframe}</span>
            </div>
            {leadData.closeDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>Close Date: {leadData.closeDate}</span>
              </div>
            )}
            {leadData.commission && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span>Commission: {leadData.commission}</span>
              </div>
            )}
            {leadData.titleOffice && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span>Title Office: {leadData.titleOffice}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Property</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setEditPropertyDialogOpen(true)}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 text-xs">
            {/* Inventory Status Badge */}
            {leadData.inventory_id ? (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                  <Package className="h-3 w-3" />
                  In Inventory
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => navigate(`/inventory#${leadData.inventory_id}`)}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Property
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs mb-2">
                Not in Inventory
              </Badge>
            )}

            {leadData.propertyOfInterest && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Property of Interest:</span>
                  <span className="ml-1 leading-tight">{leadData.propertyOfInterest}</span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <span className="leading-tight">{leadData.propertyInterest.address}</span>
            </div>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {leadData.area && (
                <div>
                  <span className="text-muted-foreground">Area:</span> {leadData.area}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Type:</span> {leadData.propertyInterest.propertyType}
              </div>
              <div>
                <span className="text-muted-foreground">Beds:</span> {leadData.propertyInterest.bedrooms} / {leadData.propertyInterest.bathrooms}
              </div>
              <div>
                <span className="text-muted-foreground">Sqft:</span> {leadData.propertyInterest.sqft}
              </div>
              <div>
                <span className="text-muted-foreground">Budget:</span> {leadData.propertyInterest.budget}
              </div>
              {leadData.downPayment && (
                <div>
                  <span className="text-muted-foreground">Down:</span> {leadData.downPayment}
                </div>
              )}
              {leadData.financingType && (
                <div>
                  <span className="text-muted-foreground">Finance:</span> 
                  <span className="capitalize ml-1">{leadData.financingType}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents Section - moved from right */}
        <Card className="border">
          <CardHeader className="p-3 pb-2">
            <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="text-sm font-semibold">Documents</CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${documentsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-3 pt-2">
                  <DocumentsSection leadId={id} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>
      </div>

      {/* Right: Activity, Tasks, Appointments, and Messaging sections */}
      <div className="space-y-4">
        {/* 1. Activity & History Section (at top) */}
        <ActivitySection 
          leadId={id}
          notes={notes}
          newNote={newNote}
          setNewNote={setNewNote}
          handleAddNote={handleAddNote}
        />

        {/* 2. Tasks Section */}
        <TasksSection leadId={id} />

        {/* 3. Appointments Section */}
        <AppointmentsSection leadId={id} leadName={leadData.name} />

        {/* 4. Messaging Section */}
        <MessagingSection 
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
        />
      </div>

      <EditContactInfoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        leadData={leadData}
        onUpdate={onLeadUpdate}
      />

      <EditPropertyDialog
        open={editPropertyDialogOpen}
        onOpenChange={setEditPropertyDialogOpen}
        leadId={id}
        currentData={{
          propertyAddress: leadData.property_address,
          propertyType: leadData.property_type,
          bedrooms: leadData.bedrooms,
          bathrooms: leadData.bathrooms,
          sqft: leadData.sqft,
          budget: leadData.budget,
          area: leadData.area,
          downPayment: leadData.downPayment,
          financingType: leadData.financingType,
          propertyOfInterest: leadData.propertyOfInterest,
          inventoryId: leadData.inventory_id,
        }}
        onSaved={onLeadUpdate}
      />
    </div>
  );
};
