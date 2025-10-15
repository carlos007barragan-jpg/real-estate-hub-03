import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Calendar, User, Building2, Send, PlusCircle } from "lucide-react";
import { TwilioCallInterface } from "@/components/TwilioCallInterface";
import { CallHistory } from "@/components/CallHistory";

export const SingleColumnLayout = ({ leadData, handleCall, handleSendMessage, handleAddNote, messages, notes, newMessage, setNewMessage, newNote, setNewNote, id }: any) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Contact & Personal Information Section */}
      <Card className="border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Contact & Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium truncate">{leadData.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{leadData.phone}</p>
              </div>
            </div>
            {leadData.spousePhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Spouse Phone</p>
                  <p className="font-medium">{leadData.spousePhone}</p>
                </div>
              </div>
            )}
            {leadData.spouseEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Spouse Email</p>
                  <p className="font-medium truncate">{leadData.spouseEmail}</p>
                </div>
              </div>
            )}
            {leadData.maritalStatus && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Marital Status</p>
                  <p className="font-medium capitalize">{leadData.maritalStatus}</p>
                </div>
              </div>
            )}
            {leadData.socialStatus && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Social Status</p>
                  <p className="font-medium">{leadData.socialStatus}</p>
                </div>
              </div>
            )}
            {leadData.preferredContactMethod && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Preferred Contact</p>
                  <p className="font-medium capitalize">{leadData.preferredContactMethod}</p>
                </div>
              </div>
            )}
            {leadData.languagePreference && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Language</p>
                  <p className="font-medium">{leadData.languagePreference}</p>
                </div>
              </div>
            )}
            {leadData.leadTemperature && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Lead Status</p>
                  <p className="font-medium capitalize">{leadData.leadTemperature}</p>
                </div>
              </div>
            )}
            {leadData.area && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Area</p>
                  <p className="font-medium">{leadData.area}</p>
                </div>
              </div>
            )}
            {leadData.currentAddress && (
              <div className="flex items-start gap-2 md:col-span-2">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Current Address</p>
                  <p className="font-medium">{leadData.currentAddress}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{leadData.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Source</p>
                <p className="font-medium">{leadData.source}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Assigned To</p>
                <p className="font-medium">{leadData.assignedTo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Timeframe</p>
                <p className="font-medium">{leadData.timeframe}</p>
              </div>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex gap-2">
            <TwilioCallInterface leadPhone={leadData.phone} leadName={leadData.name} />
            <Button onClick={handleCall} variant="outline" size="sm" className="h-8 text-xs">
              <Phone className="h-3 w-3 mr-1" />
              Send SMS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Property Section */}
      <Card className="border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Property Information</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Property Address</p>
                <p className="font-medium">{leadData.propertyInterest.address}</p>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{leadData.propertyInterest.propertyType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bedrooms / Bathrooms</p>
                <p className="font-medium">{leadData.propertyInterest.bedrooms} / {leadData.propertyInterest.bathrooms}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Square Feet</p>
                <p className="font-medium">{leadData.propertyInterest.sqft}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="font-medium text-primary">{leadData.propertyInterest.budget}</p>
              </div>
              {leadData.downPayment && (
                <div>
                  <p className="text-muted-foreground">Down Payment</p>
                  <p className="font-medium">{leadData.downPayment}</p>
                </div>
              )}
              {leadData.financingType && (
                <div>
                  <p className="text-muted-foreground">Financing Type</p>
                  <p className="font-medium capitalize">{leadData.financingType}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Calls Section */}
      <Card className="border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call History
          </h3>
          <ScrollArea className="h-[300px]">
            <CallHistory leadId={id!} />
          </ScrollArea>
        </CardContent>
      </Card>

      <Separator />

      {/* Notes Section */}
      <Card className="border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Notes
          </h3>
          <div className="space-y-2 mb-3">
            {notes.map((note: any) => (
              <Card key={note.id} className="p-3 bg-muted/30 text-xs">
                <p className="mb-2">{note.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{note.author}</span>
                  <span>{note.timestamp}</span>
                </div>
              </Card>
            ))}
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
            />
            <Button onClick={handleAddNote} disabled={!newNote.trim()} className="w-full h-8 text-xs">
              <PlusCircle className="h-3 w-3 mr-1" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Messages Section */}
      <Card className="border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Send className="h-4 w-4" />
            Messages
          </h3>
          <ScrollArea className="h-[300px] mb-3">
            <div className="space-y-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Send className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                messages.map((message: any) => (
                  <div key={message.id} className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-2 text-xs ${message.sender === "agent" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p>{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="text-sm h-8"
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="sm" className="h-8">
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
