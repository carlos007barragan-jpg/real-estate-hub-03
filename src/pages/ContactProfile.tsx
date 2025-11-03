import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, Mail, MapPin, Building2, Edit, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactCategory = "clients" | "leads" | "vendors" | "business-owners" | "title-offices" | "wholesalers" | "hard-money-lenders";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  properties: number;
  lastContact: string;
  category: ContactCategory;
  company?: string;
  isDemoData?: boolean;
}

const categoryLabels: Record<ContactCategory, string> = {
  "clients": "Clients",
  "leads": "Leads",
  "vendors": "Vendors",
  "business-owners": "Business Owners",
  "title-offices": "Title Offices",
  "wholesalers": "Wholesalers",
  "hard-money-lenders": "Hard Money Lenders",
};

const ContactProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
  });

  useEffect(() => {
    // For now, load from local state/mock data
    // In production, this would fetch from database
    const mockContact: Contact = {
      id: id || "",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(555) 123-4567",
      address: "123 Main St, Downtown",
      avatar: "SJ",
      properties: 2,
      lastContact: "2 days ago",
      category: "clients",
      company: "Johnson Properties LLC",
    };
    setContact(mockContact);
    setEditForm({
      name: mockContact.name,
      email: mockContact.email,
      phone: mockContact.phone,
      address: mockContact.address,
      company: mockContact.company || "",
    });
    setLoading(false);
  }, [id]);

  const handleSaveEdit = () => {
    if (contact) {
      setContact({
        ...contact,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        company: editForm.company,
      });
      setEditDialogOpen(false);
      toast({
        title: "Contact Updated",
        description: "Contact information has been updated",
      });
    }
  };

  const handleCall = async () => {
    if (!contact) return;
    
    setCalling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke('make-call', {
        body: {
          to: contact.phone,
          from: user.email,
        }
      });

      if (error) throw error;

      toast({
        title: "Calling...",
        description: `Initiating call to ${contact.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Call Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCalling(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!contact) {
    return <div className="p-8">Contact not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/contacts")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-lg">
                {contact.avatar}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{contact.name}</h1>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5">
                    {categoryLabels[contact.category]}
                  </Badge>
                  {contact.isDemoData && (
                    <Badge variant="secondary">Demo</Badge>
                  )}
                </div>
                {contact.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{contact.company}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCall}
                disabled={calling}
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                {calling ? "Calling..." : "Call"}
              </Button>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Contact</DialogTitle>
                    <DialogDescription>
                      Update contact information
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Address</Label>
                      <Input
                        id="edit-address"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-company">Company</Label>
                      <Input
                        id="edit-company"
                        value={editForm.company}
                        onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{contact.email}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{contact.phone}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium">{contact.address}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="deals">Deals & Business</TabsTrigger>
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Call History</h3>
              <div className="text-center py-8 text-muted-foreground">
                <p>No call history available</p>
                <p className="text-sm">Call history will appear here once calls are made</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="deals">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Deals & Business History</h3>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Deal
                </Button>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <p>No deals recorded yet</p>
                <p className="text-sm">Add your first deal to track business history</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Team Members</h3>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <p>No team members added</p>
                <p className="text-sm">Add team members to track additional contacts</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Notes</h3>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Note
                </Button>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <p>No notes yet</p>
                <p className="text-sm">Add notes to track important information</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ContactProfile;
