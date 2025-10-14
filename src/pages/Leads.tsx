import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Phone, Mail, MoreVertical, UserPlus } from "lucide-react";
import { CreateLeadDialog } from "@/components/CreateLeadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedLeads: Lead[] = (data || []).map((lead) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status as "new" | "contacted" | "qualified" | "unqualified",
        source: lead.source,
        value: lead.value || "",
        date: new Date(lead.created_at).toLocaleDateString(),
        assignedTo: lead.assigned_to || undefined,
      }));

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

  const filteredLeads = leads.filter((lead) =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <p className="text-muted-foreground mt-1">Manage and track your potential clients</p>
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
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/leads/${lead.id}`)}
              >
                <TableCell className="font-medium">{lead.name}</TableCell>
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
                  <Badge className={statusColors[lead.status]} variant="secondary">
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{lead.source}</TableCell>
                <TableCell className="font-semibold text-primary">{lead.value}</TableCell>
                <TableCell className="text-muted-foreground">{lead.date}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Convert to Contact</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Leads;
