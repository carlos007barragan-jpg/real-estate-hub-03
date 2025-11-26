import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Home, Mail } from "lucide-react";

export default function OwnerSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [typeOfOwner, setTypeOfOwner] = useState("");

  useEffect(() => {
    const fetchInvitation = async () => {
      const token = searchParams.get("token");
      
      if (!token) {
        console.log("No invitation token provided");
        setLoadingInvitation(false);
        return;
      }

      console.log("Fetching invitation with token:", token);

      // Retry mechanism for database consistency
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          // First check if invitation exists at all (without status filter)
          const { data: checkData, error: checkError } = await supabase
            .from("owner_invitations")
            .select("*")
            .eq("token", token)
            .maybeSingle();

          if (checkError) throw checkError;

          console.log("Invitation lookup result:", checkData);

          if (!checkData) {
            // Token doesn't exist at all
            if (retryCount < maxRetries - 1) {
              retryCount++;
              console.log(`Token not found, retry ${retryCount}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
            toast.error("Invalid invitation link. Please request a new invitation.");
            break;
          }

          // Check if already accepted
          if (checkData.status === "accepted") {
            toast.error("This invitation has already been used. Please sign in instead.");
            setTimeout(() => navigate("/owner-login"), 2000);
            break;
          }

          // Check if expired
          const expiresAt = new Date(checkData.expires_at);
          if (expiresAt < new Date()) {
            toast.error("This invitation has expired. Please request a new invitation.");
            break;
          }

          // Valid invitation found
          setInvitation(checkData);
          const nameParts = checkData.name.trim().split(/\s+/);
          setEmail(checkData.email);
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
          setTypeOfOwner(checkData.type_of_owner);
          
          console.log("Invitation loaded successfully:", {
            email: checkData.email,
            name: checkData.name,
            type: checkData.type_of_owner
          });

          setLoadingInvitation(false);
          return;
          
        } catch (error: any) {
          console.error("Invitation fetch error:", error);
          if (retryCount < maxRetries - 1) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          } else {
            toast.error("Failed to load invitation. Please try again or request a new invitation.");
            break;
          }
        }
      }
      
      setLoadingInvitation(false);
    };

    fetchInvitation();
  }, [searchParams, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    if (!typeOfOwner) {
      toast.error("Please select type of owner");
      return;
    }

    setLoading(true);

    try {
      console.log("Starting owner signup process...", { email, firstName, lastName, typeOfOwner });

      // Check if invitation is still valid before proceeding
      if (invitation) {
        const { data: currentInvitation } = await supabase
          .from("owner_invitations")
          .select("status")
          .eq("id", invitation.id)
          .maybeSingle();

        if (!currentInvitation) {
          throw new Error("Invitation no longer exists. Please request a new invitation.");
        }

        if (currentInvitation.status !== "pending") {
          throw new Error("This invitation has already been used.");
        }
      }

      // Sign up the user with metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/owner-portal`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            type_of_owner: typeOfOwner,
            is_owner: true,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (!data.user) {
        throw new Error("Failed to create user account");
      }

      console.log("User created, user_id:", data.user.id);

      // Wait for auth trigger to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create/update profile with owner information
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          email: email,
          type_of_owner: typeOfOwner
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw new Error("Failed to create profile: " + profileError.message);
      }

      console.log("Profile created successfully");

      // Mark invitation as accepted and link to user
      if (invitation) {
        const { error: invitationError } = await supabase
          .from("owner_invitations")
          .update({ 
            status: "accepted"
          })
          .eq("id", invitation.id);

        if (invitationError) {
          console.error("Failed to mark invitation as accepted:", invitationError);
          // Don't fail the signup if this fails, just log it
        } else {
          console.log("Invitation marked as accepted");
        }
      }

      toast.success("Account created successfully! Redirecting to dashboard...");
      
      // Navigate to owner portal
      setTimeout(() => {
        navigate("/owner-portal");
      }, 1000);

    } catch (error: any) {
      console.error("Signup error:", error);
      
      if (error.message.includes("already registered") || error.code === "23505") {
        toast.error("This email is already registered. Please sign in instead.");
        setTimeout(() => navigate("/owner-login"), 2000);
      } else if (error.message.includes("invitation")) {
        toast.error(error.message);
      } else {
        toast.error(error.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Home className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Owner Registration</CardTitle>
          </div>
          <CardDescription>
            {invitation 
              ? `Complete your registration to join as ${invitation.type_of_owner}`
              : "Create an account to manage your properties"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!!invitation}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!!invitation}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeOfOwner">Type of Owner</Label>
              <Select 
                value={typeOfOwner} 
                onValueChange={setTypeOfOwner} 
                required
                disabled={!!invitation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="property_owner">Property Owner</SelectItem>
                  <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Landlord">Landlord</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!invitation}
                  required
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link to="/owner-login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
