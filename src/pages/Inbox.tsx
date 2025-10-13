import { useState } from "react";
import { Search, Mail, MailOpen, Star, Archive, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface EmailThread {
  id: string;
  subject: string;
  recipient: string;
  preview: string;
  time: string;
  unread: boolean;
  starred: boolean;
  messages: Message[];
}

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  time: string;
  isFromMe: boolean;
}

const mockThreads: EmailThread[] = [
  {
    id: "1",
    subject: "Follow-up: Downtown Condo Viewing",
    recipient: "Sarah Johnson",
    preview: "Thank you for your interest in the downtown condo. I wanted to follow up...",
    time: "2 hours ago",
    unread: true,
    starred: true,
    messages: [
      {
        id: "1-1",
        from: "you@realestate.com",
        to: "sarah.j@email.com",
        content: "Hi Sarah,\n\nThank you for your interest in the downtown condo. I wanted to follow up on our conversation from yesterday. Are you still interested in scheduling a viewing?\n\nBest regards,\nYour Agent",
        time: "2 hours ago",
        isFromMe: true,
      },
    ],
  },
  {
    id: "2",
    subject: "Property Details Request",
    recipient: "Michael Chen",
    preview: "I'm reaching out regarding the luxury apartment listing you inquired about...",
    time: "5 hours ago",
    unread: true,
    starred: false,
    messages: [
      {
        id: "2-1",
        from: "you@realestate.com",
        to: "m.chen@email.com",
        content: "Hi Michael,\n\nI'm reaching out regarding the luxury apartment listing you inquired about. I've attached the complete property details and pricing information.\n\nLet me know if you'd like to schedule a viewing!\n\nBest,\nYour Agent",
        time: "5 hours ago",
        isFromMe: true,
      },
    ],
  },
  {
    id: "3",
    subject: "Re: Offer Status Update",
    recipient: "Emily Rodriguez",
    preview: "I wanted to update you on the status of your offer for the family house...",
    time: "Yesterday",
    unread: false,
    starred: true,
    messages: [
      {
        id: "3-1",
        from: "you@realestate.com",
        to: "emily.r@email.com",
        content: "Hi Emily,\n\nI wanted to update you on the status of your offer for the family house on Pine Road. The sellers have reviewed your proposal and are very interested.\n\nCan we schedule a call tomorrow to discuss next steps?\n\nBest regards,\nYour Agent",
        time: "Yesterday",
        isFromMe: true,
      },
      {
        id: "3-2",
        from: "emily.r@email.com",
        to: "you@realestate.com",
        content: "That sounds great! I'm available tomorrow afternoon. What time works best for you?",
        time: "Yesterday",
        isFromMe: false,
      },
    ],
  },
  {
    id: "4",
    subject: "Welcome to Our Real Estate Services",
    recipient: "David Kim",
    preview: "Welcome! I'm excited to help you find your perfect property...",
    time: "2 days ago",
    unread: false,
    starred: false,
    messages: [
      {
        id: "4-1",
        from: "you@realestate.com",
        to: "david.kim@email.com",
        content: "Hi David,\n\nWelcome! I'm excited to help you find your perfect property. I've reviewed your preferences and have several listings that might interest you.\n\nI'll send over some options shortly.\n\nBest,\nYour Agent",
        time: "2 days ago",
        isFromMe: true,
      },
    ],
  },
];

const Inbox = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(mockThreads[0]);
  const [threads] = useState<EmailThread[]>(mockThreads);

  const filteredThreads = threads.filter(
    (thread) =>
      thread.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
        <p className="text-muted-foreground mt-1">Manage your email conversations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* Email List */}
        <Card className="lg:col-span-1 flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                    selectedThread?.id === thread.id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {thread.recipient.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${thread.unread ? "font-semibold" : ""}`}>
                          {thread.recipient}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {thread.starred && <Star className="h-3 w-3 fill-warning text-warning" />}
                      {thread.unread && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                  </div>
                  <p className={`text-sm mb-1 truncate ${thread.unread ? "font-medium" : ""}`}>
                    {thread.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{thread.preview}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{thread.time}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Email Content */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedThread ? (
            <>
              <div className="p-6 border-b">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {selectedThread.subject}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      With {selectedThread.recipient}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {selectedThread.messages.map((message) => (
                    <div key={message.id}>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {message.isFromMe ? "ME" : message.from.split("@")[0].slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-foreground">
                              {message.isFromMe ? "You" : message.from}
                            </p>
                            <span className="text-xs text-muted-foreground">{message.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">To: {message.to}</p>
                          <div className="mt-3 text-sm text-foreground whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      </div>
                      <Separator className="mt-6" />
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-6 border-t">
                <Button className="w-full">Reply</Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Inbox;
