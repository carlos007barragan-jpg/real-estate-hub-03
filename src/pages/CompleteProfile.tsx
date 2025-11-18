import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { profileSchema } from "@/lib/validation";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated (came from invitation link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        // Pre-fill with any existing data
        const metadata = session.user.user_metadata;
        if (metadata?.first_name) setFirstName(metadata.first_name);
        if (metadata?.last_name) setLastName(metadata.last_name);
      } else {
        // Not authenticated, redirect to auth
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate profile inputs (password is optional if already set)
    try {
      if (password) {
        // Only validate password fields if user is setting a new password
        if (password !== confirmPassword) {
          throw new Error("Passwords don't match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
      }
      
      if (!firstName || !lastName) {
        throw new Error("First name and last name are required");
      }
    } catch (error: any) {
      toast({
        title: "Validation error",
        description: error.message || "Please check your inputs",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Update password only if provided
      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
          },
        });

        if (passwordError) throw passwordError;
      } else {
        // Just update user metadata without changing password
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
          },
        });

        if (metadataError) throw metadataError;
      }

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      toast({
        title: "Profile Complete!",
        description: "Your account is ready. Redirecting to dashboard...",
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">RealEstate CRM</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Fill in your details to get started. Password is only needed if you want to change it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    minLength={1}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    minLength={1}
                    maxLength={100}
                  />
                </div>
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
                <p className="text-xs text-muted-foreground">
                  Use international format (e.g., +12025551234)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">New Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Only fill this if you want to set a new password
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Setting up your account..." : "Complete Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfile;