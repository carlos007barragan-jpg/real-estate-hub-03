import { useState } from "react";
import { Search, Plus, Phone, Mail, MapPin, MoreVertical } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | "all">("all");
  const [vendorFilter, setVendorFilter] = useState<VendorSubcategory | "all">("all");

  const getCategoryCount = (category: ContactCategory) => {
    return mockContacts.filter(c => c.category === category).length;
  };

  const filteredContacts = mockContacts.filter((contact) => {
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground mt-1">Manage your book of business</p>
          </div>
          <Button className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Add New Contact</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {selectedCategory === "vendors" && (
            <Select value={vendorFilter} onValueChange={(value) => setVendorFilter(value as VendorSubcategory | "all")}>
              <SelectTrigger className="w-full sm:w-[200px]">
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

        <Tabs value={selectedCategory} onValueChange={(value) => {
          setSelectedCategory(value as ContactCategory | "all");
          setVendorFilter("all");
        }} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
            <TabsTrigger value="all" className="gap-2">
              All Contacts
              <Badge variant="secondary">{mockContacts.length}</Badge>
            </TabsTrigger>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="gap-2">
                {label}
                <Badge variant="secondary">{getCategoryCount(key as ContactCategory)}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No contacts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
                    {contact.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{contact.name}</h3>
                    <p className="text-xs text-muted-foreground">{contact.lastContact}</p>
                    {contact.company && (
                      <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Send Email</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  {categoryLabels[contact.category]}
                  {contact.vendorSubcategory && ` - ${vendorSubcategoryLabels[contact.vendorSubcategory]}`}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{contact.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{contact.address}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {contact.properties} {contact.properties === 1 ? 'property' : 'properties'}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Contacts;
