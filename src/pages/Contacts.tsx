import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Phone, Mail, MapPin, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateContactDialog } from "@/components/CreateContactDialog";

type ContactCategory = "client" | "lead" | "vendor" | "partner" | "other";
type VendorSubcategory = "title_company" | "inspector" | "contractor" | "photographer" | "stager" | "attorney" | "lender" | "insurance" | "other";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  category: ContactCategory;
  vendor_subcategory: VendorSubcategory | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

const categoryLabels: Record<ContactCategory, string> = {
  "client": "Clients",
  "lead": "Leads",
  "vendor": "Vendors",
  "partner": "Partners",
  "other": "Other",
};

const vendorSubcategoryLabels: Record<VendorSubcategory, string> = {
  "title_company": "Title Company",
  "inspector": "Inspector",
  "contractor": "Contractor",
  "photographer": "Photographer",
  "stager": "Stager",
  "attorney": "Attorney",
  "lender": "Lender",
  "insurance": "Insurance",
  "other": "Other",
};

const Contacts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | "all">("all");
  const [vendorFilter, setVendorFilter] = useState<VendorSubcategory | "all">("all");

  // Fetch contacts from database
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Contact[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: "Contact Deleted",
        description: "Contact has been removed",
      });
    },
    onError: (error) => {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const getCategoryCount = (category: ContactCategory) => {
    return contacts.filter(c => c.category === category).length;
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || contact.category === selectedCategory;
    
    const matchesVendorSubcategory = 
      selectedCategory !== "vendor" || 
      vendorFilter === "all" || 
      contact.vendor_subcategory === vendorFilter;

    return matchesSearch && matchesCategory && matchesVendorSubcategory;
  });

  const handleDeleteContact = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleCall = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!contact.phone) {
      toast({
        title: "No phone number",
        description: "This contact doesn't have a phone number",
        variant: "destructive",
      });
      return;
    }
    
    // Dispatch custom event to trigger GlobalCallManager
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading contacts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Book of Business
              </h1>
              <p className="text-muted-foreground">Manage and organize all your contacts in one place</p>
            </div>
            <CreateContactDialog />
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 bg-card shadow-sm border-border/50 focus:border-primary transition-colors"
              />
            </div>
            
            {selectedCategory === "vendor" && (
              <Select value={vendorFilter} onValueChange={(value) => setVendorFilter(value as VendorSubcategory | "all")}>
                <SelectTrigger className="w-full sm:w-[220px] h-11 bg-card shadow-sm">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(vendorSubcategoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={(value) => {
            setSelectedCategory(value as ContactCategory | "all");
            setVendorFilter("all");
          }} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-muted/50 p-2">
              <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                All Contacts
                <Badge variant="secondary" className="ml-1">{contacts.length}</Badge>
              </TabsTrigger>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  {label}
                  <Badge variant="secondary" className="ml-1">{getCategoryCount(key as ContactCategory)}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Results Section */}
        {filteredContacts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-xl font-medium text-foreground mb-2">No contacts found</p>
            <p className="text-muted-foreground">
              {contacts.length === 0 ? "Add your first contact to get started" : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredContacts.map((contact, index) => (
              <Card 
                key={contact.id} 
                onClick={() => navigate(`/contacts/${contact.id}`)}
                className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                        {getInitials(contact.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate text-lg group-hover:text-primary transition-colors">
                          {contact.name}
                        </h3>
                        {contact.company && (
                          <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                            {contact.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="shrink-0 hover:bg-muted"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover w-48">
                        <DropdownMenuItem onClick={() => navigate(`/contacts/${contact.id}`)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Contact</DropdownMenuItem>
                        <DropdownMenuItem>Send Email</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContact(contact.id);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Category Badge */}
                  <div className="mb-4 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-medium border-primary/20 bg-primary/5">
                      {categoryLabels[contact.category]}
                      {contact.vendor_subcategory && ` • ${vendorSubcategoryLabels[contact.vendor_subcategory]}`}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 mb-4">
                    {contact.email && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/item">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover/item:bg-primary/10 transition-colors">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/item">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover/item:bg-primary/10 transition-colors">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex gap-2">
                      {contact.phone && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => handleCall(contact, e)}
                          className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          Call
                        </Button>
                      )}
                      {contact.email && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `mailto:${contact.email}`;
                          }}
                          className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Mail className="h-3 w-3" />
                          Email
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contacts;