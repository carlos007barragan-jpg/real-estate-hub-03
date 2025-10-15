import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, Mail, MapPin, Calendar, User, Building2, Send, PlusCircle, MoreVertical, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TwilioCallInterface } from "@/components/TwilioCallInterface";
import { CallHistory } from "@/components/CallHistory";
import { EditContactInfoDialog } from "@/components/EditContactInfoDialog";

export const TwoColumnLayout = ({ leadData, handleCall, handleSendMessage, handleAddNote, messages, notes, newMessage, setNewMessage, newNote, setNewNote, id, onLeadUpdate }: any) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);

  const scrollToMessages = () => {
    const messagesTab = document.querySelector('[data-value="messages"]');
    if (messagesTab) {
      (messagesTab as HTMLElement).click();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Compact Summary */}
      <div className="space-y-3">
        {/* Action Buttons */}
        <Card className="border sticky top-0 z-20 bg-background">
          <CardContent className="p-3 space-y-2">
            <TwilioCallInterface leadPhone={leadData.phone} leadName={leadData.name} />
            <Button onClick={scrollToMessages} variant="outline" className="w-full h-8 text-xs">
              <Phone className="h-3 w-3 mr-1" />
              Send SMS
            </Button>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Contact & Personal</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    Edit Information
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{leadData.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.phone}</span>
            </div>
            {leadData.spousePhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{leadData.spousePhone}</span>
                <span className="text-muted-foreground">(Spouse)</span>
              </div>
            )}
            {leadData.spouseEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{leadData.spouseEmail}</span>
                <span className="text-muted-foreground">(Spouse)</span>
              </div>
            )}
            {(leadData.maritalStatus || leadData.socialStatus || leadData.preferredContactMethod || leadData.languagePreference || leadData.currentAddress) && (
              <>
                <Separator className="my-2" />
                <Collapsible open={additionalInfoOpen} onOpenChange={setAdditionalInfoOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs px-2">
                      <span>More</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${additionalInfoOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-1">
                      {leadData.maritalStatus && (
                        <div>
                          <span className="text-muted-foreground">Marital:</span> 
                          <span className="capitalize ml-1">{leadData.maritalStatus}</span>
                        </div>
                      )}
                      {leadData.socialStatus && (
                        <div>
                          <span className="text-muted-foreground">SS Status:</span> 
                          <span className="ml-1">{leadData.socialStatus}</span>
                        </div>
                      )}
                      {leadData.preferredContactMethod && (
                        <div>
                          <span className="text-muted-foreground">Contact:</span> 
                          <span className="capitalize ml-1">{leadData.preferredContactMethod}</span>
                        </div>
                      )}
                      {leadData.languagePreference && (
                        <div>
                          <span className="text-muted-foreground">Language:</span> 
                          <span className="ml-1">{leadData.languagePreference}</span>
                        </div>
                      )}
                      {leadData.currentAddress && (
                        <div className="flex items-start gap-2 pt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-muted-foreground">Current:</span>
                            <span className="ml-1">{leadData.currentAddress}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
            <Separator className="my-2" />
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.source}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.assignedTo}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{leadData.timeframe}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">Property</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <span className="leading-tight">{leadData.propertyInterest.address}</span>
            </div>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {leadData.area && (
                <div>
                  <span className="text-muted-foreground">Area:</span> {leadData.area}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Type:</span> {leadData.propertyInterest.propertyType}
              </div>
              <div>
                <span className="text-muted-foreground">Beds:</span> {leadData.propertyInterest.bedrooms} / {leadData.propertyInterest.bathrooms}
              </div>
              <div>
                <span className="text-muted-foreground">Sqft:</span> {leadData.propertyInterest.sqft}
              </div>
              <div>
                <span className="text-muted-foreground">Budget:</span> {leadData.propertyInterest.budget}
              </div>
              {leadData.downPayment && (
                <div>
                  <span className="text-muted-foreground">Down:</span> {leadData.downPayment}
                </div>
              )}
              {leadData.financingType && (
                <div>
                  <span className="text-muted-foreground">Finance:</span> 
                  <span className="capitalize ml-1">{leadData.financingType}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <Tabs defaultValue="calls" className="w-full">
            <CardHeader className="p-3 pb-2">
              <TabsList className="grid w-full grid-cols-3 h-9">
                <TabsTrigger value="calls" className="text-xs">
                  <Phone className="h-3 w-3 mr-1" />
                  Calls
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">
                  <PlusCircle className="h-3 w-3 mr-1" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-xs" data-value="messages">
                  <Send className="h-3 w-3 mr-1" />
                  Messages
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="calls" className="px-3 pb-3 m-0">
              <ScrollArea className="h-[600px]">
                <CallHistory leadId={id!} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="messages" className="px-3 pb-3 m-0">
              <div className="flex flex-col h-[600px]">
                <ScrollArea className="flex-1 mb-3">
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
              </div>
            </TabsContent>

            <TabsContent value="notes" className="px-3 pb-3 m-0">
              <div className="flex flex-col h-[600px]">
                <ScrollArea className="flex-1 mb-3">
                  <div className="space-y-2">
                    {notes.map((note: any) => (
                      <Card key={note.id} className="p-3 text-xs">
                        <p className="mb-2">{note.content}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{note.author}</span>
                          <span>{note.timestamp}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
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
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Middle: Notes Section */}
      <Card className="border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Notes
          </h3>
          <ScrollArea className="h-[500px] mb-3">
            <div className="space-y-2">
              {notes.map((note: any) => (
                <Card key={note.id} className="p-3 bg-muted/30 text-sm">
                  <p className="mb-2">{note.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{note.author}</span>
                    <span>{note.timestamp}</span>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
            />
            <Button onClick={handleAddNote} disabled={!newNote.trim()} className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right: Messages Section */}
      <Card className="border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Send className="h-4 w-4" />
            Messages
          </h3>
          <ScrollArea className="h-[500px] mb-3">
            <div className="space-y-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Send className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                messages.map((message: any) => (
                  <div key={message.id} className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm ${message.sender === "agent" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
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
              className="text-sm"
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditContactInfoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        leadData={leadData}
        onUpdate={onLeadUpdate}
      />
    </div>
  );
};
