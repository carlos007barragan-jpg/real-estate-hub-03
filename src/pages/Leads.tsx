import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Phone, Mail, MoreVertical, UserPlus, PhoneIncoming, AlertCircle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  assignedTo?: string;
  agentPhone?: string;
  isInboundCall?: boolean;
  isDemoData?: boolean;
  leadLifecycle?: string;
  pipelineStage?: string;
  createdBy?: string;
  leadTemperature?: string;
  transactionType?: string;
}


const agents = [
  { id: "1", name: "John Smith" },
  { id: "2", name: "Maria Garcia" },
  { id: "3", name: "Alex Johnson" },
  { id: "4", name: "Lisa Chen" },
];


const statusColors = {
  new: "bg-info text-info-foreground",
  contacted: "bg-warning text-warning-foreground",
  qualified: "bg-success text-success-foreground",
  unqualified: "bg-muted text-muted-foreground",
};


const Leads = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [transactionTypes, setTransactionTypes] = useState<string[]>([]);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch creator names separately
      const userIds = [...new Set((data || []).map(lead => lead.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [
          p.user_id, 
          `${p.first_name || ''} ${p.last_name || ''}`.trim() || "Unknown User"
        ])
      );

      const formattedLeads: Lead[] = (data || []).map((lead) => {
        return {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          status: lead.status as "new" | "contacted" | "qualified" | "unqualified",
          source: lead.source,
          value: lead.value || "",
          date: new Date(lead.created_at).toLocaleDateString(),
          assignedTo: lead.assigned_to || undefined,
          agentPhone: lead.agent_phone || undefined,
          isInboundCall: lead.is_inbound_call || false,
          isDemoData: lead.is_demo_data || false,
          leadLifecycle: lead.lead_lifecycle,
          pipelineStage: lead.pipeline_stage,
          createdBy: profilesMap.get(lead.user_id) || "Unknown User",
          leadTemperature: lead.lead_temperature,
          transactionType: lead.lead_temperature || "Unassigned",
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
  };

  const fetchTransactionTypes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transaction_types")
        .select("name")
        .eq("user_id", user.id)
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
  };

  const fetchCurrentUserPhone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("agents")
        .select("phone_number")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setCurrentUserPhone(data?.phone_number || null);
    } catch (error: any) {
      console.error("Error fetching current user phone:", error);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchTransactionTypes();
    fetchCurrentUserPhone();
  }, []);

  const getLeadCategory = (lead: Lead): string => {
    const transactionType = lead.transactionType?.toLowerCase() || "";
    
    // If unassigned or empty, categorize as new-leads
    if (!transactionType || transactionType === "unassigned") return "new-leads";
    
    // Return the transaction type as category
    return transactionType.toLowerCase();
  };

  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (activeTab === "all") return matchesSearch;
      
      const category = getLeadCategory(lead);
      return matchesSearch && category === activeTab;
    })
    .sort((a, b) => {
      // Priority 1: Leads assigned to current user (agent_phone matches)
      const aIsMyLead = currentUserPhone && a.agentPhone === currentUserPhone;
      const bIsMyLead = currentUserPhone && b.agentPhone === currentUserPhone;
      
      if (aIsMyLead && !bIsMyLead) return -1;
      if (!aIsMyLead && bIsMyLead) return 1;
      
      // Priority 2: Unassigned leads
      const aIsUnassigned = !a.transactionType || a.transactionType === "Unassigned";
      const bIsUnassigned = !b.transactionType || b.transactionType === "Unassigned";
      
      if (aIsUnassigned && !bIsUnassigned) return -1;
      if (!aIsUnassigned && bIsUnassigned) return 1;
      
      // Priority 3: Other leads (keep original order)
      return 0;
    });

  const getLeadCountByCategory = (category: string) => {
    if (category === "all") return leads.length;
    return leads.filter(lead => getLeadCategory(lead) === category).length;
  };

  const handleAssignLead = async (leadId: string, agentName: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: agentName })
        .eq("id", leadId);

      if (error) throw error;

      setLeads(
        leads.map((lead) =>
          lead.id === leadId ? { ...lead, assignedTo: agentName } : lead
        )
      );

      toast({
        title: "Lead assigned",
        description: `Lead assigned to ${agentName}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
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
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading leads...</p>
      </div>
    );
  }

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

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full mb-6" style={{ gridTemplateColumns: `repeat(${transactionTypes.length + 1}, minmax(0, 1fr))` }}>
          <TabsTrigger value="all" className="relative">
            All
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
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
                className={isNewLeads ? "relative bg-info/10 data-[state=active]:bg-info data-[state=active]:text-info-foreground" : "relative"}
              >
                {isNewLeads ? "New Leads" : type}
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
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
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Transaction Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                  lead.isInboundCall 
                    ? 'bg-info/10 border-l-4 border-l-info hover:bg-info/20' 
                    : ''
                }`}
                onClick={() => navigate(`/leads/${lead.id}`)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {lead.isInboundCall && (
                      <Badge variant="outline" className="gap-1 border-info text-info bg-info/5">
                        <PhoneIncoming className="h-3 w-3" />
                        <span className="text-xs">Inbound</span>
                      </Badge>
                    )}
                    {lead.isDemoData && (
                      <Badge variant="outline" className="gap-1 border-warning text-warning bg-warning/5">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs">Demo</span>
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
                        {agents.map((agent) => (
                          <DropdownMenuItem
                            key={agent.id}
                            onClick={() => handleAssignLead(lead.id, agent.name)}
                          >
                            {agent.name}
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
            ))}
          </TableBody>
        </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leads;
