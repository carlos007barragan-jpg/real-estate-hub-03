import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isInvited, setIsInvited] = useState(false);

  useEffect(() => {
    checkProfileStatus();
  }, []);

  const checkProfileStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);
      setEmail(session.user.email || "");
      
      // Check if user has a pending invitation
      const { data: pendingInvitation } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("email", session.user.email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      // User is invited if there's a pending invitation OR invited param is true
      const invitedParam = searchParams.get("invited");
      const wasInvited = pendingInvitation !== null || invitedParam === "true" || session.user.user_metadata?.invited === true;
      setIsInvited(wasInvited);

      // Pre-fill with any existing data from auth metadata
      const metadata = session.user.user_metadata;
      if (metadata?.first_name) setFirstName(metadata.first_name);
      if (metadata?.last_name) setLastName(metadata.last_name);
      if (metadata?.organization_name && !wasInvited) setOrganizationName(metadata.organization_name);

      // Check if profile already exists and is complete
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile) {
        // Profile exists, check if it's complete
        const isComplete = profile.first_name && 
                          profile.last_name && 
                          profile.phone_number && 
                          profile.email;
        
        if (isComplete) {
          // Profile is complete, redirect to dashboard
          navigate("/dashboard");
          return;
        }

        // Profile exists but incomplete, pre-fill the form
        if (profile.first_name) setFirstName(profile.first_name);
        if (profile.last_name) setLastName(profile.last_name);
        if (profile.phone_number) setPhoneNumber(profile.phone_number);
      }

      setCheckingProfile(false);
    } catch (error) {
      console.error("Error checking profile:", error);
      setCheckingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!firstName || !lastName || !phoneNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      if (!userId) throw new Error("User not found");

      // ALWAYS check for pending invitation first, regardless of isInvited flag
      const { data: pendingInvitation } = await supabase
        .from("user_invitations")
        .select("organization_id, role, id")
        .eq("email", email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      const hasInvitation = pendingInvitation !== null;

      // If no invitation and no org name provided, require org name
      if (!hasInvitation && !organizationName) {
        toast.error("Organization name is required");
        setLoading(false);
        return;
      }

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        },
      });

      if (metadataError) throw metadataError;

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        let orgId = existingProfile.organization_id;
        
        // If user has a pending invitation, use that organization and role
        if (hasInvitation && pendingInvitation) {
          orgId = pendingInvitation.organization_id;

          // Update or insert the correct role
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingRole) {
            // Update existing role
            await supabase
              .from("user_roles")
              .update({ role: pendingInvitation.role })
              .eq("user_id", userId);
          } else {
            // Insert new role
            await supabase
              .from("user_roles")
              .insert({
                user_id: userId,
                role: pendingInvitation.role,
              });
          }

          // Mark invitation as accepted
          await supabase
            .from("user_invitations")
            .update({ status: "accepted" })
            .eq("id", pendingInvitation.id);

          toast.success("Joined organization successfully!");
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            email: email,
            organization_id: orgId,
          })
          .eq("user_id", userId);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        let orgId = null;

        if (hasInvitation && pendingInvitation) {
          // Invited user - use organization from invitation
          orgId = pendingInvitation.organization_id;

          // Update or insert the correct role
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingRole) {
            // Update existing role
            await supabase
              .from("user_roles")
              .update({ role: pendingInvitation.role })
              .eq("user_id", userId);
          } else {
            // Insert new role
            await supabase
              .from("user_roles")
              .insert({
                user_id: userId,
                role: pendingInvitation.role,
              });
          }

          // Mark invitation as accepted
          await supabase
            .from("user_invitations")
            .update({ status: "accepted" })
            .eq("id", pendingInvitation.id);

          toast.success("Joined organization successfully!");
        } else {
          // New admin - create organization
          const { data: org, error: orgError } = await supabase
            .from("organizations")
            .insert({
              name: organizationName,
              created_by: userId,
            })
            .select()
            .single();

          if (orgError) throw orgError;
          orgId = org.id;

          // Update or insert admin role
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingRole) {
            await supabase
              .from("user_roles")
              .update({ role: "admin" })
              .eq("user_id", userId);
          } else {
            await supabase
              .from("user_roles")
              .insert({
                user_id: userId,
                role: "admin",
              });
          }
        }

        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            email: email,
            organization_id: orgId,
          });

        if (profileError) throw profileError;
      }

      toast.success("Profile completed successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error completing profile:", error);
      toast.error(error.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          </div>
          <CardDescription>
            {isInvited 
              ? "Please complete your profile information to get started"
              : "Set up your organization and profile to get started"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>

            {!isInvited && (
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  placeholder="My Real Estate Company"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing Profile...
                </>
              ) : (
                "Complete Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;