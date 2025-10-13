import { useState } from "react";
import { Phone, MessageSquare, Search, X, PhoneCall, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar: string;
}

const mockContacts: Contact[] = [
  { id: "1", name: "Sarah Johnson", phone: "(555) 123-4567", avatar: "SJ" },
  { id: "2", name: "Michael Chen", phone: "(555) 234-5678", avatar: "MC" },
  { id: "3", name: "Emily Rodriguez", phone: "(555) 345-6789", avatar: "ER" },
  { id: "4", name: "David Kim", phone: "(555) 456-7890", avatar: "DK" },
];

const Communications = () => {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = mockContacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const handleDialPad = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleCall = () => {
    if (!phoneNumber && !selectedContact) {
      toast({
        title: "No Number",
        description: "Please enter a phone number or select a contact",
        variant: "destructive",
      });
      return;
    }

    const number = phoneNumber || selectedContact?.phone || "";
    toast({
      title: "Calling...",
      description: `Initiating call to ${number}`,
    });
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast({
        title: "No Message",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber && !selectedContact) {
      toast({
        title: "No Recipient",
        description: "Please select a contact or enter a phone number",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message Sent",
      description: `Message sent to ${selectedContact?.name || phoneNumber}`,
    });
    setMessageText("");
  };

  const dialPadButtons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Communications</h1>
        <p className="text-muted-foreground mt-1">Call and text your contacts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact List */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Contacts</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    setSelectedContact(contact);
                    setPhoneNumber(contact.phone);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedContact?.id === contact.id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {contact.avatar}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Main Communication Area */}
        <Card className="lg:col-span-2 p-6">
          <Tabs defaultValue="call">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="call" className="gap-2">
                <Phone className="h-4 w-4" />
                Call
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="call" className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="text-2xl h-16 text-center font-semibold"
                  />
                  {phoneNumber && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPhoneNumber("");
                        setSelectedContact(null);
                      }}
                      className="ml-2"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {selectedContact && (
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {selectedContact.avatar}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedContact.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedContact.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dial Pad */}
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                {dialPadButtons.map((row, rowIndex) => (
                  row.map((digit) => (
                    <Button
                      key={`${rowIndex}-${digit}`}
                      variant="outline"
                      size="lg"
                      onClick={() => handleDialPad(digit)}
                      className="h-16 text-2xl font-semibold"
                    >
                      {digit}
                    </Button>
                  ))
                ))}
              </div>

              <div className="flex justify-center mt-6">
                <Button
                  size="lg"
                  onClick={handleCall}
                  className="w-full max-w-sm gap-2 h-14"
                >
                  <PhoneCall className="h-5 w-5" />
                  Call
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-6">
              <div>
                <div className="mb-4">
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="text-lg h-12"
                  />
                </div>

                {selectedContact && (
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {selectedContact.avatar}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedContact.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedContact.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Message
                  </label>
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {messageText.length} characters
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={handleSendMessage}
                  className="w-full gap-2"
                >
                  <Send className="h-5 w-5" />
                  Send Message
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Communications;
