import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditContactInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadData: any;
  onUpdate: () => void;
}

export const EditContactInfoDialog = ({
  open,
  onOpenChange,
  leadData,
  onUpdate,
}: EditContactInfoDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: leadData.name || "",
    email: leadData.email || "",
    phone: leadData.phone || "",
    spouseEmail: leadData.spouseEmail || "",
    spousePhone: leadData.spousePhone || "",
    spouseName: leadData.spouseName || "",
    maritalStatus: leadData.maritalStatus || "",
    socialStatus: leadData.socialStatus || "",
    preferredContactMethod: leadData.preferredContactMethod || "",
    languagePreference: leadData.languagePreference || "",
    area: leadData.area || "",
    currentAddress: leadData.currentAddress || "",
    assignedTo: leadData.assignedTo || "",
    timeframe: leadData.timeframe || "",
    closeDate: leadData.closeDate || "",
    commission: leadData.commission || "",
    propertyOfInterest: leadData.propertyOfInterest || "",
    titleOffice: leadData.titleOffice || "",
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          spouse_email: formData.spouseEmail || null,
          spouse_phone: formData.spousePhone || null,
          spouse_name: formData.spouseName || null,
          marital_status: formData.maritalStatus || null,
          social_status: formData.socialStatus || null,
          preferred_contact_method: formData.preferredContactMethod || null,
          language_preference: formData.languagePreference || null,
          area: formData.area || null,
          current_address: formData.currentAddress || null,
          assigned_to: formData.assignedTo || null,
          timeframe: formData.timeframe || null,
          close_date: formData.closeDate || null,
          commission: formData.commission || null,
          property_of_interest: formData.propertyOfInterest || null,
          title_office: formData.titleOffice || null,
          is_inbound_call: leadData.isInboundCall || leadData.is_inbound_call || false,
        })
        .eq("id", leadData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact information updated successfully",
      });
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spouseEmail">Spouse Email</Label>
              <Input
                id="spouseEmail"
                type="email"
                value={formData.spouseEmail}
                onChange={(e) =>
                  setFormData({ ...formData, spouseEmail: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spousePhone">Spouse Phone</Label>
              <Input
                id="spousePhone"
                value={formData.spousePhone}
                onChange={(e) =>
                  setFormData({ ...formData, spousePhone: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spouseName">Spouse Name</Label>
            <Input
              id="spouseName"
              value={formData.spouseName}
              onChange={(e) =>
                setFormData({ ...formData, spouseName: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select
                value={formData.maritalStatus}
                onValueChange={(value) =>
                  setFormData({ ...formData, maritalStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialStatus">Social Security Status</Label>
              <Input
                id="socialStatus"
                value={formData.socialStatus}
                onChange={(e) =>
                  setFormData({ ...formData, socialStatus: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
              <Select
                value={formData.preferredContactMethod}
                onValueChange={(value) =>
                  setFormData({ ...formData, preferredContactMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="languagePreference">Language</Label>
              <Input
                id="languagePreference"
                value={formData.languagePreference}
                onChange={(e) =>
                  setFormData({ ...formData, languagePreference: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) =>
                  setFormData({ ...formData, area: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Input
                id="timeframe"
                value={formData.timeframe}
                onChange={(e) =>
                  setFormData({ ...formData, timeframe: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentAddress">Current Address</Label>
            <Input
              id="currentAddress"
              value={formData.currentAddress}
              onChange={(e) =>
                setFormData({ ...formData, currentAddress: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Input
              id="assignedTo"
              value={formData.assignedTo}
              onChange={(e) =>
                setFormData({ ...formData, assignedTo: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closeDate">Close Date</Label>
              <Input
                id="closeDate"
                type="date"
                value={formData.closeDate}
                onChange={(e) =>
                  setFormData({ ...formData, closeDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Commission</Label>
              <Input
                id="commission"
                value={formData.commission}
                onChange={(e) =>
                  setFormData({ ...formData, commission: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyOfInterest">Property of Interest</Label>
            <Input
              id="propertyOfInterest"
              value={formData.propertyOfInterest}
              onChange={(e) =>
                setFormData({ ...formData, propertyOfInterest: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="titleOffice">Title Office</Label>
            <Input
              id="titleOffice"
              value={formData.titleOffice}
              onChange={(e) =>
                setFormData({ ...formData, titleOffice: e.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
