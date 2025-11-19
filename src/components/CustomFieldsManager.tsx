import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  display_order: number;
}

export const CustomFieldsManager = () => {
  const { toast } = useToast();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [newField, setNewField] = useState({
    field_name: "",
    field_label: "",
    field_type: "text",
    options: "",
    is_required: false,
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
      toast({
        title: "Error",
        description: "Failed to load custom fields",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!newField.field_name || !newField.field_label) {
      toast({
        title: "Validation Error",
        description: "Field name and label are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error("Organization not found");
      }

      const options = newField.field_type === "select" && newField.options
        ? newField.options.split(",").map(opt => opt.trim())
        : null;

      const { error } = await supabase.from("custom_fields").insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        field_name: newField.field_name,
        field_label: newField.field_label,
        field_type: newField.field_type,
        options,
        is_required: newField.is_required,
        display_order: fields.length,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom field added successfully",
      });

      setNewField({
        field_name: "",
        field_label: "",
        field_type: "text",
        options: "",
        is_required: false,
      });

      fetchFields();
    } catch (error: any) {
      console.error("Error adding field:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add custom field",
        variant: "destructive",
      });
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom field deleted successfully",
      });

      fetchFields();
    } catch (error) {
      console.error("Error deleting field:", error);
      toast({
        title: "Error",
        description: "Failed to delete custom field",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Lead Fields</CardTitle>
        <CardDescription>
          Add custom fields to collect additional information when creating leads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Fields */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Current Fields</Label>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom fields yet. Add one below.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{field.field_label}</div>
                    <div className="text-sm text-muted-foreground">
                      Type: {field.field_type} {field.is_required && "(Required)"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Field */}
        <div className="space-y-4 p-4 border rounded-lg">
          <Label className="text-base font-semibold">Add New Field</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="field_name">Field Name (Internal)</Label>
              <Input
                id="field_name"
                placeholder="e.g., custom_budget"
                value={newField.field_name}
                onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field_label">Field Label (Display)</Label>
              <Input
                id="field_label"
                placeholder="e.g., Budget Range"
                value={newField.field_label}
                onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field_type">Field Type</Label>
            <Select
              value={newField.field_type}
              onValueChange={(value) => setNewField({ ...newField, field_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="select">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newField.field_type === "select" && (
            <div className="space-y-2">
              <Label htmlFor="options">Options (comma-separated)</Label>
              <Input
                id="options"
                placeholder="e.g., Low, Medium, High"
                value={newField.options}
                onChange={(e) => setNewField({ ...newField, options: e.target.value })}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="is_required"
              checked={newField.is_required}
              onCheckedChange={(checked) => setNewField({ ...newField, is_required: checked })}
            />
            <Label htmlFor="is_required">Required Field</Label>
          </div>

          <Button onClick={handleAddField} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
