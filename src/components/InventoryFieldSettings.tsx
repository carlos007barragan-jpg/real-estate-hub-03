import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
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

  const handleHideSystemDefault = async (fieldType: string, value: string) => {
    if (!confirm(`Hide "${value}" from your dropdowns?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Add as inactive option to hide it
      const { error } = await supabase
        .from("inventory_field_options")
        .insert({
          user_id: user.id,
          field_type: fieldType,
          option_value: value,
          display_order: 0,
          is_active: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `"${value}" hidden from dropdowns`,
      });

      fetchOptions();
    } catch (error: any) {
      console.error("Error hiding option:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to hide option",
        variant: "destructive",
      });
    }
  };

  const handleRestoreSystemDefault = async (id: string, value: string) => {
    try {
      const { error } = await supabase
        .from("inventory_field_options")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `"${value}" restored to dropdowns`,
      });

      fetchOptions();
    } catch (error: any) {
      console.error("Error restoring option:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to restore option",
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
    const systemDefaults = fieldType === "category" 
      ? ["Residential", "Commercial", "Wholesale", "Off-Market", "Luxury", "Multifamily"]
      : ["Single Family", "Multi Family", "Condo", "Townhouse", "Land", "Commercial"];
    
    const fieldOptions = options.filter(opt => opt.field_type === fieldType && opt.is_active)
      .sort((a, b) => a.display_order - b.display_order);
    
    const hiddenDefaults = options.filter(opt => opt.field_type === fieldType && !opt.is_active);

    return (
      <div className="space-y-4">
        {/* System Defaults */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">System Defaults</Label>
          <div className="space-y-2">
            {systemDefaults.map(defaultValue => {
              const isHidden = hiddenDefaults.some(opt => opt.option_value === defaultValue);
              const hiddenOption = hiddenDefaults.find(opt => opt.option_value === defaultValue);
              
              return (
                <div key={defaultValue} className={`flex items-center gap-3 p-3 border rounded-lg group hover:border-primary/50 transition-colors ${isHidden ? 'bg-muted/50 opacity-60' : 'bg-card'}`}>
                  <Badge variant="outline" className="text-xs shrink-0">System</Badge>
                  <span className="text-sm font-medium flex-1">{defaultValue}</span>
                  {isHidden ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => hiddenOption && handleRestoreSystemDefault(hiddenOption.id, defaultValue)}
                      className="text-xs"
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleHideSystemDefault(fieldType, defaultValue)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Your Custom Options</Label>
          {fieldOptions.length === 0 ? (
            <div className="text-center py-6 px-4 border-2 border-dashed rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">No custom options yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first option below</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fieldOptions.map((option, index) => (
                <div key={option.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg group hover:border-primary/50 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleMoveOption(option.id, 'up', fieldType)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleMoveOption(option.id, 'down', fieldType)}
                      disabled={index === fieldOptions.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-medium flex-1">{option.option_value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteOption(option.id, option.option_value)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Option */}
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Add New {fieldType === 'category' ? 'Category' : 'Property Type'}</Label>
          <div className="flex gap-2">
            <Input
              placeholder={`Enter ${fieldType === 'category' ? 'category' : 'property type'} name...`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddOption(fieldType);
                }
              }}
            />
            <Button onClick={() => handleAddOption(fieldType)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const getCustomOptions = (fieldType: string) => {
    return options
      .filter(opt => opt.field_type === fieldType && opt.is_active)
      .map(opt => opt.option_value);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Property Fields</CardTitle>
        <CardDescription>
          Manage your custom categories and property types. These will appear in the property form dropdowns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Property Categories</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Organize properties by transaction type (Residential, Commercial, Wholesale, etc.)
              </p>
            </div>
            <Badge variant="secondary" className="h-fit">
              {getCustomOptions("category").length} custom
            </Badge>
          </div>

          {/* System Defaults Reference */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground mb-2">System Defaults:</p>
            <div className="flex flex-wrap gap-2">
              {["Residential", "Commercial", "Wholesale", "Off-Market", "Luxury", "Multifamily"].map(cat => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {renderFieldOptions("category")}
        </div>

        <div className="border-t pt-6" />

        {/* Property Types Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Property Types</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Define physical property characteristics (Single Family, Condo, Land, etc.)
              </p>
            </div>
            <Badge variant="secondary" className="h-fit">
              {getCustomOptions("property_type").length} custom
            </Badge>
          </div>

          {/* System Defaults Reference */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground mb-2">System Defaults:</p>
            <div className="flex flex-wrap gap-2">
              {["Single Family", "Multi Family", "Condo", "Townhouse", "Land", "Commercial"].map(type => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {renderFieldOptions("property_type")}
        </div>
      </CardContent>
    </Card>
  );
}
