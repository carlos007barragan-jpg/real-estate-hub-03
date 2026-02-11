import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CompleteProfileModalProps {
  userId: string;
  email: string;
  onComplete: () => void;
}

export const CompleteProfileModal = ({ userId, email, onComplete }: CompleteProfileModalProps) => {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [isInvited, setIsInvited] = useState(false);

  useEffect(() => {
    checkInvitationStatus();
  }, [email]);

  const checkInvitationStatus = async () => {
    try {
      const { data: invitation } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("email", email)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setIsInvited(!!invitation);

      // Pre-fill from user metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        if (user.user_metadata.first_name) setFirstName(user.user_metadata.first_name);
        if (user.user_metadata.last_name) setLastName(user.user_metadata.last_name);
        if (user.user_metadata.organization_name) setOrganizationName(user.user_metadata.organization_name);
      }
    } catch (error) {
      console.error("Error checking invitation:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !phoneNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isInvited && !organizationName) {
      toast.error("Organization name is required");
      return;
    }

    setLoading(true);

    try {
      console.log("Starting profile completion for user:", userId);

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        },
      });

      if (metadataError) {
        console.error("Metadata error:", metadataError);
        throw metadataError;
      }

      let orgId = null;

      if (!isInvited) {
        console.log("Creating organization:", organizationName);
        // New admin - create organization
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: organizationName,
            created_by: userId,
          })
          .select()
          .single();

        if (orgError) {
          console.error("Organization error:", orgError);
          throw orgError;
        }
        console.log("Organization created:", org);
        orgId = org.id;
      } else {
        // Invited user - get organization from invitation
        const { data: invitation } = await supabase
          .from("user_invitations")
          .select("organization_id")
          .eq("email", email)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invitation) {
          orgId = invitation.organization_id;
          console.log("Using invitation org:", orgId);

          // Mark invitation as accepted
          await supabase
            .from("user_invitations")
            .update({ status: "accepted" })
            .eq("email", email)
            .eq("status", "pending");
        }
      }

      console.log("Upserting profile with org:", orgId);
      // Use server-side function to atomically upsert profile (bypasses RLS issues)
      const { data: newProfile, error: profileError } = await supabase.rpc('complete_user_profile', {
        p_user_id: userId,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone_number: phoneNumber,
        p_email: email,
        p_organization_id: orgId,
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
        throw profileError;
      }

      console.log("Profile created successfully:", newProfile);
      toast.success("Profile completed successfully!");
      
      // Small delay to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete();
    } catch (error: any) {
      console.error("Error completing profile:", error);
      toast.error(error.message || "Failed to complete profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-center">
            {isInvited 
              ? "Please complete your profile information to get started"
              : "Set up your organization and profile to get started"
            }
          </DialogDescription>
        </DialogHeader>
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
                disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Use international format (e.g., +12025551234)
            </p>
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
                disabled={loading}
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
      </DialogContent>
    </Dialog>
  );
};
