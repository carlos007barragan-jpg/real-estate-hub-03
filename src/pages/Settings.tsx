import { useState, useEffect } from "react";
import { Plus, Mail, Shield, MoreVertical, UserCog, Moon, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentPhoneSetup } from "@/components/AgentPhoneSetup";
import { RoundRobinSettings } from "@/components/RoundRobinSettings";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  role: "admin" | "agent" | "marketing_manager";
  created_at: string;
}

const roleColors = {
  admin: "bg-destructive text-destructive-foreground",
  agent: "bg-primary text-primary-foreground",
  viewer: "bg-muted text-muted-foreground",
};

const Settings = () => {
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent" | "marketing_manager">("agent");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [deletingDemoData, setDeletingDemoData] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Dispatch custom event for same-page dark mode changes
    window.dispatchEvent(new Event("darkModeChange"));
  }, [darkMode]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithDetails = await Promise.all(
        (data || []).map(async (userRole) => {
          const { data: { user } } = await supabase.auth.admin.getUserById(userRole.user_id);
          
          // Fetch profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone_number')
            .eq('user_id', userRole.user_id)
            .single();

          return {
            id: userRole.id,
            email: user?.email || 'Unknown',
            firstName: profile?.first_name || '',
            lastName: profile?.last_name || '',
            phoneNumber: profile?.phone_number || null,
            role: userRole.role as "admin" | "agent" | "marketing_manager",
            created_at: userRole.created_at
          };
        })
      );

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can invite users",
        variant: "destructive",
      });
      return;
    }

    try {
      // Send invitation email - Supabase will send the email automatically
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
        data: {
          invited_role: inviteRole, // Store the intended role in user metadata
        },
        redirectTo: `${window.location.origin}/complete-profile`,
      });
      
      if (error) throw error;

      // Pre-assign the role so admin can see it immediately
      if (data.user) {
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: inviteRole
        });
      }

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail} as ${inviteRole.replace('_', ' ')}`,
      });
      
      setInviteEmail("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "agent" | "marketing_manager") => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can change roles",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can remove users",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed successfully",
      });
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    }
  };

  const handleClearDemoData = async () => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can clear demo data",
        variant: "destructive",
      });
      return;
    }

    try {
      setDeletingDemoData(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete only demo data from all tables for this user
      const deletePromises = [
        supabase.from('leads').delete().eq('user_id', user.id).eq('is_demo_data', true),
        supabase.from('tasks').delete().eq('user_id', user.id).eq('is_demo_data', true),
        supabase.from('notes').delete().eq('user_id', user.id).eq('is_demo_data', true),
        supabase.from('call_logs').delete().eq('user_id', user.id).eq('is_demo_data', true),
        supabase.from('sms_logs').delete().eq('user_id', user.id).eq('is_demo_data', true),
        supabase.from('documents').delete().eq('user_id', user.id).eq('is_demo_data', true),
      ];
      
      await Promise.all(deletePromises);

      // Notify UI to clear any local demo data
      window.dispatchEvent(new Event("demoDataCleared"));

      toast({
        title: "Success",
        description: "All demo data has been cleared",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear demo data",
        variant: "destructive",
      });
    } finally {
      setDeletingDemoData(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and team settings</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Team Members</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage users and their roles</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                      Send an invitation to add a new team member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value: "admin" | "agent" | "marketing_manager") =>
                          setInviteRole(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleInviteUser}>Send Invitation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.phoneNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value: "admin" | "agent" | "marketing_manager") => handleRoleChange(user.id, value)}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!isAdmin}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleRemoveUser(user.id)}
                            >
                              Remove User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <div className="flex gap-4">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Role Permissions</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><strong>Admin:</strong> Full access to all features, settings, and user management</li>
                    <li><strong>Agent:</strong> Manage leads, contacts, pipelines, and make calls</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <div className="space-y-6">
            <AgentPhoneSetup />
            <RoundRobinSettings />
            
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">General Settings</h2>
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" defaultValue="RealEstate CRM" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="est">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="est">Eastern Time (ET)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                      <SelectItem value="cst">Central Time (CT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <Moon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="dark-mode" className="text-base font-medium cursor-pointer">
                        Dark Theme
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable dark mode across the platform
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>
                <Button>Save Changes</Button>
              </div>
            </Card>

            {isAdmin && (
              <Card className="p-6 border-destructive">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <Trash2 className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-foreground mb-2">Demo Data Management</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Remove all demo data from your CRM to start with a clean slate.
                    </p>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20 mb-4">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground mb-1">This will permanently delete all demo data including:</p>
                        <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Demo leads and contacts</li>
                          <li>Demo tasks and notes</li>
                          <li>Demo documents</li>
                          <li>Demo call logs and SMS history</li>
                        </ul>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleClearDemoData}
                      disabled={deletingDemoData}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingDemoData ? "Clearing Demo Data..." : "Clear All Demo Data"}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Notification Preferences</h2>
            <p className="text-muted-foreground">Configure how you receive notifications</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
