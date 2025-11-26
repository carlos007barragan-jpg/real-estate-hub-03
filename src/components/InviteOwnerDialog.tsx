import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy } from "lucide-react";

interface InviteOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteOwnerDialog({ open, onOpenChange }: InviteOwnerDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type_of_owner: "Owner",
  });
  const [inviteLink, setInviteLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate input
      if (!formData.name.trim() || !formData.email.trim()) {
        throw new Error("Name and email are required");
      }

      // Generate unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      console.log("Creating owner invitation:", {
        email: formData.email,
        name: formData.name,
        type: formData.type_of_owner,
        token,
        expiresAt: expiresAt.toISOString()
      });

      const { data: invitation, error } = await supabase
        .from("owner_invitations")
        .insert({
          invited_by: user.id,
          email: formData.email,
          name: formData.name,
          type_of_owner: formData.type_of_owner,
          token,
          expires_at: expiresAt.toISOString(),
          status: "pending"
        })
        .select()
        .single();

      if (error) {
        console.error("Invitation creation error:", error);
        throw error;
      }

      console.log("Invitation created successfully:", invitation);

      const link = `${window.location.origin}/owner-signup?token=${token}`;
      setInviteLink(link);

      toast({
        title: "Invitation created",
        description: "Share the link below with the owner to complete registration.",
      });
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Copied!",
      description: "Invitation link copied to clipboard",
    });
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", type_of_owner: "Owner" });
    setInviteLink("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Owner</DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Type of Owner</Label>
              <Select
                value={formData.type_of_owner}
                onValueChange={(value) => setFormData({ ...formData, type_of_owner: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                  <SelectItem value="Landlord">Landlord</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Invitation"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with {formData.name} to complete registration:
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="flex-1" />
              <Button size="icon" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
