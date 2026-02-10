import { useState, useEffect } from "react";
import { User, Shield, Mail, Phone, Building2, Calendar, CheckCircle, KeyRound, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  organizationName: string | null;
  createdAt: string;
}

export const ProfileSettings = () => {
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No user found",
          variant: "destructive",
        });
        return;
      }

      // Get profile data - use maybeSingle to handle missing profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          first_name,
          last_name,
          phone_number,
          created_at,
          organization_id
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // If no profile exists, create one with an organization
      if (!profileData) {
        console.log('No profile found, creating one...');
        
        // Create organization first
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: `${user.user_metadata?.first_name || user.email}'s Organization`,
            created_by: user.id
          })
          .select('id')
          .single();

        if (orgError) throw orgError;

        // Create profile with organization
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null,
            organization_id: newOrg.id
          })
          .select('first_name, last_name, phone_number, created_at, organization_id')
          .single();

        if (createError) throw createError;

        // Get organization name
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', newOrg.id)
          .single();

        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        setUserRole(roleData?.role || 'agent');
        setProfile({
          email: user.email || '',
          firstName: newProfile.first_name,
          lastName: newProfile.last_name,
          phoneNumber: newProfile.phone_number,
          organizationName: orgData?.name || null,
          createdAt: newProfile.created_at,
        });
        return;
      }

      // If profile exists but no organization, create one
      if (profileData && !profileData.organization_id) {
        console.log('Profile exists but no organization, creating one...');
        
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: `${profileData.first_name || user.email}'s Organization`,
            created_by: user.id
          })
          .select('id')
          .single();

        if (!orgError && newOrg) {
          await supabase
            .from('profiles')
            .update({ organization_id: newOrg.id })
            .eq('user_id', user.id);
          
          profileData.organization_id = newOrg.id;
        }
      }

      // Get organization name if organization_id exists
      let organizationName = null;
      if (profileData.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profileData.organization_id)
          .maybeSingle();
        
        organizationName = orgData?.name || null;
      }

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(roleData?.role || 'agent');
      setProfile({
        email: user.email || '',
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        phoneNumber: profileData.phone_number,
        organizationName: organizationName,
        createdAt: profileData.created_at,
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'agent':
        return 'secondary';
      case 'marketing_manager':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPermissions = (role: string) => {
    const basePermissions = [
      "View and manage own leads",
      "Create and update tasks",
      "Schedule appointments",
      "Make and receive calls",
      "Send SMS messages",
      "View calendar",
    ];

    const adminPermissions = [
      ...basePermissions,
      "Manage team members",
      "Invite new users",
      "View all leads and data",
      "Configure system settings",
      "Manage custom fields",
      "Configure round-robin settings",
    ];

    const marketingPermissions = [
      ...basePermissions,
      "Manage marketing campaigns",
      "View analytics",
    ];

    switch (role) {
      case 'admin':
        return adminPermissions;
      case 'marketing_manager':
        return marketingPermissions;
      default:
        return basePermissions;
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No profile data found.</p>
          </CardContent>
        </Card>
        <SetPasswordCard email="" />
      </div>
    );
  }

  const permissions = getPermissions(userRole);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your personal details and account info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-base text-foreground">
                    {profile.firstName && profile.lastName 
                      ? `${profile.firstName} ${profile.lastName}`
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base text-foreground">{profile.email}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                  <p className="text-base text-foreground">
                    {profile.phoneNumber || 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Organization</p>
                  <p className="text-base text-foreground">
                    {profile.organizationName || 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                  <p className="text-base text-foreground">
                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role & Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role & Permissions
            </CardTitle>
            <CardDescription>Your current role and access levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Current Role</p>
              <Badge variant={getRoleBadgeVariant(userRole)} className="text-sm">
                {getRoleDisplayName(userRole)}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Permissions</p>
              <div className="space-y-2">
                {permissions.map((permission, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground">{permission}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Set Password Section */}
      <SetPasswordCard email={profile.email} />
    </div>
  );
};

const SetPasswordCard = ({ email: initialEmail }: { email: string }) => {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState(initialEmail);

  useEffect(() => {
    if (!initialEmail) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) setEmail(user.email);
      });
    }
  }, [initialEmail]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Password set", description: "You can now log in with your email and this password." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error setting password:", error);
      toast({ title: "Error", description: error.message || "Failed to set password", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Set Login Password
        </CardTitle>
        <CardDescription>
          Set a password to log in with your email ({email}) instead of Google Sign-In
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSetPassword} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter a password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
