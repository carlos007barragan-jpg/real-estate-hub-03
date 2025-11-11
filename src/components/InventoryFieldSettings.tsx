import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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

  const handleMoveOption = async (id: string, direction: 'up' | 'down', fieldType: string) => {
    try {
      const fieldOptions = options.filter(opt => opt.field_type === fieldType && opt.is_active)
        .sort((a, b) => a.display_order - b.display_order);
      
      const currentIndex = fieldOptions.findIndex(opt => opt.id === id);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= fieldOptions.length) return;

      const currentOption = fieldOptions[currentIndex];
      const targetOption = fieldOptions[targetIndex];

      // Swap display orders
      const { error: error1 } = await supabase
        .from("inventory_field_options")
        .update({ display_order: targetOption.display_order })
        .eq("id", currentOption.id);

      const { error: error2 } = await supabase
        .from("inventory_field_options")
        .update({ display_order: currentOption.display_order })
        .eq("id", targetOption.id);

      if (error1 || error2) throw error1 || error2;

      fetchOptions();
    } catch (error: any) {
      console.error("Error moving option:", error);
      toast({
        title: "Error",
        description: "Failed to reorder option",
        variant: "destructive",
      });
    }
  };

  const renderFieldOptions = (fieldType: string) => {
    const fieldOptions = options.filter(opt => opt.field_type === fieldType && opt.is_active)
      .sort((a, b) => a.display_order - b.display_order);

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Active Options</Label>
            <Badge variant="secondary">{fieldOptions.length} total</Badge>
          </div>
          <div className="space-y-2">
            {fieldOptions.length === 0 ? (
              <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No options added yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add your first option below</p>
              </div>
            ) : (
              fieldOptions.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleMoveOption(option.id, 'up', fieldType)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleMoveOption(option.id, 'down', fieldType)}
                      disabled={index === fieldOptions.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">{option.option_value}</span>
                  <Badge variant="outline" className="text-xs">
                    Order: {option.display_order}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteOption(option.id, option.option_value)}
                    className="hover:bg-destructive/10"
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
          Customize the dropdown options for categories and property types
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Status Reference */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Badge variant="secondary">System Default</Badge>
            Current Property Statuses
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            These are the fixed status options available in your property filters and forms:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Available</Badge>
            <Badge variant="outline">Pending</Badge>
            <Badge variant="outline">Sold</Badge>
            <Badge variant="outline">Coming Soon</Badge>
            <Badge variant="outline">Under Contract</Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="category">Categories</TabsTrigger>
            <TabsTrigger value="property_type">Property Types</TabsTrigger>
          </TabsList>

          <TabsContent value="category" className="mt-4">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Categories</strong> help you organize properties by transaction type or market segment (e.g., Residential, Commercial, Wholesale, Off-Market).
              </p>
            </div>
            {renderFieldOptions("category")}
          </TabsContent>

          <TabsContent value="property_type" className="mt-4">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Property Types</strong> define the physical characteristics (e.g., Single Family, Multi Family, Condo, Land).
              </p>
            </div>
            {renderFieldOptions("property_type")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
