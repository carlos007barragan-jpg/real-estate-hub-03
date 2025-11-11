import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FieldOption {
  id: string;
  field_type: string;
  option_value: string;
  display_order: number;
  is_active: boolean;
}

export default function InventoryFieldSettings() {
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState("");
  const [activeTab, setActiveTab] = useState("category");
  const { toast } = useToast();

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("inventory_field_options")
        .select("*")
        .eq("user_id", user.id)
        .order("field_type")
        .order("display_order");

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error("Error fetching options:", error);
      toast({
        title: "Error",
        description: "Failed to fetch field options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = async (fieldType: string) => {
    if (!newValue.trim()) {
      toast({
        title: "Validation Error",
        description: "Option value cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const existingOptions = options.filter(opt => opt.field_type === fieldType);
      const maxOrder = existingOptions.length > 0 
        ? Math.max(...existingOptions.map(opt => opt.display_order))
        : 0;

      const { error } = await supabase
        .from("inventory_field_options")
        .insert({
          user_id: user.id,
          field_type: fieldType,
          option_value: newValue.trim(),
          display_order: maxOrder + 1,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Option added successfully",
      });

      setNewValue("");
      fetchOptions();
    } catch (error: any) {
      console.error("Error adding option:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add option",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOption = async (id: string, value: string) => {
    if (!confirm(`Are you sure you want to delete "${value}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("inventory_field_options")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Option deleted successfully",
      });

      fetchOptions();
    } catch (error: any) {
      console.error("Error deleting option:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete option",
        variant: "destructive",
      });
    }
  };

  const renderFieldOptions = (fieldType: string) => {
    const fieldOptions = options.filter(opt => opt.field_type === fieldType && opt.is_active);

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Options</Label>
          <div className="space-y-2">
            {fieldOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No options added yet</p>
            ) : (
              fieldOptions.map(option => (
                <div key={option.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{option.option_value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteOption(option.id, option.option_value)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Add New Option</Label>
          <div className="flex gap-2">
            <Input
              placeholder={`Enter new ${fieldType.replace('_', ' ')} option...`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddOption(fieldType);
                }
              }}
            />
            <Button onClick={() => handleAddOption(fieldType)}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Field Settings</CardTitle>
        <CardDescription>
          Customize the dropdown options for categories, statuses, and property types
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="category">Categories</TabsTrigger>
            <TabsTrigger value="status">Statuses</TabsTrigger>
            <TabsTrigger value="property_type">Property Types</TabsTrigger>
          </TabsList>

          <TabsContent value="category" className="mt-4">
            {renderFieldOptions("category")}
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            {renderFieldOptions("status")}
          </TabsContent>

          <TabsContent value="property_type" className="mt-4">
            {renderFieldOptions("property_type")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
