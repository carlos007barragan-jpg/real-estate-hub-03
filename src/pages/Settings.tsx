import { useState, useEffect, useRef } from "react";
import { Plus, Mail, Shield, MoreVertical, UserCog, Moon, Upload, FileText } from "lucide-react";
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
  role: "admin" | "agent";
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
  const [inviteRole, setInviteRole] = useState<"admin" | "agent">("agent");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ successful: string[]; failed: { email: string; error: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const usersWithEmails = await Promise.all(
        (data || []).map(async (userRole) => {
          const { data: { user } } = await supabase.auth.admin.getUserById(userRole.user_id);
          return {
            id: userRole.id,
            email: user?.email || 'Unknown',
            role: userRole.role as "admin" | "agent",
            created_at: userRole.created_at
          };
        })
      );

      setUsers(usersWithEmails);
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
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail);
      
      if (error) throw error;

      if (data.user) {
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: inviteRole
        });
      }

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
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

  const handleRoleChange = async (userId: string, newRole: "admin" | "agent") => {
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

  const parseCSV = (text: string): { firstName: string; lastName: string; email: string; phoneNumber?: string; role: 'admin' | 'agent' }[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const user: any = {};
      
      headers.forEach((header, index) => {
        if (header === 'first_name' || header === 'firstname') {
          user.firstName = values[index];
        } else if (header === 'last_name' || header === 'lastname') {
          user.lastName = values[index];
        } else if (header === 'email') {
          user.email = values[index];
        } else if (header === 'phone' || header === 'phone_number' || header === 'phonenumber') {
          user.phoneNumber = values[index];
        } else if (header === 'role') {
          user.role = values[index].toLowerCase() === 'admin' ? 'admin' : 'agent';
        }
      });
      
      // Default role to agent if not specified
      if (!user.role) {
        user.role = 'agent';
      }
      
      // Only add if we have required fields
      if (user.firstName && user.lastName && user.email) {
        users.push(user);
      }
    }
    
    return users;
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can import users",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const users = parseCSV(text);

      if (users.length === 0) {
        toast({
          title: "Error",
          description: "No valid users found in CSV. Make sure it has columns: first_name, last_name, email, phone_number (optional), role (optional)",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      toast({
        title: "Importing...",
        description: `Processing ${users.length} users...`,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('bulk-import-users', {
        body: { users },
      });

      if (response.error) {
        throw response.error;
      }

      const results = response.data;
      setImportResults(results);

      toast({
        title: "Import Complete",
        description: `Successfully imported ${results.successful.length} users. ${results.failed.length} failed.`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import users",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
                <p className="text-sm text-muted-foreground mt-1">
                  Manage users and their roles. 
                  <a href="/sample-users-import.csv" download className="text-primary hover:underline ml-1">
                    Download CSV template
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isAdmin || importing}
                >
                  <Upload className="h-4 w-4" />
                  {importing ? "Importing..." : "Import CSV"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
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
                        onValueChange={(value: "admin" | "agent") =>
                          setInviteRole(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
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
            </div>

            {importResults && (
              <Card className="p-4 mb-6 bg-muted/50">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">Import Results</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-success">
                        ✓ Successfully imported {importResults.successful.length} users
                      </p>
                      {importResults.failed.length > 0 && (
                        <div className="text-destructive">
                          <p className="font-medium mb-1">✗ Failed to import {importResults.failed.length} users:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {importResults.failed.map((failure, index) => (
                              <li key={index}>
                                {failure.email}: {failure.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportResults(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </Card>
            )}

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value: "admin" | "agent") => handleRoleChange(user.id, value)}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
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
