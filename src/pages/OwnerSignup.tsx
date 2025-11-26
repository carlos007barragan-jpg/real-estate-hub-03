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
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [typeOfOwner, setTypeOfOwner] = useState("");

  useEffect(() => {
    const fetchInvitation = async () => {
      const token = searchParams.get("token");
      console.log("OwnerSignup useEffect - token from URL:", token);
      
      if (!token) {
        console.log("No invitation token provided - showing empty form");
        setLoadingInvitation(false);
        return;
      }

      try {
        console.log("Fetching invitation for token:", token);
        const { data, error } = await supabase
          .from("owner_invitations")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (error) {
          console.error("Error fetching invitation:", error);
          throw error;
        }

        console.log("Invitation data received:", data);

        if (data) {
          setInvitation(data);
          
          // Auto-populate fields
          const nameParts = data.name.trim().split(/\s+/);
          const parsedFirstName = nameParts[0] || "";
          const parsedLastName = nameParts.slice(1).join(" ") || "";
          
          console.log("Setting form fields:", {
            email: data.email,
            firstName: parsedFirstName,
            lastName: parsedLastName,
            typeOfOwner: data.type_of_owner
          });
          
          setEmail(data.email);
          setFirstName(parsedFirstName);
          setLastName(parsedLastName);
          setTypeOfOwner(data.type_of_owner);
          
          console.log("Form fields set successfully");
        } else {
          console.log("No invitation found for token");
        }
      } catch (error: any) {
        console.error("Error loading invitation:", error);
      } finally {
        setLoadingInvitation(false);
      }
    };

    fetchInvitation();
  }, [searchParams]);

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

    if (!companyName.trim()) {
      toast.error("Company name is required");
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
      console.log("Starting owner signup...", { email, firstName, lastName, companyName, typeOfOwner });

      // Sign up the user
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

      console.log("User created:", data.user.id);

      // Wait for auth trigger to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the organization_id from the inviter
      const { data: inviterProfile, error: inviterError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', invitation?.invited_by || '')
        .single();

      if (inviterError) {
        console.error("Failed to fetch inviter organization:", inviterError);
      }

      const organizationId = inviterProfile?.organization_id || null;

      // Create owner profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          email: email,
          type_of_owner: typeOfOwner,
          organization_id: organizationId
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw new Error("Failed to create profile: " + profileError.message);
      }

      // Create seller record with company
      const { error: sellerError } = await supabase
        .from('sellers')
        .insert({
          user_id: data.user.id,
          name: `${firstName} ${lastName}`,
          email: email,
          phone: phoneNumber,
          company: companyName
        });

      if (sellerError) {
        console.error("Seller record error:", sellerError);
      }

      // Mark invitation as accepted (using service role for permissions)
      if (invitation) {
        const { error: inviteError } = await supabase
          .from("owner_invitations")
          .update({ status: "accepted" })
          .eq("id", invitation.id);
        
        if (inviteError) {
          console.error("Failed to update invitation status:", inviteError);
        }
      }

      // Notify admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map(admin => ({
          user_id: admin.user_id,
          type: 'owner_registered',
          title: 'New Owner Registered',
          description: `${firstName} ${lastName} (${typeOfOwner}) from ${companyName} completed registration`,
          link: '/owner-management'
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast.success("Account created! Redirecting to your dashboard...");
      
      // Redirect to owner portal immediately
      setTimeout(() => {
        navigate("/owner-portal");
      }, 500);

    } catch (error: any) {
      console.error("Signup error:", error);
      
      if (error.message.includes("already registered") || error.code === "23505") {
        toast.error("This email is already registered. Please sign in instead.");
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
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Your Company LLC"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
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
