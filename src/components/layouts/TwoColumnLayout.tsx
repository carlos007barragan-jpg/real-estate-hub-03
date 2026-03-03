import { useState, useEffect } from "react";
import { EditDealPropertyDialog } from "@/components/EditDealPropertyDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, Mail, MapPin, Calendar, User, Building2, MoreVertical, ChevronDown, Edit, ExternalLink, Package, Plus, Trash2 } from "lucide-react";
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
import { EditAreasInterestDialog } from "@/components/EditAreasInterestDialog";
import { DealTransactionCard } from "@/components/DealTransactionCard";
import { TasksSection } from "@/components/TasksSection";
import { AppointmentsSection } from "@/components/AppointmentsSection";
import { DocumentsSection } from "@/components/DocumentsSection";
import { MessagingSection } from "@/components/MessagingSection";
import { ActivitySection } from "@/components/ActivitySection";
import { MultiAgentSelect } from "@/components/MultiAgentSelect";
import { LeadQuickStats } from "@/components/LeadQuickStats";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { FollowUpReminder } from "@/components/FollowUpReminder";
import { CommissionSection } from "@/components/CommissionSection";
import { useAuth } from "@/contexts/AuthContext";

// Investor Deals Card Component
const InvestorDealsCard = ({ leadId, deals, onUpdate }: { leadId: string; deals: any[]; onUpdate: () => void }) => {
  const { toast } = useToast();
  const [localDeals, setLocalDeals] = useState<any[]>(deals);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalDeals(deals); }, [deals]);

  const addDeal = () => {
    setLocalDeals([...localDeals, { property: "", address: "", budget: "", status: "Interested" }]);
  };

  const removeDeal = (index: number) => {
    setLocalDeals(localDeals.filter((_, i) => i !== index));
  };

  const updateDeal = (index: number, field: string, value: string) => {
    const updated = [...localDeals];
    updated[index] = { ...updated[index], [field]: value };
    setLocalDeals(updated);
  };

  const saveDeals = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("leads")
        .update({ investor_deals: localDeals, last_modified_by: user?.id } as any)
        .eq("id", leadId);
      if (error) throw error;
      toast({ title: "Success", description: "Tracked deals updated" });
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Tracked Deals</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={addDeal}>
          <Plus className="h-3 w-3" /> Add Deal
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3 text-xs">
        {localDeals.length === 0 && <span className="text-muted-foreground">No deals tracked yet.</span>}
        {localDeals.map((deal: any, i: number) => (
          <div key={i} className="border rounded-lg p-2 space-y-2 relative">
            <Button variant="ghost" size="icon" className="h-5 w-5 absolute top-1 right-1" onClick={() => removeDeal(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
            <Input placeholder="Property of Interest" value={deal.property || ""} onChange={(e) => updateDeal(i, "property", e.target.value)} className="h-7 text-xs" />
            <Input placeholder="Address" value={deal.address || ""} onChange={(e) => updateDeal(i, "address", e.target.value)} className="h-7 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Budget" value={deal.budget || ""} onChange={(e) => updateDeal(i, "budget", e.target.value)} className="h-7 text-xs" />
              <Select value={deal.status || "Interested"} onValueChange={(v) => updateDeal(i, "status", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interested">Interested</SelectItem>
                  <SelectItem value="Under Contract">Under Contract</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {localDeals.length > 0 && (
          <Button size="sm" onClick={saveDeals} disabled={saving} className="w-full h-7 text-xs">
            {saving ? "Saving..." : "Save Deals"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
export const TwoColumnLayout = ({ leadData, customFields = [], handleCall, handleSendMessage, handleAddNote, handleUpdateNote, messages, notes, newMessage, setNewMessage, newNote, setNewNote, id, onLeadUpdate, leadDeals = [] }: any) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPropertyDialogOpen, setEditPropertyDialogOpen] = useState(false);
  const [editAreasDialogOpen, setEditAreasDialogOpen] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [createdByName, setCreatedByName] = useState<string>("Loading...");
  const [assignedAgentIds, setAssignedAgentIds] = useState<string[]>([]);
  const [transactionType, setTransactionType] = useState<string>(leadData.leadTemperature || "Unassigned");
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const refreshStats = () => setStatsRefreshKey(k => k + 1);

  useEffect(() => {
    const fetchCreatorAndAssignments = async () => {
      // Fetch creator's name
      if (leadData.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", leadData.user_id)
          .maybeSingle();
        
        if (profile) {
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          setCreatedByName(fullName || "Unknown User");
        } else {
          setCreatedByName("Unknown User");
        }
      } else {
        setCreatedByName("Unknown User");
      }

      // Fetch existing lead assignments
      if (id) {
        const { data: assignments } = await supabase
          .from("lead_assignments")
          .select("user_id")
          .eq("lead_id", id);
        
        if (assignments && assignments.length > 0) {
          setAssignedAgentIds(assignments.map(a => a.user_id));
        }
      }
    };

    fetchCreatorAndAssignments();
  }, [leadData.user_id, id]);



  // Sync transaction type when leadData changes
  useEffect(() => {
    setTransactionType(leadData.leadTemperature || "Unassigned");
  }, [leadData.leadTemperature]);

  const handleAssignmentChange = async (selectedIds: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get profiles for selected agents
      let firstAgentName = "Unassigned";
      let firstAgentPhone: string | null = null;
      
      if (selectedIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, phone_number")
          .in("user_id", selectedIds);
        
        const firstProfile = profiles?.find(p => p.user_id === selectedIds[0]);
        if (firstProfile) {
          firstAgentName = `${firstProfile.first_name || ''} ${firstProfile.last_name || ''}`.trim() || "Unknown";
          firstAgentPhone = firstProfile.phone_number || null;
        }
      }

      // Update lead with first assigned agent for legacy field
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          agent_phone: firstAgentPhone,
          assigned_to: firstAgentName,
          last_modified_by: user.id,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Clear existing assignments and add new ones
      await supabase.from("lead_assignments").delete().eq("lead_id", id);
      
      if (selectedIds.length > 0) {
        const assignments = selectedIds.map(agentId => ({
          lead_id: id,
          user_id: agentId,
          assigned_by: user.id,
        }));
        
        const { error: assignError } = await supabase
          .from("lead_assignments")
          .insert(assignments);
        
        if (assignError) throw assignError;
      }

      setAssignedAgentIds(selectedIds);
      toast({
        title: "Success",
        description: selectedIds.length > 0 
          ? `Lead assigned to ${selectedIds.length} team member(s)`
          : "Lead unassigned",
      });
      onLeadUpdate?.();
    } catch (error: any) {
      console.error("Error updating assignment:", error);
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      });
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
            <TwilioCallInterface leadPhone={leadData.phone} leadName={leadData.name} leadId={id} onCallLogged={refreshStats} />
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
                       {leadData.pipelineStage && leadData.pipeline && (
                         <div>
                           <span className="text-muted-foreground">Stage:</span>
                           <span className="ml-1">{leadData.pipelineStage}</span>
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
              <MultiAgentSelect
                selectedIds={assignedAgentIds}
                onSelectionChange={handleAssignmentChange}
                placeholder="Select team members..."
              />
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

        {/* Property Card - Dynamic by Transaction Type */}
        <Card className="border">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              {transactionType === "Funding" ? "Funding Property" :
               transactionType === "Listing" ? "Listing Property" :
               transactionType === "Wholesale" ? "Wholesale Property" :
               transactionType === "Multifamily" ? "Multifamily Property" :
               transactionType === "Commercial" ? "Commercial Property" :
               transactionType === "Investor's" ? "Investor Profile" :
               "Property"}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditPropertyDialogOpen(true)}>
              <Edit className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 text-xs">
            {/* Inventory badge for all non-investor types */}
            {transactionType !== "Investor's" && (
              <>
                {leadData.inventory_id ? (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                      <Package className="h-3 w-3" />
                      In Inventory
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => navigate(`/inventory#${leadData.inventory_id}`)}>
                      <ExternalLink className="h-3 w-3" />
                      View Property
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs mb-2">Not in Inventory</Badge>
                )}
              </>
            )}

            {/* === INVESTOR === */}
            {transactionType === "Investor's" && (
              <>
                {leadData.area && (
                  <div>
                    <span className="text-muted-foreground">Areas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {leadData.area.split(",").map((a: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{a.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {leadData.timeframe && leadData.timeframe !== "Not specified" && (
                  <div><span className="text-muted-foreground">Timeframe:</span> {leadData.timeframe}</div>
                )}
              </>
            )}

            {/* === FUNDING === */}
            {transactionType === "Funding" && (
              <>
                {leadData.propertyOfInterest && (
                  <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Property:</span><span className="ml-1">{leadData.propertyOfInterest}</span></div></div>
                )}
                <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><span>{leadData.propertyInterest.address}</span></div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Beds/Baths:</span> {leadData.propertyInterest.bedrooms}/{leadData.propertyInterest.bathrooms}</div>
                  {leadData.purchase_price && <div><span className="text-muted-foreground">Purchase:</span> {leadData.purchase_price}</div>}
                  {leadData.rehab_amount && <div><span className="text-muted-foreground">Rehab:</span> {leadData.rehab_amount}</div>}
                  {leadData.estimated_credit_score && <div><span className="text-muted-foreground">Credit:</span> {leadData.estimated_credit_score}</div>}
                  {leadData.estimated_close_date && <div><span className="text-muted-foreground">Close:</span> {new Date(leadData.estimated_close_date).toLocaleDateString()}</div>}
                </div>
              </>
            )}

            {/* === LISTING === */}
            {transactionType === "Listing" && (
              <>
                {leadData.propertyOfInterest && (
                  <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Property:</span><span className="ml-1">{leadData.propertyOfInterest}</span></div></div>
                )}
                <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><span>{leadData.propertyInterest.address}</span></div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-2">
                  {leadData.list_price && <div><span className="text-muted-foreground">List Price:</span> {leadData.list_price}</div>}
                  <div><span className="text-muted-foreground">Beds/Baths:</span> {leadData.propertyInterest.bedrooms}/{leadData.propertyInterest.bathrooms}</div>
                  <div><span className="text-muted-foreground">Sqft:</span> {leadData.propertyInterest.sqft}</div>
                  {leadData.town && <div><span className="text-muted-foreground">Town:</span> {leadData.town}</div>}
                  {leadData.school_district && <div><span className="text-muted-foreground">School:</span> {leadData.school_district}</div>}
                </div>
              </>
            )}

            {/* === WHOLESALE === */}
            {transactionType === "Wholesale" && (
              <>
                {leadData.propertyOfInterest && (
                  <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Property:</span><span className="ml-1">{leadData.propertyOfInterest}</span></div></div>
                )}
                <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><span>{leadData.propertyInterest.address}</span></div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-2">
                  {leadData.contract_price && <div><span className="text-muted-foreground">Contract:</span> {leadData.contract_price}</div>}
                  {leadData.list_price && <div><span className="text-muted-foreground">List:</span> {leadData.list_price}</div>}
                  {leadData.property_condition && <div><span className="text-muted-foreground">Condition:</span> {leadData.property_condition}</div>}
                  <div><span className="text-muted-foreground">Beds/Baths:</span> {leadData.propertyInterest.bedrooms}/{leadData.propertyInterest.bathrooms}</div>
                  <div><span className="text-muted-foreground">Sqft:</span> {leadData.propertyInterest.sqft}</div>
                  {leadData.year_built && <div><span className="text-muted-foreground">Year:</span> {leadData.year_built}</div>}
                </div>
              </>
            )}

            {/* === MULTIFAMILY === */}
            {transactionType === "Multifamily" && (
              <>
                <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><span>{leadData.propertyInterest.address}</span></div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-2">
                  {leadData.number_of_units && <div><span className="text-muted-foreground">Units:</span> {leadData.number_of_units}</div>}
                  {leadData.unit_mix && <div><span className="text-muted-foreground">Mix:</span> {leadData.unit_mix}</div>}
                  {leadData.cap_rate && <div><span className="text-muted-foreground">Cap Rate:</span> {leadData.cap_rate}</div>}
                  {leadData.noi && <div><span className="text-muted-foreground">NOI:</span> {leadData.noi}</div>}
                  {leadData.purchase_price && <div><span className="text-muted-foreground">Price:</span> {leadData.purchase_price}</div>}
                  {leadData.year_built && <div><span className="text-muted-foreground">Year:</span> {leadData.year_built}</div>}
                </div>
              </>
            )}

            {/* === COMMERCIAL === */}
            {transactionType === "Commercial" && (
              <>
                <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><span>{leadData.propertyInterest.address}</span></div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-2">
                  {leadData.commercial_property_type && <div><span className="text-muted-foreground">Type:</span> {leadData.commercial_property_type}</div>}
                  <div><span className="text-muted-foreground">Sqft:</span> {leadData.propertyInterest.sqft}</div>
                  {leadData.cap_rate && <div><span className="text-muted-foreground">Cap Rate:</span> {leadData.cap_rate}</div>}
                  {leadData.noi && <div><span className="text-muted-foreground">NOI:</span> {leadData.noi}</div>}
                  {leadData.purchase_price && <div><span className="text-muted-foreground">Price:</span> {leadData.purchase_price}</div>}
                  {leadData.zoning && <div><span className="text-muted-foreground">Zoning:</span> {leadData.zoning}</div>}
                </div>
              </>
            )}

            {/* === DEFAULT (Buyer/Renter/Unassigned) === */}
            {["Unassigned", "Buyer's", "Rental"].includes(transactionType) && (
              <>
                {leadData.propertyOfInterest && (
                  <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Property of Interest:</span><span className="ml-1 leading-tight">{leadData.propertyOfInterest}</span></div></div>
                )}
                <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><span className="leading-tight">{leadData.propertyInterest.address}</span></div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Beds:</span> {leadData.propertyInterest.bedrooms} / {leadData.propertyInterest.bathrooms}</div>
                  <div><span className="text-muted-foreground">Sqft:</span> {leadData.propertyInterest.sqft}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Standalone Transaction Cards for Secondary Deals */}
        {leadDeals && leadDeals.length > 0 && leadDeals.map((deal: any, idx: number) => (
          <DealTransactionCard
            key={deal.id || idx}
            deal={deal}
            index={idx}
            onUpdated={onLeadUpdate}
          />
        ))}

        {/* Second Card - Dynamic by Transaction Type */}
        {transactionType === "Investor's" ? (
          <InvestorDealsCard leadId={id} deals={leadData.investor_deals || []} onUpdate={onLeadUpdate} />
        ) : ["Multifamily", "Commercial"].includes(transactionType) ? (
          <Card className="border">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-semibold">Investment Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-xs text-muted-foreground">
              Property details shown above. Use the edit button to update.
            </CardContent>
          </Card>
        ) : (
          <Card className="border">
            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {transactionType === "Funding" ? "Loan & LLC Details" :
                 transactionType === "Listing" ? "Listing Requirements" :
                 transactionType === "Wholesale" ? "Transaction Details" :
                 "Areas of Interest & Budget"}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditAreasDialogOpen(true)}>
                <Edit className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2 text-xs">
              {/* DEFAULT second card content */}
              {["Unassigned", "Buyer's", "Rental"].includes(transactionType) && (
                <>
                  {leadData.area && (
                    <div>
                      <span className="text-muted-foreground">Areas:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {leadData.area.split(",").map((a: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{a.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Budget:</span> {leadData.propertyInterest.budget}</div>
                    {leadData.downPayment && <div><span className="text-muted-foreground">Down Payment:</span> {leadData.downPayment}</div>}
                    <div><span className="text-muted-foreground">Type:</span> {leadData.propertyInterest.propertyType}</div>
                    {leadData.financingType && <div><span className="text-muted-foreground">Finance:</span><span className="capitalize ml-1">{leadData.financingType}</span></div>}
                  </div>
                </>
              )}
              {/* FUNDING second card */}
              {transactionType === "Funding" && (
                <div className="space-y-1">
                  {leadData.title_company && <div><span className="text-muted-foreground">Title Company:</span> {leadData.title_company}</div>}
                  {leadData.loan_details && <div><span className="text-muted-foreground">Loan Details:</span> {leadData.loan_details}</div>}
                  {leadData.llc_information && <div><span className="text-muted-foreground">LLC Info:</span> {leadData.llc_information}</div>}
                  {!leadData.title_company && !leadData.loan_details && !leadData.llc_information && (
                    <span className="text-muted-foreground">No loan or LLC details added yet.</span>
                  )}
                </div>
              )}
              {/* LISTING second card */}
              {transactionType === "Listing" && (
                <div>
                  {leadData.listing_documents ? (
                    <p className="whitespace-pre-wrap">{leadData.listing_documents}</p>
                  ) : (
                    <span className="text-muted-foreground">No listing notes added yet.</span>
                  )}
                </div>
              )}
              {/* WHOLESALE second card */}
              {transactionType === "Wholesale" && (
                <div>
                  {leadData.titleOffice ? (
                    <div><span className="text-muted-foreground">Title Office:</span> {leadData.titleOffice}</div>
                  ) : (
                    <span className="text-muted-foreground">No title office specified.</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

      {/* Right: Stats, Follow-up, Activity, Tasks, Appointments, Timeline, Messaging */}
      <div className="space-y-4">
        {/* Follow-up Reminder Banner */}
        <FollowUpReminder leadId={id} leadName={leadData.name} refreshKey={statsRefreshKey} />

        {/* Lead Summary Stats */}
        <LeadQuickStats leadId={id} refreshKey={statsRefreshKey} />

        {/* 1. Activity Timeline - at the top */}
        <ActivityTimeline leadId={id} notes={notes} userRole={role} />

        {/* 2. Activity & History Section */}
        <ActivitySection 
          leadId={id}
          notes={notes}
          newNote={newNote}
          setNewNote={setNewNote}
          handleAddNote={handleAddNote}
          handleUpdateNote={handleUpdateNote}
        />

        {/* Commission Section - Supreme Admin only, won deals only */}
        {role === 'supreme_admin' && leadData.status === 'won' && (
          <CommissionSection leadId={id} leadData={leadData} onUpdate={onLeadUpdate} />
        )}

        {/* 3. Tasks Section */}
        <TasksSection leadId={id} />

        {/* 4. Appointments Section */}
        <AppointmentsSection leadId={id} leadName={leadData.name} />

        {/* 5. Messaging Section */}
        <MessagingSection 
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={async () => { await handleSendMessage(); refreshStats(); }}
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
        transactionType={transactionType}
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
          purchasePrice: leadData.purchase_price,
          rehabAmount: leadData.rehab_amount,
          estimatedCreditScore: leadData.estimated_credit_score,
          estimatedCloseDate: leadData.estimated_close_date,
          preferredLenderId: leadData.preferred_lender_id,
          listPrice: leadData.list_price,
          town: leadData.town,
          schoolDistrict: leadData.school_district,
          contractPrice: leadData.contract_price,
          propertyCondition: leadData.property_condition,
          yearBuilt: leadData.year_built,
          numberOfUnits: leadData.number_of_units,
          unitMix: leadData.unit_mix,
          capRate: leadData.cap_rate,
          noi: leadData.noi,
          zoning: leadData.zoning,
          commercialPropertyType: leadData.commercial_property_type,
          timeframe: leadData.timeframe === "Not specified" ? "" : leadData.timeframe,
        }}
        onSaved={onLeadUpdate}
      />

      <EditAreasInterestDialog
        open={editAreasDialogOpen}
        onOpenChange={setEditAreasDialogOpen}
        leadId={id}
        transactionType={transactionType}
        currentData={{
          area: leadData.area,
          budget: leadData.budget,
          downPayment: leadData.downPayment,
          propertyType: leadData.property_type,
          financingType: leadData.financingType,
          titleCompany: leadData.title_company,
          loanDetails: leadData.loan_details,
          llcInformation: leadData.llc_information,
          listingDocuments: leadData.listing_documents,
          titleOffice: leadData.titleOffice,
        }}
        onSaved={onLeadUpdate}
      />
    </div>
  );
};
