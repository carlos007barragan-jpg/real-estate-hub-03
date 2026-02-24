import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Phone, Mail, MoreVertical, UserPlus, PhoneIncoming, AlertCircle, Globe, ChevronDown, ChevronRight, MapPin, DollarSign, Home, CreditCard, PhoneOff } from "lucide-react";
import { LeadFilters } from "@/components/LeadFilters";
import { CreateLeadDialog } from "@/components/CreateLeadDialog";
import { ForwardLeadDialog } from "@/components/ForwardLeadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "new" | "contacted" | "qualified" | "unqualified";
  source: string;
  value: string;
  date: string;
  rawDate: string;
  assignedTo?: string;
  agentPhone?: string;
  assignedUserId?: string;
  isInboundCall?: boolean;
  isDemoData?: boolean;
  leadLifecycle?: string;
  pipelineStage?: string;
  createdBy?: string;
  leadTemperature?: string;
  transactionType?: string;
  area?: string;
  budget?: string;
  downPayment?: string;
  monthlyPayment?: string;
  propertyType?: string;
  isArchived?: boolean;
  isUncontacted?: boolean;
}


const statusColors = {
  new: "bg-info text-info-foreground",
  contacted: "bg-warning text-warning-foreground",
  qualified: "bg-success text-success-foreground",
  unqualified: "bg-muted text-muted-foreground",
};


