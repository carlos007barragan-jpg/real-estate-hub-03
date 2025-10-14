import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, Calendar, User, Building2, Send, PlusCircle, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  sender: "agent" | "lead";
  timestamp: string;
}

interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

// Pipeline stages
const pipelineStages = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Showing Scheduled",
  "Offer Made",
  "Under Contract",
  "Closed Won",
  "Closed Lost"
] as const;

type PipelineStage = typeof pipelineStages[number];

// Mock leads data - same as in Leads.tsx
const mockLeadsData = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    status: "new" as const,
    source: "Website",
    value: "$450,000",
    date: "2024-01-15",
    assignedTo: "John Smith",
    pipelineStage: "Contacted" as PipelineStage,
    propertyInterest: {
      address: "123 Main Street, Downtown",
      propertyType: "Single Family Home",
      bedrooms: 4,
      bathrooms: 2.5,
      sqft: "2,500",
      budget: "$400,000 - $500,000",
    },
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "(555) 234-5678",
    status: "contacted" as const,
    source: "Referral",
    value: "$650,000",
    date: "2024-01-14",
    assignedTo: "Maria Garcia",
    pipelineStage: "Qualified" as PipelineStage,
    propertyInterest: {
      address: "456 Oak Avenue, Uptown",
      propertyType: "Condo",
      bedrooms: 3,
      bathrooms: 2,
      sqft: "1,800",
      budget: "$600,000 - $700,000",
    },
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    phone: "(555) 345-6789",
    status: "qualified" as const,
    source: "Open House",
    value: "$520,000",
    date: "2024-01-13",
    assignedTo: "John Smith",
    pipelineStage: "Showing Scheduled" as PipelineStage,
    propertyInterest: {
      address: "789 Pine Road, Suburbs",
      propertyType: "Townhouse",
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: "2,100",
      budget: "$500,000 - $550,000",
    },
  },
  {
    id: "4",
    name: "David Kim",
    email: "david.kim@email.com",
    phone: "(555) 456-7890",
    status: "contacted" as const,
    source: "Social Media",
    value: "$380,000",
    date: "2024-01-12",
    assignedTo: "Alex Johnson",
    pipelineStage: "New Lead" as PipelineStage,
    propertyInterest: {
      address: "321 Elm Street, Westside",
      propertyType: "Single Family Home",
      bedrooms: 3,
      bathrooms: 2,
      sqft: "1,600",
      budget: "$350,000 - $400,000",
    },
  },
];

const LeadProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Find the lead based on ID
  const leadData = mockLeadsData.find(l => l.id === id) || mockLeadsData[0];
  
  const [currentStage, setCurrentStage] = useState<PipelineStage>(leadData.pipelineStage);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi, I'm interested in viewing the property on Main Street.",
      sender: "lead",
      timestamp: "2024-01-15 10:30 AM",
    },
    {
      id: "2",
      text: "Hello Sarah! I'd be happy to help. Are you available this weekend for a showing?",
      sender: "agent",
      timestamp: "2024-01-15 11:15 AM",
    },
  ]);

  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      content: "Lead is very interested in properties with large backyards. Has a budget of $450k.",
      author: "John Smith",
      timestamp: "2024-01-15 2:30 PM",
    },
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [newNote, setNewNote] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: (messages.length + 1).toString(),
        text: newMessage,
        sender: "agent",
        timestamp: new Date().toLocaleString(),
      };
      setMessages([...messages, message]);
      setNewMessage("");
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: (notes.length + 1).toString(),
        content: newNote,
        author: "Current Agent",
        timestamp: new Date().toLocaleString(),
      };
      setNotes([...notes, note]);
      setNewNote("");
    }
  };

  const handleStageChange = (newStage: PipelineStage) => {
    setCurrentStage(newStage);
    toast({
      title: "Pipeline Stage Updated",
      description: `Lead moved to ${newStage}`,
    });
  };

  const handleCall = async () => {
    try {
      toast({
        title: "Sending SMS...",
        description: "Please wait",
      });

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: leadData.phone,
          message: `Hi ${leadData.name}, this is ${leadData.assignedTo} from RealEstate CRM. I'd like to discuss your property interest. When would be a good time to talk?`
        }
      });

      if (error) throw error;

      toast({
        title: "SMS Sent Successfully!",
        description: `Message sent to ${leadData.phone}`,
      });
    } catch (error: any) {
      console.error('SMS error:', error);
      toast({
        title: "Failed to send SMS",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStageProgress = () => {
    const index = pipelineStages.indexOf(currentStage);
    return ((index + 1) / pipelineStages.length) * 100;
  };

  const statusColors = {
    new: "bg-info text-info-foreground",
    contacted: "bg-warning text-warning-foreground",
    qualified: "bg-success text-success-foreground",
    unqualified: "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/leads")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{leadData.name}</h1>
            <p className="text-muted-foreground">Lead Profile</p>
          </div>
          <Badge className={statusColors[leadData.status as keyof typeof statusColors]}>
            {leadData.status}
          </Badge>
        </div>

        {/* Pipeline Stage Card */}
        <Card className="border-border/50 shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MoveRight className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Pipeline Stage</h3>
              </div>
              <Select value={currentStage} onValueChange={handleStageChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Progress value={getStageProgress()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {pipelineStages.indexOf(currentStage) + 1} of {pipelineStages.length} stages complete
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact & Property Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium truncate">{leadData.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{leadData.phone}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lead Date</p>
                    <p className="font-medium">{leadData.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="font-medium">{leadData.source}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="font-medium">{leadData.assignedTo || "Unassigned"}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCall} className="flex-1 gap-2 bg-primary hover:bg-primary/90">
                    <Phone className="h-4 w-4" />
                    Send SMS
                  </Button>
                  <Button className="flex-1 gap-2" variant="outline">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Property Interest */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Property Interest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Address</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="font-medium text-sm">{leadData.propertyInterest.address}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium">{leadData.propertyInterest.propertyType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Beds/Baths</p>
                    <p className="font-medium">{leadData.propertyInterest.bedrooms} / {leadData.propertyInterest.bathrooms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sq Ft</p>
                    <p className="font-medium">{leadData.propertyInterest.sqft}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="font-medium text-primary">{leadData.propertyInterest.budget}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Messages & Notes */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-lg h-[calc(100vh-12rem)]">
              <Tabs defaultValue="messages" className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <TabsContent value="messages" className="flex-1 flex flex-col m-0 px-6 pb-6">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.sender === "agent"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender === "agent"
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {message.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} className="gap-2">
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="flex-1 flex flex-col m-0 px-6 pb-6">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <Card key={note.id} className="p-4 bg-muted/50">
                          <p className="text-sm mb-2">{note.content}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium">{note.author}</span>
                            <span>{note.timestamp}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a new note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button onClick={handleAddNote} className="w-full gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Add Note
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadProfile;
