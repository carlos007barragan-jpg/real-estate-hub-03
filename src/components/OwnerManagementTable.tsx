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
import { Plus, Search, Mail, RefreshCw, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface OwnerWithStats {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  status: "active" | "pending";
  inviteSentDate: string;
  lastLogin?: string;
  type_of_owner?: string;
  propertyCount: number;
  totalValue: number;
  availableCount: number;
  soldCount: number;
}

interface OwnerManagementTableProps {
  onOwnerClick?: (userId: string) => void;
}

export function OwnerManagementTable({ onOwnerClick }: OwnerManagementTableProps) {
  const { toast } = useToast();
  const [owners, setOwners] = useState<OwnerWithStats[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<OwnerWithStats[]>([]);
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

      // Fetch inventory counts for each owner
      const { data: inventory, error: invtError } = await supabase
        .from("inventory")
        .select("user_id, price, status");

      if (invtError) throw invtError;

      // Calculate stats per owner
      const ownerStats = new Map<string, { count: number; totalValue: number; available: number; sold: number }>();
      
      inventory?.forEach(item => {
        const current = ownerStats.get(item.user_id) || { count: 0, totalValue: 0, available: 0, sold: 0 };
        current.count++;
        current.totalValue += item.price || 0;
        if (item.status === "available") current.available++;
        if (item.status === "sold") current.sold++;
        ownerStats.set(item.user_id, current);
      });

      // Combine data
      const pendingOwners: OwnerWithStats[] = invitations?.map(inv => ({
        id: inv.id,
        name: inv.name,
        email: inv.email,
        status: "pending" as const,
        inviteSentDate: inv.created_at,
        type_of_owner: inv.type_of_owner,
        propertyCount: 0,
        totalValue: 0,
        availableCount: 0,
        soldCount: 0,
      })) || [];

      const activeOwners: OwnerWithStats[] = profiles
        ?.filter(p => ownerUserIds.has(p.user_id))
        .map(p => {
          const stats = ownerStats.get(p.user_id) || { count: 0, totalValue: 0, available: 0, sold: 0 };
          return {
            id: p.id,
            user_id: p.user_id,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "N/A",
            email: p.email || "N/A",
            status: "active" as const,
            inviteSentDate: p.created_at,
            lastLogin: p.updated_at,
            type_of_owner: p.type_of_owner || undefined,
            propertyCount: stats.count,
            totalValue: stats.totalValue,
            availableCount: stats.available,
            soldCount: stats.sold,
          };
        }) || [];

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

    if (searchQuery) {
      filtered = filtered.filter(
        owner =>
          owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          owner.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(owner => owner.status === statusFilter);
    }

    setFilteredOwners(filtered);
  };

  const handleResendInvite = async (ownerId: string) => {
    try {
      const { data: invitation } = await supabase
        .from("owner_invitations")
        .select("token")
        .eq("id", ownerId)
        .single();

      if (invitation) {
        const link = `${window.location.origin}/owner-signup?token=${invitation.token}`;
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <CardTitle>Property Owners</CardTitle>
            <CardDescription>Track owner accounts and their property portfolios</CardDescription>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Owner
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-4">
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
                  <TableHead className="text-right">Properties</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Sold</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOwners.map((owner) => (
                  <TableRow 
                    key={owner.id}
                    className={owner.status === "active" && onOwnerClick ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => {
                      if (owner.status === "active" && owner.user_id && onOwnerClick) {
                        onOwnerClick(owner.user_id);
                      }
                    }}
                  >
                    <TableCell className="font-medium">{owner.name}</TableCell>
                    <TableCell>{owner.email}</TableCell>
                    <TableCell>
                      {owner.type_of_owner && (
                        <Badge variant="outline">{owner.type_of_owner}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={owner.status === "active" ? "default" : "secondary"}>
                        {owner.status === "active" ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {owner.propertyCount}
                    </TableCell>
                    <TableCell className="text-right">
                      ${owner.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {owner.availableCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {owner.soldCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {owner.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvite(owner.id)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Resend
                            </Button>
                          </>
                        )}
                        {owner.status === "active" && owner.user_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOwnerClick?.(owner.user_id!)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
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

      <InviteOwnerDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) fetchOwners();
        }}
      />
    </Card>
  );
}
