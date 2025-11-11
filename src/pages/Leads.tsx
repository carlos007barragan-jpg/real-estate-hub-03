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
  isInboundCall?: boolean;
  isDemoData?: boolean;
  leadLifecycle?: string;
  pipelineStage?: string;
  createdBy?: string;
  leadTemperature?: string;
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
          isInboundCall: lead.is_inbound_call || false,
          isDemoData: lead.is_demo_data || false,
          leadLifecycle: lead.lead_lifecycle,
          pipelineStage: lead.pipeline_stage,
          createdBy: profilesMap.get(lead.user_id) || "Unknown User",
          leadTemperature: lead.lead_temperature,
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

  useEffect(() => {
    fetchLeads();
  }, []);

  const getLeadCategory = (lead: Lead): string => {
    const temp = lead.leadTemperature?.toLowerCase() || "";
    
    // Categorize based on lead_temperature field
    if (temp.includes("funding") || temp === "funding") return "funding";
    if (temp.includes("sale") || temp === "seller") return "sale";
    if (temp.includes("buyer") || temp === "buying") return "buyers";
    if (temp.includes("investor") || temp === "investment") return "investors";
    
    return "uncategorized";
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    
    const category = getLeadCategory(lead);
    return matchesSearch && category === activeTab;
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
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="all" className="relative">
            All
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
              {getLeadCountByCategory("all")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="funding" className="relative">
            Funding
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
              {getLeadCountByCategory("funding")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sale" className="relative">
            Sale
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
              {getLeadCountByCategory("sale")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="buyers" className="relative">
            Buyers
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
              {getLeadCountByCategory("buyers")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="investors" className="relative">
            Investors
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
              {getLeadCountByCategory("investors")}
            </Badge>
          </TabsTrigger>
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
