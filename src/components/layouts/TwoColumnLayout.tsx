import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, Mail, MapPin, Calendar, User, Building2, MoreVertical, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TwilioCallInterface } from "@/components/TwilioCallInterface";
import { EditContactInfoDialog } from "@/components/EditContactInfoDialog";
import { TasksSection } from "@/components/TasksSection";
import { DocumentsSection } from "@/components/DocumentsSection";
import { MessagingSection } from "@/components/MessagingSection";
import { ActivitySection } from "@/components/ActivitySection";

export const TwoColumnLayout = ({ leadData, customFields = [], handleCall, handleSendMessage, handleAddNote, messages, notes, newMessage, setNewMessage, newNote, setNewNote, id, onLeadUpdate }: any) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(true);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      {/* Left: Compact Summary and Documents */}
      <div className="space-y-3">
        {/* Action Buttons */}
        <Card className="border sticky top-0 z-20 bg-background">
          <CardContent className="p-3">
            <TwilioCallInterface leadPhone={leadData.phone} leadName={leadData.name} />
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
            {leadData.spouseName && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>{leadData.spouseName}</span>
                <span className="text-muted-foreground">(Spouse Name)</span>
              </div>
            )}
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
                      {leadData.pipeline && (
                        <div>
                          <span className="text-muted-foreground">Lead Pipeline Status:</span> 
                          <span className="ml-1">{leadData.pipeline}</span>
                        </div>
                      )}
                      {/* Custom Fields */}
                      {customFields.map((field: any) => {
                        const value = leadData.customData?.[field.field_name];
                        if (!value) return null;
                        
                        return (
                          <div key={field.id}>
                            <span className="text-muted-foreground">{field.field_label}:</span> 
                            <span className="ml-1">{value}</span>
                          </div>
                        );
                      })}
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
            {leadData.closeDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>Close Date: {leadData.closeDate}</span>
              </div>
            )}
            {leadData.commission && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span>Commission: {leadData.commission}</span>
              </div>
            )}
            {leadData.titleOffice && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span>Title Office: {leadData.titleOffice}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">Property</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 text-xs">
            {leadData.propertyOfInterest && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Property of Interest:</span>
                  <span className="ml-1 leading-tight">{leadData.propertyOfInterest}</span>
                </div>
              </div>
            )}
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

        {/* Documents Section - moved from right */}
        <Card className="border">
          <CardHeader className="p-3 pb-2">
            <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="text-sm font-semibold">Documents</CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${documentsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-3 pt-2">
                  <DocumentsSection leadId={id} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>
      </div>

      {/* Right: Tasks, Messaging, and Activity sections */}
      <div className="space-y-4">
        {/* 1. Tasks Section */}
        <TasksSection leadId={id} />

        {/* 2. Messaging Section */}
        <MessagingSection 
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
        />

        {/* 3. Activity Section (Calls + Notes combined) */}
        <ActivitySection 
          leadId={id}
          notes={notes}
          newNote={newNote}
          setNewNote={setNewNote}
          handleAddNote={handleAddNote}
        />
      </div>

      <EditContactInfoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        leadData={leadData}
        onUpdate={onLeadUpdate}
      />
    </div>
  );
};
