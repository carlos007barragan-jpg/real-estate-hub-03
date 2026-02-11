import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, Mail, Building2, Edit, Plus, ArrowLeft } from "lucide-react";
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

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  category: string;
  vendor_subcategory: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

const ContactProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  useEffect(() => {
    if (id) fetchContact();
  }, [id]);

  const fetchContact = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setContact(data);
      setEditForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        company: data.company || "",
        notes: data.notes || "",
      });
    } catch (error: any) {
      console.error("Error fetching contact:", error);
      toast({
        title: "Error",
        description: "Failed to load contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!contact) return;

    try {
      const { error } = await supabase
        .from("contacts")
        .update({
          name: editForm.name,
          email: editForm.email || null,
          phone: editForm.phone || null,
          company: editForm.company || null,
          notes: editForm.notes || null,
        })
        .eq("id", contact.id);

      if (error) throw error;

      setContact({
        ...contact,
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        company: editForm.company || null,
        notes: editForm.notes || null,
      });
      setEditDialogOpen(false);
      toast({
        title: "Contact Updated",
        description: "Contact information has been saved",
      });
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    }
  };

  const handleCall = () => {
    if (!contact?.phone) {
      toast({
        title: "No phone number",
        description: "This contact doesn't have a phone number",
        variant: "destructive",
      });
      return;
    }

    window.dispatchEvent(new CustomEvent('initiateCall', {
      detail: {
        phoneNumber: contact.phone,
        contactName: contact.name
      }
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // No blocking loading state - render immediately

  if (!contact) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate("/contacts")} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Button>
        <p className="text-muted-foreground">Contact not found</p>
      </div>
    );
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
                {getInitials(contact.name)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{contact.name}</h1>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5">
                    {contact.category}
                    {contact.vendor_subcategory && ` • ${contact.vendor_subcategory}`}
                  </Badge>
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
              <Button onClick={handleCall} className="gap-2" disabled={!contact.phone}>
                <Phone className="h-4 w-4" />
                Call
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
                    <DialogDescription>Update contact information</DialogDescription>
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
                      <Label htmlFor="edit-company">Company</Label>
                      <Input
                        id="edit-company"
                        value={editForm.company}
                        onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-notes">Notes</Label>
                      <Textarea
                        id="edit-notes"
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
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
                <p className="font-medium">{contact.email || "Not provided"}</p>
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
                <p className="font-medium">{contact.phone || "Not provided"}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium">{contact.company || "Not provided"}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Notes Section */}
        {contact.notes && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-2">Notes</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
          </Card>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag, i) => (
                <Badge key={i} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Tabs Section */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="deals">Deals & Business</TabsTrigger>
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