const Leads = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, isAdmin: cachedIsAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [transactionTypes, setTransactionTypes] = useState<string[]>([]);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myAssignedLeadIds, setMyAssignedLeadIds] = useState<Set<string>>(new Set());
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; phone: string | null }>>([]);
  const [showMyLeadsOnly, setShowMyLeadsOnly] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [downPaymentFilter, setDownPaymentFilter] = useState("all");
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const fetchLeads = useCallback(async () => {
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      const leadIds = (leadsData || []).map((l: any) => l.id);

      // Fetch profiles, call_logs, and sms_logs in parallel
      const userIds = [...new Set((leadsData || []).map((lead: any) => lead.user_id))];
      const [profilesResult, callLogsResult, smsLogsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", userIds),
        leadIds.length > 0
          ? supabase.from("call_logs").select("lead_id").in("lead_id", leadIds)
          : Promise.resolve({ data: [] }),
        leadIds.length > 0
          ? supabase.from("sms_logs").select("lead_id").in("lead_id", leadIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Create sets for quick lookup of contacted leads
      const contactedByCall = new Set((callLogsResult.data || []).map((c: any) => c.lead_id));
      const contactedBySms = new Set((smsLogsResult.data || []).map((s: any) => s.lead_id));

      // Create a map for quick profile lookup
      const profilesMap = new Map(
        (profilesResult.data || []).map(profile => [profile.user_id, profile])
      );

      const formattedLeads: Lead[] = (leadsData || []).map((lead: any) => {
        const profile = profilesMap.get(lead.user_id);
        const createdBy = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User"
          : "Unknown User";

        const hasBeenContacted = contactedByCall.has(lead.id) || contactedBySms.has(lead.id);

        return {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          status: lead.status as "new" | "contacted" | "qualified" | "unqualified",
          source: lead.source,
          value: lead.value || "",
          date: new Date(lead.created_at).toLocaleDateString(),
          rawDate: lead.created_at,
          assignedTo: lead.assigned_to || undefined,
          agentPhone: lead.agent_phone || undefined,
          isInboundCall: lead.is_inbound_call || false,
          isDemoData: lead.is_demo_data || false,
          leadLifecycle: lead.lead_lifecycle,
          pipelineStage: lead.pipeline_stage,
          createdBy,
          leadTemperature: lead.lead_temperature,
          transactionType: lead.lead_temperature || "Unassigned",
          area: lead.area || undefined,
          budget: lead.budget || undefined,
          downPayment: lead.down_payment || undefined,
          monthlyPayment: lead.monthly_payment || undefined,
          propertyType: lead.property_type || undefined,
          isArchived: lead.is_archived || false,
          isUncontacted: !hasBeenContacted,
        };
      });

      setLeads(formattedLeads);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Error loading leads",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchTransactionTypes = useCallback(async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from("transaction_types")
        .select("name")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setTransactionTypes(data.map(t => t.name));
      } else {
        // Fallback to defaults if no types exist yet
        setTransactionTypes(["Unassigned", "Funding", "Listing", "Buyer's", "Investor's", "Rental", "Multifamily", "Wholesale", "Commercial"]);
      }
    } catch (error: any) {
      console.error("Error fetching transaction types:", error);
    }
  }, [session?.user?.id]);

  const fetchCurrentUserPhone = useCallback(async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      setCurrentUserId(userId);
      setIsAdmin(cachedIsAdmin);

      // Fetch profile, agent phone, and assignments in parallel
      const [profileResult, agentResult, assignmentResult] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name").eq("user_id", userId).maybeSingle(),
        supabase.from("agents").select("phone_number").eq("user_id", userId).maybeSingle(),
        supabase.from("lead_assignments").select("lead_id").eq("user_id", userId),
      ]);

      if (profileResult.data) {
        const fullName = `${profileResult.data.first_name || ''} ${profileResult.data.last_name || ''}`.trim();
        setCurrentUserName(fullName || null);
      }

      setCurrentUserPhone(agentResult.data?.phone_number || null);

      if (assignmentResult.data) {
        setMyAssignedLeadIds(new Set(assignmentResult.data.map(a => a.lead_id)));
      }

      // Default to "My Leads" for non-admins
      if (!cachedIsAdmin) {
        setShowMyLeadsOnly(true);
      }
    } catch (error: any) {
      console.error("Error fetching current user phone:", error);
    }
  }, [session?.user?.id, cachedIsAdmin]);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      // Get current user's organization
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", userId)
        .single();

      if (!currentProfile?.organization_id) {
        console.error("No organization found for current user");
        return;
      }

      // Fetch profiles filtered by organization and agents separately
      const [profilesResult, agentsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, first_name, last_name, phone_number")
          .eq("organization_id", currentProfile.organization_id),
        supabase.from("agents").select("user_id, phone_number")
      ]);

      if (profilesResult.error) throw profilesResult.error;

      // Create a map of user_id to agent phone
      const agentPhoneMap = new Map(
        (agentsResult.data || []).map(a => [a.user_id, a.phone_number])
      );

      const users = (profilesResult.data || []).map((profile: any) => ({
        id: profile.user_id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User",
        phone: agentPhoneMap.get(profile.user_id) || profile.phone_number || null,
      }));

      setAvailableUsers(users);
    } catch (error: any) {
      console.error("Error fetching available users:", error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    Promise.all([
      fetchLeads(),
      fetchTransactionTypes(),
      fetchCurrentUserPhone(),
      fetchAvailableUsers()
    ]);
  }, [fetchLeads, fetchTransactionTypes, fetchCurrentUserPhone, fetchAvailableUsers]);

  const getLeadCategory = useCallback((lead: Lead): string => {
    const transactionType = lead.transactionType?.toLowerCase() || "";
    
    // If unassigned or empty, categorize as new-leads
    if (!transactionType || transactionType === "unassigned") return "new-leads";
    
    // Return the transaction type as category
    return transactionType.toLowerCase();
  }, []);

  const createdByOptions = useMemo(() => {
    const names = [...new Set(leads.map(l => l.createdBy).filter(Boolean))] as string[];
    return names.sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay(); // 0=Sun
    const startOfThisWeek = new Date(startOfToday);
    startOfThisWeek.setDate(startOfThisWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return leads
      .filter((lead) => {
        // Archive filter
        if (archiveFilter === "active" && lead.isArchived) return false;
        if (archiveFilter === "archived" && !lead.isArchived) return false;
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch = lead.name.toLowerCase().includes(lowerSearch) ||
          lead.email.toLowerCase().includes(lowerSearch) ||
          (lead.area && lead.area.toLowerCase().includes(lowerSearch)) ||
          (lead.budget && lead.budget.toLowerCase().includes(lowerSearch)) ||
          (lead.downPayment && lead.downPayment.toLowerCase().includes(lowerSearch)) ||
          (lead.monthlyPayment && lead.monthlyPayment.toLowerCase().includes(lowerSearch));
        if (!matchesSearch) return false;

        // My Leads filter
        if (showMyLeadsOnly) {
          const assignmentMatch = myAssignedLeadIds.has(lead.id);
          const nameMatch = currentUserName ? lead.assignedTo?.toLowerCase() === currentUserName.toLowerCase() : false;
          const phoneMatch = currentUserPhone ? lead.agentPhone === currentUserPhone : false;
          if (!assignmentMatch && !nameMatch && !phoneMatch) return false;
        }

        // Status filter
        if (statusFilter !== "all" && lead.status !== statusFilter) return false;

        // Assigned To filter
        if (assignedToFilter !== "all") {
          if (assignedToFilter === "unassigned") {
            if (lead.assignedTo) return false;
          } else {
            if (lead.assignedTo?.toLowerCase() !== assignedToFilter.toLowerCase()) return false;
          }
        }

        // Transaction Type filter
        if (transactionTypeFilter !== "all") {
          const lt = (lead.transactionType || "unassigned").toLowerCase();
          if (lt !== transactionTypeFilter) return false;
        }

        // Date filter
        if (dateFilter !== "all") {
          const leadDate = new Date(lead.rawDate);
          if (dateFilter === "today" && leadDate < startOfToday) return false;
          if (dateFilter === "this-week" && leadDate < startOfThisWeek) return false;
          if (dateFilter === "last-week" && (leadDate < startOfLastWeek || leadDate >= endOfLastWeek)) return false;
          if (dateFilter === "this-month" && leadDate < startOfMonth) return false;
          if (dateFilter === "most-recent" && leadDate < sevenDaysAgo) return false;
        }

        // Created By filter
        if (createdByFilter !== "all" && lead.createdBy !== createdByFilter) return false;

        // Area of Interest filter
        if (areaFilter !== "all") {
          if (!lead.area || !lead.area.toLowerCase().includes(areaFilter.toLowerCase())) return false;
        }

        // Down Payment Range filter
        if (downPaymentFilter !== "all") {
          const dpNum = parseFloat((lead.downPayment || "").replace(/[^0-9.]/g, ""));
          if (isNaN(dpNum)) return false;
          if (downPaymentFilter === "under-5k" && dpNum >= 5000) return false;
          if (downPaymentFilter === "5k-10k" && (dpNum < 5000 || dpNum >= 10000)) return false;
          if (downPaymentFilter === "10k-15k" && (dpNum < 10000 || dpNum >= 15000)) return false;
          if (downPaymentFilter === "15k-20k" && (dpNum < 15000 || dpNum >= 20000)) return false;
          if (downPaymentFilter === "20k-30k" && (dpNum < 20000 || dpNum >= 30000)) return false;
          if (downPaymentFilter === "30k-50k" && (dpNum < 30000 || dpNum >= 50000)) return false;
          if (downPaymentFilter === "50k-100k" && (dpNum < 50000 || dpNum >= 100000)) return false;
          if (downPaymentFilter === "100k-plus" && dpNum < 100000) return false;
        }

        // Tab filter
        if (activeTab !== "all") {
          const category = getLeadCategory(lead);
          if (category !== activeTab) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Priority 1: New unassigned leads needing attention (highest priority)
        const aNeedsAttention = a.status === 'new' && (!a.assignedTo || a.assignedTo === 'unassigned') && (!a.transactionType || a.transactionType === 'Unassigned') && !a.isDemoData;
        const bNeedsAttention = b.status === 'new' && (!b.assignedTo || b.assignedTo === 'unassigned') && (!b.transactionType || b.transactionType === 'Unassigned') && !b.isDemoData;
        if (aNeedsAttention && !bNeedsAttention) return -1;
        if (!aNeedsAttention && bNeedsAttention) return 1;

        // Priority 2: Website leads
        const aIsWebsite = a.source === 'Online Lead - Website';
        const bIsWebsite = b.source === 'Online Lead - Website';
        if (aIsWebsite && !bIsWebsite) return -1;
        if (!aIsWebsite && bIsWebsite) return 1;

        // Priority 3: Inbound call leads
        const aIsInbound = a.isInboundCall;
        const bIsInbound = b.isInboundCall;
        if (aIsInbound && !bIsInbound) return -1;
        if (!aIsInbound && bIsInbound) return 1;

        // Priority 4: My leads
        const aIsMyLead = currentUserPhone && a.agentPhone === currentUserPhone;
        const bIsMyLead = currentUserPhone && b.agentPhone === currentUserPhone;
        if (aIsMyLead && !bIsMyLead) return -1;
        if (!aIsMyLead && bIsMyLead) return 1;

        // Priority 5: Unassigned transaction types
        const aIsUnassigned = !a.transactionType || a.transactionType === "Unassigned";
        const bIsUnassigned = !b.transactionType || b.transactionType === "Unassigned";
        if (aIsUnassigned && !bIsUnassigned) return -1;
        if (!aIsUnassigned && bIsUnassigned) return 1;

        // Finally sort by date (newest first)
        return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
      });
  }, [leads, searchTerm, activeTab, currentUserPhone, currentUserName, myAssignedLeadIds, getLeadCategory, showMyLeadsOnly, statusFilter, assignedToFilter, transactionTypeFilter, dateFilter, createdByFilter, areaFilter, downPaymentFilter, archiveFilter]);

  const getLeadCountByCategory = useCallback((category: string) => {
    if (category === "all") return leads.length;
    return leads.filter(lead => getLeadCategory(lead) === category).length;
  }, [leads, getLeadCategory]);

  const handleAssignLead = useCallback(async (leadId: string, userId: string, userName: string, userPhone: string | null) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ 
          assigned_to: userName,
          agent_phone: userPhone 
        })
        .eq("id", leadId);

      if (error) throw error;

      setLeads(
        leads.map((lead) =>
          lead.id === leadId ? { ...lead, assignedTo: userName, agentPhone: userPhone || undefined } : lead
        )
      );

      toast({
        title: "Lead assigned",
        description: `Lead assigned to ${userName}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [leads, toast]);

  const handleDeleteLead = useCallback(async (leadId: string, leadName: string) => {
    if (!confirm(`Are you sure you want to delete ${leadName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;

      setLeads(leads.filter((lead) => lead.id !== leadId));

      toast({
        title: "Lead deleted",
        description: `${leadName} has been successfully deleted`,
      });
    } catch (error: any) {
      toast({
        title: "Error deleting lead",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [leads, toast]);

  // No blocking loading state - render immediately, data populates progressively

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground mt-1">Organize by transaction type</p>
          </div>
          <CreateLeadDialog onLeadCreated={fetchLeads} />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <LeadFilters
            showMyLeadsOnly={showMyLeadsOnly}
            onShowMyLeadsOnlyChange={setShowMyLeadsOnly}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            assignedToFilter={assignedToFilter}
            onAssignedToFilterChange={setAssignedToFilter}
            transactionTypeFilter={transactionTypeFilter}
            onTransactionTypeFilterChange={setTransactionTypeFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            createdByFilter={createdByFilter}
            onCreatedByFilterChange={setCreatedByFilter}
            areaFilter={areaFilter}
            onAreaFilterChange={setAreaFilter}
            downPaymentFilter={downPaymentFilter}
            onDownPaymentFilterChange={setDownPaymentFilter}
            archiveFilter={archiveFilter}
            onArchiveFilterChange={setArchiveFilter}
            availableUsers={availableUsers}
            transactionTypes={transactionTypes}
            createdByOptions={createdByOptions}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full mb-6" style={{ gridTemplateColumns: `repeat(${transactionTypes.length + 1}, minmax(0, 1fr))` }}>
        <TabsTrigger value="all" className="relative gap-2">
          All
          <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
            {getLeadCountByCategory("all")}
          </Badge>
        </TabsTrigger>
          {transactionTypes.map((type) => {
            const tabValue = type.toLowerCase();
            const isNewLeads = type === "Unassigned";
            return (
          <TabsTrigger 
            key={type} 
            value={tabValue}
            className={isNewLeads ? "relative gap-2 bg-info/10 data-[state=active]:bg-info data-[state=active]:text-info-foreground" : "relative gap-2"}
          >
            {isNewLeads ? "New Leads" : type}
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
              {getLeadCountByCategory(tabValue)}
            </Badge>
          </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <div className="bg-card rounded-lg border shadow-sm">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Transaction Type</TableHead>
              <TableHead>Areas of Interest</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => {
              const isWebsiteLead = lead.source === 'Online Lead - Website';
              const isNewUnassigned = lead.status === 'new' && (!lead.assignedTo || lead.assignedTo === 'unassigned') && (!lead.transactionType || lead.transactionType === 'Unassigned');
              const needsAttention = isNewUnassigned && !lead.isDemoData;
              const isExpanded = expandedLeads.has(lead.id);
              return (
              <React.Fragment key={lead.id}>
              <TableRow 
                className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                  needsAttention
                    ? 'bg-warning/10 border-l-4 border-l-warning hover:bg-warning/15'
                    : lead.isInboundCall 
                      ? 'bg-info/10 border-l-4 border-l-info hover:bg-info/20' 
                      : isWebsiteLead
                        ? 'bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10'
                        : ''
                }`}
                onClick={() => navigate(`/leads/${lead.id}`)}
              >
                <TableCell className="w-[30px] px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedLeads(prev => {
                        const next = new Set(prev);
                        if (next.has(lead.id)) next.delete(lead.id);
                        else next.add(lead.id);
                        return next;
                      });
                    }}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {lead.isInboundCall && (
                      <Badge variant="outline" className="gap-1 border-info text-info bg-info/5">
                        <PhoneIncoming className="h-3 w-3" />
                        <span className="text-xs">Inbound</span>
                      </Badge>
                    )}
                    {isWebsiteLead && (
                      <Badge variant="outline" className="gap-1 border-primary text-primary bg-primary/5">
                        <Globe className="h-3 w-3" />
                        <span className="text-xs">Website</span>
                      </Badge>
                    )}
                    {needsAttention && (
                      <Badge variant="outline" className="gap-1 border-warning text-warning bg-warning/5 animate-pulse">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs">New</span>
                      </Badge>
                    )}
                    {lead.isDemoData && (
                      <Badge variant="outline" className="gap-1 border-warning text-warning bg-warning/5">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs">Demo</span>
                      </Badge>
                    )}
                    {lead.isUncontacted && !lead.isDemoData && (
                      <Badge variant="outline" className="gap-1 border-destructive text-destructive bg-destructive/5">
                        <PhoneOff className="h-3 w-3" />
                        <span className="text-xs">Uncontacted</span>
                      </Badge>
                    )}
                    <span>{lead.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{lead.phone}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {lead.assignedTo ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {lead.assignedTo}
                    </Badge>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <UserPlus className="h-3 w-3" />
                          Assign
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover">
                        {availableUsers.map((user) => (
                          <DropdownMenuItem
                            key={user.id}
                            onClick={() => handleAssignLead(lead.id, user.id, user.name, user.phone)}
                          >
                            {user.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    className={statusColors[lead.status]} 
                    variant="secondary"
                  >
                    {lead.leadLifecycle === "Moved to Pipeline" && lead.pipelineStage 
                      ? lead.pipelineStage 
                      : lead.leadLifecycle || lead.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {lead.transactionType}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{lead.area || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{lead.source}</TableCell>
                <TableCell className="font-semibold text-primary">{lead.value}</TableCell>
                <TableCell className="text-muted-foreground">{lead.date}</TableCell>
                <TableCell className="text-muted-foreground">{lead.createdBy}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Convert to Contact</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(lead.id, lead.name);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ForwardLeadDialog
                      leadId={lead.id}
                      currentAgent={lead.assignedTo}
                      onSuccess={fetchLeads}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          Forward
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableCell colSpan={12} className="py-3 px-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Down Payment</p>
                          <p className="text-foreground">{lead.downPayment || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Budget</p>
                          <p className="text-foreground">{lead.budget || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Monthly Payment</p>
                          <p className="text-foreground">{lead.monthlyPayment || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Areas of Interest</p>
                          <p className="text-foreground">{lead.area || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Property Type</p>
                          <p className="text-foreground">{lead.propertyType || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leads;
