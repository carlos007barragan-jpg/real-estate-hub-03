import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Eye, EyeOff, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FieldOption {
  id: string;
  category_value?: string;
  subcategory_value?: string;
  display_order: number;
  is_active: boolean;
}

export const ContactFieldsManager = () => {
  const [categories, setCategories] = useState<FieldOption[]>([]);
  const [subcategories, setSubcategories] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [newSubcategoryValue, setNewSubcategoryValue] = useState("");

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [categoriesData, subcategoriesData] = await Promise.all([
        supabase
          .from('contact_category_options')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order'),
        supabase
          .from('vendor_subcategory_options')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order')
      ]);

      if (categoriesData.data) setCategories(categoriesData.data);
      if (subcategoriesData.data) setSubcategories(subcategoriesData.data);
    } catch (error) {
      console.error('Error fetching options:', error);
      toast.error('Failed to load contact field options');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryValue.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.display_order)) 
        : 0;

      const { error } = await supabase
        .from('contact_category_options')
        .insert({
          user_id: user.id,
          organization_id: orgData?.organization_id,
          category_value: newCategoryValue.trim(),
          display_order: maxOrder + 1,
          is_active: true
        });

      if (error) throw error;

      toast.success('Category added successfully');
      setNewCategoryValue("");
      fetchOptions();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategoryValue.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      const maxOrder = subcategories.length > 0 
        ? Math.max(...subcategories.map(s => s.display_order)) 
        : 0;

      const { error } = await supabase
        .from('vendor_subcategory_options')
        .insert({
          user_id: user.id,
          organization_id: orgData?.organization_id,
          subcategory_value: newSubcategoryValue.trim(),
          display_order: maxOrder + 1,
          is_active: true
        });

      if (error) throw error;

      toast.success('Vendor type added successfully');
      setNewSubcategoryValue("");
      fetchOptions();
    } catch (error) {
      console.error('Error adding vendor type:', error);
      toast.error('Failed to add vendor type');
    }
  };

  const handleDeleteOption = async (id: string, table: string, value: string) => {
    if (!confirm(`Are you sure you want to delete "${value}"?`)) return;

    try {
      let error;
      if (table === 'contact_category_options') {
        const result = await supabase
          .from('contact_category_options')
          .delete()
          .eq('id', id);
        error = result.error;
      } else {
        const result = await supabase
          .from('vendor_subcategory_options')
          .delete()
          .eq('id', id);
        error = result.error;
      }

      if (error) throw error;

      toast.success('Deleted successfully');
      fetchOptions();
    } catch (error) {
      console.error('Error deleting option:', error);
      toast.error('Failed to delete option');
    }
  };

  const handleToggleActive = async (id: string, table: string, currentActive: boolean) => {
    try {
      let error;
      if (table === 'contact_category_options') {
        const result = await supabase
          .from('contact_category_options')
          .update({ is_active: !currentActive })
          .eq('id', id);
        error = result.error;
      } else {
        const result = await supabase
          .from('vendor_subcategory_options')
          .update({ is_active: !currentActive })
          .eq('id', id);
        error = result.error;
      }

      if (error) throw error;

      toast.success(currentActive ? 'Hidden successfully' : 'Restored successfully');
      fetchOptions();
    } catch (error) {
      console.error('Error toggling option:', error);
      toast.error('Failed to update option');
    }
  };

  const handleMoveOption = async (id: string, direction: 'up' | 'down', table: string, options: FieldOption[]) => {
    const currentIndex = options.findIndex(o => o.id === id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const current = options[currentIndex];
    const target = options[targetIndex];

    try {
      if (table === 'contact_category_options') {
        await Promise.all([
          supabase.from('contact_category_options').update({ display_order: target.display_order }).eq('id', current.id),
          supabase.from('contact_category_options').update({ display_order: current.display_order }).eq('id', target.id)
        ]);
      } else {
        await Promise.all([
          supabase.from('vendor_subcategory_options').update({ display_order: target.display_order }).eq('id', current.id),
          supabase.from('vendor_subcategory_options').update({ display_order: current.display_order }).eq('id', target.id)
        ]);
      }

      fetchOptions();
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to reorder option');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg border">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">
              About Contact Field Customization
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Define custom contact categories and vendor types for your team</li>
              <li>• All team members will see these same options when creating contacts</li>
            </ul>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Categories</CardTitle>
          <CardDescription>
            Manage your contact categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map((category, index) => (
            <div key={category.id} className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="flex-1">
                <span className={!category.is_active ? "text-muted-foreground line-through" : ""}>
                  {category.category_value}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveOption(category.id, 'up', 'contact_category_options', categories)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveOption(category.id, 'down', 'contact_category_options', categories)}
                  disabled={index === categories.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleActive(category.id, 'contact_category_options', category.is_active)}
                >
                  {category.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteOption(category.id, 'contact_category_options', category.category_value || '')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newCategoryValue}
              onChange={(e) => setNewCategoryValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button onClick={handleAddCategory} disabled={!newCategoryValue.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Types</CardTitle>
          <CardDescription>
            Manage your vendor subcategories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subcategories.map((subcategory, index) => (
            <div key={subcategory.id} className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="flex-1">
                <span className={!subcategory.is_active ? "text-muted-foreground line-through" : ""}>
                  {subcategory.subcategory_value}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveOption(subcategory.id, 'up', 'vendor_subcategory_options', subcategories)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveOption(subcategory.id, 'down', 'vendor_subcategory_options', subcategories)}
                  disabled={index === subcategories.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleActive(subcategory.id, 'vendor_subcategory_options', subcategory.is_active)}
                >
                  {subcategory.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteOption(subcategory.id, 'vendor_subcategory_options', subcategory.subcategory_value || '')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <div className="flex gap-2">
            <Input
              placeholder="New vendor type name"
              value={newSubcategoryValue}
              onChange={(e) => setNewSubcategoryValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory()}
            />
            <Button onClick={handleAddSubcategory} disabled={!newSubcategoryValue.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
