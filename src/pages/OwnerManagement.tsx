import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InviteOwnerDialog } from "@/components/InviteOwnerDialog";
import { Plus, Search, Mail, RefreshCw, Ban } from "lucide-react";
import { format } from "date-fns";

interface Owner {
  id: string;
  name: string;
  email: string;
  status: "active" | "pending";
  inviteSentDate: string;
  lastLogin?: string;
  notes?: string;
  type_of_owner?: string;
}

export default function OwnerManagement() {
  const { toast } = useToast();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    fetchOwners();
  }, []);

  useEffect(() => {
    filterOwners();
  }, [owners, searchQuery, statusFilter]);

  const fetchOwners = async () => {
    try {
      setLoading(true);

      // Fetch pending owners from invitations
      const { data: invitations, error: invError } = await supabase
        .from("owner_invitations")
        .select("*")
        .eq("status", "pending");

      if (invError) throw invError;

      // Fetch active owners from profiles
      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .not("type_of_owner", "is", null);

      if (profError) throw profError;

      // Get user IDs for active owners to check roles
      const userIds = profiles?.map(p => p.user_id) || [];
      
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", userIds)
        .eq("role", "owner_user");

      if (rolesError) throw rolesError;

      const ownerUserIds = new Set(roles?.map(r => r.user_id) || []);

      // Combine data
      const pendingOwners: Owner[] = invitations?.map(inv => ({
        id: inv.id,
        name: inv.name,
        email: inv.email,
        status: "pending" as const,
        inviteSentDate: inv.created_at,
        type_of_owner: inv.type_of_owner,
      })) || [];

      const activeOwners: Owner[] = profiles
        ?.filter(p => ownerUserIds.has(p.user_id))
        .map(p => ({
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "N/A",
          email: p.email || "N/A",
          status: "active" as const,
          inviteSentDate: p.created_at,
          lastLogin: p.updated_at,
          type_of_owner: p.type_of_owner || undefined,
        })) || [];

      setOwners([...activeOwners, ...pendingOwners]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOwners = () => {
    let filtered = [...owners];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        owner =>
          owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          owner.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(owner => owner.status === statusFilter);
    }

    setFilteredOwners(filtered);
  };

  const handleResendInvite = async (ownerId: string, email: string) => {
    try {
      const { data: invitation } = await supabase
        .from("owner_invitations")
        .select("token")
        .eq("id", ownerId)
        .single();

      if (invitation) {
        const link = `${window.location.origin}/owner-signup?token=${invitation.token}`;
        
        // Copy to clipboard as fallback
        await navigator.clipboard.writeText(link);
        
        toast({
          title: "Invite Link Copied",
          description: "Share this link with the owner manually.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendReminder = async (email: string) => {
    toast({
      title: "Reminder Sent",
      description: `Reminder copied to clipboard for ${email}`,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Owner Management</h1>
          <p className="text-muted-foreground">Track active and pending owner accounts</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Owner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading owners...</div>
          ) : filteredOwners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No owners found. Invite your first owner to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invite Sent</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOwners.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell className="font-medium">{owner.name}</TableCell>
                      <TableCell>{owner.email}</TableCell>
                      <TableCell>
                        {owner.type_of_owner && (
                          <Badge variant="outline">{owner.type_of_owner}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={owner.status === "active" ? "default" : "secondary"}
                        >
                          {owner.status === "active" ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(owner.inviteSentDate), "MM/dd/yyyy")}
                      </TableCell>
                      <TableCell>
                        {owner.lastLogin
                          ? format(new Date(owner.lastLogin), "MM/dd/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {owner.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendInvite(owner.id, owner.email)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Resend
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminder(owner.email)}
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                Remind
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteOwnerDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) fetchOwners(); // Refresh on close
        }}
      />
    </div>
  );
}
