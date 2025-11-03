import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Phone, Mail, MapPin, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

type ContactCategory = "clients" | "leads" | "vendors" | "business-owners" | "title-offices" | "wholesalers" | "hard-money-lenders";

type VendorSubcategory = "framers" | "flooring" | "roofing" | "plumbers" | "general-contractors" | "electricians" | "hvac" | "painters" | "landscaping";

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
  vendorSubcategory?: VendorSubcategory;
  company?: string;
  isDemoData?: boolean;
}

const mockContacts: Contact[] = [
  // Clients
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    address: "123 Main St, Downtown",
    avatar: "SJ",
    properties: 2,
    lastContact: "2 days ago",
    category: "clients",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "(555) 234-5678",
    address: "456 Oak Ave, Uptown",
    avatar: "MC",
    properties: 3,
    lastContact: "5 days ago",
    category: "clients",
  },
  // Leads
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    phone: "(555) 345-6789",
    address: "789 Pine Rd, Suburbs",
    avatar: "ER",
    properties: 0,
    lastContact: "1 week ago",
    category: "leads",
  },
  {
    id: "4",
    name: "David Kim",
    email: "david.kim@email.com",
    phone: "(555) 456-7890",
    address: "321 Elm St, Westside",
    avatar: "DK",
    properties: 0,
    lastContact: "3 days ago",
    category: "leads",
  },
  // Vendors
  {
    id: "5",
    name: "Tom's Framing Co.",
    email: "tom@framingco.com",
    phone: "(555) 567-8901",
    address: "654 Maple Dr, Eastside",
    avatar: "TF",
    properties: 0,
    lastContact: "1 day ago",
    category: "vendors",
    vendorSubcategory: "framers",
    company: "Tom's Framing Co.",
  },
  {
    id: "6",
    name: "Elite Flooring Services",
    email: "contact@eliteflooring.com",
    phone: "(555) 678-9012",
    address: "987 Cedar Ln, Southside",
    avatar: "EF",
    properties: 0,
    lastContact: "4 days ago",
    category: "vendors",
    vendorSubcategory: "flooring",
    company: "Elite Flooring Services",
  },
  {
    id: "7",
    name: "AAA Plumbing",
    email: "service@aaaplumbing.com",
    phone: "(555) 789-0123",
    address: "321 Water St, Northside",
    avatar: "AP",
    properties: 0,
    lastContact: "2 days ago",
    category: "vendors",
    vendorSubcategory: "plumbers",
    company: "AAA Plumbing",
  },
  {
    id: "8",
    name: "ProRoof Solutions",
    email: "info@proroof.com",
    phone: "(555) 890-1234",
    address: "456 High St, Hillside",
    avatar: "PR",
    properties: 0,
    lastContact: "1 week ago",
    category: "vendors",
    vendorSubcategory: "roofing",
    company: "ProRoof Solutions",
  },
  // Business Owners
  {
    id: "9",
    name: "James Patterson",
    email: "james@bigbusiness.com",
    phone: "(555) 901-2345",
    address: "789 Corporate Blvd, Business District",
    avatar: "JP",
    properties: 15,
    lastContact: "3 days ago",
    category: "business-owners",
    company: "Patterson Investments LLC",
  },
  // Title Offices
  {
    id: "10",
    name: "Premier Title Company",
    email: "contact@premiertitle.com",
    phone: "(555) 012-3456",
    address: "123 Legal Ave, Downtown",
    avatar: "PT",
    properties: 0,
    lastContact: "5 days ago",
    category: "title-offices",
    company: "Premier Title Company",
  },
  // Wholesalers
  {
    id: "11",
    name: "Quick Flip Wholesale",
    email: "deals@quickflip.com",
    phone: "(555) 123-4560",
    address: "654 Trade St, Market District",
    avatar: "QF",
    properties: 8,
    lastContact: "1 day ago",
    category: "wholesalers",
    company: "Quick Flip Wholesale",
  },
  // Hard Money Lenders
  {
    id: "12",
    name: "Fast Capital Lending",
    email: "loans@fastcapital.com",
    phone: "(555) 234-5601",
    address: "987 Finance Rd, Banking District",
    avatar: "FC",
    properties: 0,
    lastContact: "2 days ago",
    category: "hard-money-lenders",
    company: "Fast Capital Lending",
  },
];

const categoryLabels: Record<ContactCategory, string> = {
  "clients": "Clients",
  "leads": "Leads",
  "vendors": "Vendors",
  "business-owners": "Business Owners",
  "title-offices": "Title Offices",
  "wholesalers": "Wholesalers",
  "hard-money-lenders": "Hard Money Lenders",
};

const vendorSubcategoryLabels: Record<VendorSubcategory, string> = {
  "framers": "Framers",
  "flooring": "Flooring",
  "roofing": "Roofing",
  "plumbers": "Plumbers",
  "general-contractors": "General Contractors",
  "electricians": "Electricians",
  "hvac": "HVAC",
  "painters": "Painters",
  "landscaping": "Landscaping",
};

const Contacts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | "all">("all");
  const [vendorFilter, setVendorFilter] = useState<VendorSubcategory | "all">("all");
  const [contacts, setContacts] = useState<Contact[]>(() => mockContacts.map(c => ({ ...c, isDemoData: true })));
  const [calling, setCalling] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setContacts(prev => prev.filter(c => !c.isDemoData));
    window.addEventListener('demoDataCleared', handler);
    return () => window.removeEventListener('demoDataCleared', handler);
  }, []);

  const getCategoryCount = (category: ContactCategory) => {
    return contacts.filter(c => c.category === category).length;
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || contact.category === selectedCategory;
    
    const matchesVendorSubcategory = 
      selectedCategory !== "vendors" || 
      vendorFilter === "all" || 
      contact.vendorSubcategory === vendorFilter;

    return matchesSearch && matchesCategory && matchesVendorSubcategory;
  });

  const handleDeleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleCall = async (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setCalling(contact.id);
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
      setCalling(null);
    }
  };

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
            <Button className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-primary hover:bg-primary/90">
              <Plus className="h-5 w-5" />
              <span className="font-semibold">Add New Contact</span>
            </Button>
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
            
            {selectedCategory === "vendors" && (
              <Select value={vendorFilter} onValueChange={(value) => setVendorFilter(value as VendorSubcategory | "all")}>
                <SelectTrigger className="w-full sm:w-[220px] h-11 bg-card shadow-sm">
                  <SelectValue placeholder="Filter by trade" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Trades</SelectItem>
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
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
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
                        {contact.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate text-lg group-hover:text-primary transition-colors">
                          {contact.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{contact.lastContact}</p>
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
                      {contact.vendorSubcategory && ` • ${vendorSubcategoryLabels[contact.vendorSubcategory]}`}
                    </Badge>
                    {contact.isDemoData && (
                      <Badge variant="secondary" className="text-xs font-medium">Demo</Badge>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/item">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover/item:bg-primary/10 transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="truncate">{contact.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/item">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover/item:bg-primary/10 transition-colors">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/item">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover/item:bg-primary/10 transition-colors">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="truncate">{contact.address}</span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-medium text-foreground">
                        {contact.properties} {contact.properties === 1 ? 'property' : 'properties'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => handleCall(contact, e)}
                        disabled={calling === contact.id}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `mailto:${contact.email}`;
                        }}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
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
