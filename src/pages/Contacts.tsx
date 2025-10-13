import { useState } from "react";
import { Search, Plus, Phone, Mail, MapPin, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  properties: number;
  lastContact: string;
}

const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    address: "123 Main St, Downtown",
    avatar: "SJ",
    properties: 2,
    lastContact: "2 days ago",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "(555) 234-5678",
    address: "456 Oak Ave, Uptown",
    avatar: "MC",
    properties: 1,
    lastContact: "5 days ago",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    phone: "(555) 345-6789",
    address: "789 Pine Rd, Suburbs",
    avatar: "ER",
    properties: 3,
    lastContact: "1 week ago",
  },
  {
    id: "4",
    name: "David Kim",
    email: "david.kim@email.com",
    phone: "(555) 456-7890",
    address: "321 Elm St, Westside",
    avatar: "DK",
    properties: 1,
    lastContact: "3 days ago",
  },
  {
    id: "5",
    name: "Jessica Williams",
    email: "j.williams@email.com",
    phone: "(555) 567-8901",
    address: "654 Maple Dr, Eastside",
    avatar: "JW",
    properties: 2,
    lastContact: "1 day ago",
  },
  {
    id: "6",
    name: "Robert Taylor",
    email: "r.taylor@email.com",
    phone: "(555) 678-9012",
    address: "987 Cedar Ln, Southside",
    avatar: "RT",
    properties: 4,
    lastContact: "4 days ago",
  },
];

const Contacts = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = mockContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground mt-1">Manage your client relationships</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <Card key={contact.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
                  {contact.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground">{contact.lastContact}</p>
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

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{contact.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{contact.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
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
    </div>
  );
};

export default Contacts;
