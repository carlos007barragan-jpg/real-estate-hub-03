import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type ContactCategory = "client" | "lead" | "vendor" | "partner" | "other";
type VendorSubcategory = "title_company" | "inspector" | "contractor" | "photographer" | "stager" | "attorney" | "lender" | "insurance" | "other";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  company: z.string().trim().max(100, "Company must be less than 100 characters").optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
  category: z.enum(["client", "lead", "vendor", "partner", "other"]),
});

const categoryLabels: Record<ContactCategory, string> = {
  "client": "Client",
  "lead": "Lead",
  "vendor": "Vendor",
  "partner": "Partner",
  "other": "Other",
};

const vendorSubcategoryLabels: Record<VendorSubcategory, string> = {
  "title_company": "Title Company",
  "inspector": "Inspector",
  "contractor": "Contractor",
  "photographer": "Photographer",
  "stager": "Stager",
  "attorney": "Attorney",
  "lender": "Lender",
  "insurance": "Insurance",
  "other": "Other",
};

interface CreateContactDialogProps {
  trigger?: React.ReactNode;
}

export const CreateContactDialog = ({ trigger }: CreateContactDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    category: "client" as ContactCategory,
    vendor_subcategory: null as VendorSubcategory | null,
  });

  // Fetch custom categories
  const { data: customCategories = [] } = useQuery({
    queryKey: ['contact-category-options'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contact_category_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch custom vendor types
  const { data: customVendorTypes = [] } = useQuery({
    queryKey: ['vendor-subcategory-options'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('vendor_subcategory_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Build category options (default + custom)
  const availableCategories = [
    ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
    ...customCategories.map(cat => ({ value: cat.category_value, label: cat.category_value }))
  ];

  // Build vendor type options (default + custom)
  const availableVendorTypes = [
    ...Object.entries(vendorSubcategoryLabels).map(([value, label]) => ({ value, label })),
    ...customVendorTypes.map(vendor => ({ value: vendor.subcategory_value, label: vendor.subcategory_value }))
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = contactSchema.parse(formData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare contact data
      const contactData: any = {
        user_id: user.id,
        name: validatedData.name,
        category: validatedData.category,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        company: validatedData.company || null,
        notes: validatedData.notes || null,
        vendor_subcategory: formData.category === "vendor" ? formData.vendor_subcategory : null,
      };

      const { error } = await supabase
        .from("contacts")
        .insert(contactData);

      if (error) throw error;

      toast({
        title: "Contact Created",
        description: `${validatedData.name} has been added to your contacts`,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        notes: "",
        category: "client",
        vendor_subcategory: null,
      });
      setOpen(false);
      
      // Refresh contacts list
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create contact",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-primary hover:bg-primary/90">
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Add New Contact</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Create a new contact in your book of business
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                maxLength={255}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Acme Corp"
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  category: value as ContactCategory,
                  vendor_subcategory: value !== "vendor" ? null : formData.vendor_subcategory
                })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {availableCategories.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.category === "vendor" && (
              <div className="space-y-2">
                <Label htmlFor="vendor_subcategory">Vendor Type</Label>
                <Select
                  value={formData.vendor_subcategory || ""}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    vendor_subcategory: value as VendorSubcategory 
                  })}
                >
                  <SelectTrigger id="vendor_subcategory">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {availableVendorTypes.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional information..."
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
