import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { nameSchema, emailSchema, phoneSchema } from "@/lib/validation";

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  display_order: number;
}

interface CreateLeadDialogProps {
  onLeadCreated: () => void;
}

export const CreateLeadDialog = ({ onLeadCreated }: CreateLeadDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    spouse_phone: "",
    spouse_email: "",
    timeframe: "",
    source: "",
    value: "",
    status: "new",
    assigned_to: "",
    down_payment: "",
    financing_type: "",
    area: "",
    marital_status: "",
    current_address: "",
    lead_temperature: "",
    language_preference: "English",
    preferred_contact_method: "phone",
    social_status: "",
    marketing_category: "",
  });

  useEffect(() => {
    if (open) {
      fetchCustomFields();
    }
  }, [open]);

  const fetchCustomFields = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.field_name] || "";

    switch (field.field_type) {
      case "textarea":
        return (
          <Textarea
            id={field.field_name}
            value={value}
            onChange={(e) => setCustomFieldValues({
              ...customFieldValues,
              [field.field_name]: e.target.value
            })}
            placeholder={field.field_label}
            required={field.is_required}
          />
        );
      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => setCustomFieldValues({
              ...customFieldValues,
              [field.field_name]: val
            })}
            required={field.is_required}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.field_label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "date":
        return (
          <Input
            id={field.field_name}
            type="date"
            value={value}
            onChange={(e) => setCustomFieldValues({
              ...customFieldValues,
              [field.field_name]: e.target.value
            })}
            required={field.is_required}
          />
        );
      default:
        return (
          <Input
            id={field.field_name}
            type={field.field_type}
            value={value}
            onChange={(e) => setCustomFieldValues({
              ...customFieldValues,
              [field.field_name]: e.target.value
            })}
            placeholder={field.field_label}
            required={field.is_required}
          />
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    try {
      nameSchema.parse(formData.name);
      emailSchema.parse(formData.email);
      phoneSchema.parse(formData.phone);
      
      if (formData.spouse_email) {
        emailSchema.parse(formData.spouse_email);
      }
      if (formData.spouse_phone) {
        phoneSchema.parse(formData.spouse_phone);
      }
    } catch (error: any) {
      toast({
        title: "Validation error",
        description: error.errors?.[0]?.message || "Please check your inputs",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("leads").insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        spouse_phone: formData.spouse_phone || null,
        spouse_email: formData.spouse_email || null,
        timeframe: formData.timeframe || null,
        source: formData.source,
        value: formData.value,
        status: formData.status,
        assigned_to: formData.assigned_to || null,
        pipeline_stage: "New Lead",
        lead_lifecycle: "Contact",
        down_payment: formData.down_payment || null,
        financing_type: formData.financing_type || null,
        area: formData.area || null,
        marital_status: formData.marital_status || null,
        current_address: formData.current_address || null,
        lead_temperature: formData.lead_temperature || null,
        language_preference: formData.language_preference,
        preferred_contact_method: formData.preferred_contact_method,
        social_status: formData.social_status || null,
        custom_data: {
          ...customFieldValues,
          marketing_category: formData.marketing_category || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Lead created!",
        description: `${formData.name} has been added to your leads.`,
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        spouse_phone: "",
        spouse_email: "",
        timeframe: "",
        source: "",
        value: "",
        status: "new",
        assigned_to: "",
        down_payment: "",
        financing_type: "",
        area: "",
        marital_status: "",
        current_address: "",
        lead_temperature: "",
        language_preference: "English",
        preferred_contact_method: "phone",
        social_status: "",
        marketing_category: "",
      });
      setCustomFieldValues({});
      setOpen(false);
      onLeadCreated();
    } catch (error: any) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
          <DialogDescription>
            Add a new lead to your CRM. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spouse_phone">Spouse Phone</Label>
              <Input
                id="spouse_phone"
                type="tel"
                value={formData.spouse_phone}
                onChange={(e) => setFormData({ ...formData, spouse_phone: e.target.value })}
                placeholder="(555) 987-6543"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spouse_email">Spouse Email</Label>
              <Input
                id="spouse_email"
                type="email"
                value={formData.spouse_email}
                onChange={(e) => setFormData({ ...formData, spouse_email: e.target.value })}
                placeholder="spouse@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_address">Current Address</Label>
            <Input
              id="current_address"
              value={formData.current_address}
              onChange={(e) => setFormData({ ...formData, current_address: e.target.value })}
              placeholder="123 Main St, City, State, ZIP"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="Downtown"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marital_status">Marital Status</Label>
              <Select
                value={formData.marital_status}
                onValueChange={(value) => setFormData({ ...formData, marital_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
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
              <Label htmlFor="social_status">Social Status</Label>
              <Input
                id="social_status"
                value={formData.social_status}
                onChange={(e) => setFormData({ ...formData, social_status: e.target.value })}
                placeholder="e.g., Professional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead_temperature">Transaction Type</Label>
              <Select
                value={formData.lead_temperature}
                onValueChange={(value) => setFormData({ ...formData, lead_temperature: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                  <SelectItem value="Funding">Funding</SelectItem>
                  <SelectItem value="Listing">Listing</SelectItem>
                  <SelectItem value="Buyer's">Buyer's</SelectItem>
                  <SelectItem value="Investor's">Investor's</SelectItem>
                  <SelectItem value="Rental">Rental</SelectItem>
                  <SelectItem value="Multifamily">Multifamily</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Input
                id="timeframe"
                value={formData.timeframe}
                onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                placeholder="e.g., 3-6 months"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language_preference">Language</Label>
              <Select
                value={formData.language_preference}
                onValueChange={(value) => setFormData({ ...formData, language_preference: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_contact_method">Preferred Contact</Label>
              <Select
                value={formData.preferred_contact_method}
                onValueChange={(value) => setFormData({ ...formData, preferred_contact_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="down_payment">Down Payment</Label>
              <Input
                id="down_payment"
                value={formData.down_payment}
                onChange={(e) => setFormData({ ...formData, down_payment: e.target.value })}
                placeholder="$50,000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="financing_type">Financing Type</Label>
              <Select
                value={formData.financing_type}
                onValueChange={(value) => setFormData({ ...formData, financing_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="fha">FHA</SelectItem>
                  <SelectItem value="va">VA</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Open House">Open House</SelectItem>
                  <SelectItem value="Social Media">Social Media</SelectItem>
                  <SelectItem value="Cold Call">Cold Call</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Estimated Value</Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="$450,000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Input
              id="assigned_to"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              placeholder="Agent name"
            />
          </div>

          {/* Marketing Agent Category Section */}
          <div className="pt-4 border-t space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Only for Marketing Agents</h3>
              <p className="text-xs text-muted-foreground">Optional - Used for lead categorization</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing_category">Marketing Category</Label>
              <Select
                value={formData.marketing_category}
                onValueChange={(value) => setFormData({ ...formData, marketing_category: value })}
              >
                <SelectTrigger className="bg-popover">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="new-leads">New Leads</SelectItem>
                  <SelectItem value="any-leads">Any Leads</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="buyers">Buyers</SelectItem>
                  <SelectItem value="investors">Investors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Fields Section */}
          {customFields.length > 0 && (
            <div className="pt-4 border-t space-y-4">
              <h3 className="font-semibold text-foreground">Additional Information</h3>
              {customFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.field_name}>
                    {field.field_label} {field.is_required && "*"}
                  </Label>
                  {renderCustomField(field)}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
