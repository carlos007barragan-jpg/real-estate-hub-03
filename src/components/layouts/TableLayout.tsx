import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Calendar, User, Building2, Send, PlusCircle } from "lucide-react";
import { TwilioCallInterface } from "@/components/TwilioCallInterface";
import { CallHistory } from "@/components/CallHistory";

export const TableLayout = ({ leadData, handleCall, handleSendMessage, handleAddNote, messages, notes, newMessage, setNewMessage, newNote, setNewNote, id }: any) => {
  return (
    <div className="space-y-3">
      {/* Sticky Header Summary */}
      <Card className="border sticky top-0 z-10 bg-background">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Email</p>
              <p className="font-medium truncate">{leadData.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Phone</p>
              <p className="font-medium">{leadData.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Source</p>
              <p className="font-medium">{leadData.source}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Assigned To</p>
              <p className="font-medium">{leadData.assignedTo}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Timeframe</p>
              <p className="font-medium">{leadData.timeframe}</p>
            </div>
            <div className="flex gap-1">
              <TwilioCallInterface leadPhone={leadData.phone} leadName={leadData.name} />
              <Button onClick={handleCall} variant="outline" size="sm" className="h-7 px-2 text-xs flex-1">
                SMS
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dense Lead Info */}
      <Card className="border">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Phone</p>
              <p className="font-medium">{leadData.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Email</p>
              <p className="font-medium truncate">{leadData.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Spouse Phone</p>
              <p className="font-medium">{leadData.spousePhone || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Spouse Email</p>
              <p className="font-medium truncate">{leadData.spouseEmail || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Preferred Contact</p>
              <p className="font-medium capitalize">{leadData.preferredContactMethod || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Language</p>
              <p className="font-medium">{leadData.languagePreference || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Lead Status</p>
              <p className="font-medium capitalize">{leadData.leadTemperature || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Marital Status</p>
              <p className="font-medium capitalize">{leadData.maritalStatus || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Social Status</p>
              <p className="font-medium">{leadData.socialStatus || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground mb-0.5">Current Address</p>
              <p className="font-medium">{leadData.currentAddress || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Area</p>
              <p className="font-medium">{leadData.area || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Info */}
      <Card className="border">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div className="col-span-2">
              <p className="text-muted-foreground mb-0.5">Property Address</p>
              <p className="font-medium">{leadData.propertyInterest.address}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Type</p>
              <p className="font-medium">{leadData.propertyInterest.propertyType}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Beds / Baths</p>
              <p className="font-medium">{leadData.propertyInterest.bedrooms} / {leadData.propertyInterest.bathrooms}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Sqft</p>
              <p className="font-medium">{leadData.propertyInterest.sqft}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Budget</p>
              <p className="font-medium text-primary">{leadData.propertyInterest.budget}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Down Payment</p>
              <p className="font-medium">{leadData.downPayment || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Financing Type</p>
              <p className="font-medium">{leadData.financingType || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border">
          <CardContent className="p-3">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Calls
            </h3>
            <ScrollArea className="h-[400px]">
              <CallHistory leadId={id!} />
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-3">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <PlusCircle className="h-3 w-3" />
              Notes
            </h3>
            <ScrollArea className="h-[300px] mb-2">
              <div className="space-y-2">
                {notes.map((note: any) => (
                  <div key={note.id} className="p-2 bg-muted/30 rounded text-xs">
                    <p className="mb-1">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{note.author}</span>
                      <span>{note.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="space-y-2">
              <Textarea
                placeholder="Add note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px] text-xs resize-none"
              />
              <Button onClick={handleAddNote} disabled={!newNote.trim()} className="w-full h-7 text-xs">
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-3">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Send className="h-3 w-3" />
              Messages
            </h3>
            <ScrollArea className="h-[300px] mb-2">
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Send className="h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">No messages</p>
                  </div>
                ) : (
                  messages.map((message: any) => (
                    <div key={message.id} className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded p-2 text-xs ${message.sender === "agent" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p>{message.text}</p>
                        <p className="text-xs opacity-70 mt-0.5">{message.timestamp}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-1">
              <Input
                placeholder="Message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="text-xs h-7"
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="sm" className="h-7 px-2">
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
