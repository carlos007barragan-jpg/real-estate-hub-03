import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, Plus, Eye } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  is_custom: boolean;
  is_standard: boolean;
  display_order: number;
  options?: string[] | null;
}

interface SortableFieldProps {
  field: FormField;
  onToggleRequired: (id: string, required: boolean) => void;
  onDelete: (id: string) => void;
}

const SortableField = ({ field, onToggleRequired, onDelete }: SortableFieldProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">{field.field_label}</span>
          {field.is_standard && (
            <Badge variant="secondary" className="text-xs">Standard</Badge>
          )}
          {field.is_custom && (
            <Badge variant="outline" className="text-xs">Custom</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="capitalize">{field.field_type}</span>
          {field.options && field.options.length > 0 && (
            <span className="text-xs">• {field.options.length} options</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Required</span>
          <Switch
            checked={field.is_required}
            onCheckedChange={(checked) => onToggleRequired(field.id, checked)}
            disabled={field.is_standard && (field.field_name === 'name' || field.field_name === 'email' || field.field_name === 'phone')}
          />
        </div>

        {field.is_custom && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(field.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

const FormPreview = ({ fields }: { fields: FormField[] }) => {
  return (
    <ScrollArea className="h-[600px] w-full rounded-lg border bg-muted/20 p-6">
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-foreground">Lead Form Preview</h3>
          <p className="text-sm text-muted-foreground">This is how your form will appear</p>
        </div>
        
        {fields
          .sort((a, b) => a.display_order - b.display_order)
          .map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {field.field_label}
                {field.is_required && <span className="text-destructive ml-1">*</span>}
              </label>
              {field.field_type === 'select' ? (
                <div className="w-full p-2 border rounded-md bg-background text-sm text-muted-foreground">
                  Select {field.field_label.toLowerCase()}
                </div>
              ) : field.field_type === 'textarea' ? (
                <div className="w-full p-2 border rounded-md bg-background min-h-[80px] text-sm text-muted-foreground">
                  Enter {field.field_label.toLowerCase()}
                </div>
              ) : (
                <div className="w-full p-2 border rounded-md bg-background text-sm text-muted-foreground">
                  Enter {field.field_label.toLowerCase()}
                </div>
              )}
            </div>
          ))}
      </div>
    </ScrollArea>
  );
};

export const FormFieldsEditor = () => {
  const { toast } = useToast();
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Standard fields that are always present
  const STANDARD_FIELDS: Partial<FormField>[] = [
    { field_name: 'name', field_label: 'Name', field_type: 'text', is_required: true, is_standard: true },
    { field_name: 'email', field_label: 'Email', field_type: 'email', is_required: true, is_standard: true },
    { field_name: 'phone', field_label: 'Phone', field_type: 'tel', is_required: true, is_standard: true },
    { field_name: 'spouse_phone', field_label: 'Spouse Phone', field_type: 'tel', is_required: false, is_standard: true },
    { field_name: 'spouse_email', field_label: 'Spouse Email', field_type: 'email', is_required: false, is_standard: true },
    { field_name: 'current_address', field_label: 'Current Address', field_type: 'text', is_required: false, is_standard: true },
    { field_name: 'area', field_label: 'Area', field_type: 'text', is_required: false, is_standard: true },
    { field_name: 'marital_status', field_label: 'Marital Status', field_type: 'select', is_required: false, is_standard: true },
    { field_name: 'social_status', field_label: 'Social Status', field_type: 'text', is_required: false, is_standard: true },
    { field_name: 'timeframe', field_label: 'Timeframe', field_type: 'text', is_required: false, is_standard: true },
    { field_name: 'language_preference', field_label: 'Language', field_type: 'select', is_required: false, is_standard: true },
    { field_name: 'preferred_contact_method', field_label: 'Preferred Contact', field_type: 'select', is_required: false, is_standard: true },
    { field_name: 'down_payment', field_label: 'Down Payment', field_type: 'text', is_required: false, is_standard: true },
    { field_name: 'financing_type', field_label: 'Financing Type', field_type: 'select', is_required: false, is_standard: true },
    { field_name: 'source', field_label: 'Source', field_type: 'select', is_required: true, is_standard: true },
    { field_name: 'status', field_label: 'Status', field_type: 'select', is_required: false, is_standard: true },
    { field_name: 'value', field_label: 'Estimated Value', field_type: 'text', is_required: false, is_standard: true },
    { field_name: 'assigned_to', field_label: 'Assigned To', field_type: 'select', is_required: false, is_standard: true },
  ];

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data: customFields, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Combine standard and custom fields
      const standardFieldsWithIds: FormField[] = STANDARD_FIELDS.map((field, index) => ({
        id: `standard-${field.field_name}`,
        field_name: field.field_name!,
        field_label: field.field_label!,
        field_type: field.field_type!,
        is_required: field.is_required!,
        is_standard: true,
        is_custom: false,
        display_order: index,
      }));

      const customFieldsFormatted: FormField[] = (customFields || []).map((field, index) => ({
        id: field.id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        is_required: field.is_required,
        is_standard: false,
        is_custom: true,
        display_order: STANDARD_FIELDS.length + index,
        options: field.options,
      }));

      setFields([...standardFieldsWithIds, ...customFieldsFormatted]);
    } catch (error) {
      console.error("Error fetching fields:", error);
      toast({
        title: "Error",
        description: "Failed to load form fields",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);

    const newFields = arrayMove(fields, oldIndex, newIndex).map((field, index) => ({
      ...field,
      display_order: index,
    }));

    setFields(newFields);

    // Update custom fields in database
    try {
      const customFieldsToUpdate = newFields.filter(f => f.is_custom);
      
      for (const field of customFieldsToUpdate) {
        await supabase
          .from("custom_fields")
          .update({ display_order: field.display_order })
          .eq("id", field.id);
      }

      toast({
        title: "Success",
        description: "Field order updated",
      });
    } catch (error) {
      console.error("Error updating field order:", error);
      toast({
        title: "Error",
        description: "Failed to update field order",
        variant: "destructive",
      });
    }
  };

  const handleToggleRequired = async (id: string, required: boolean) => {
    const field = fields.find(f => f.id === id);
    if (!field || !field.is_custom) return;

    try {
      const { error } = await supabase
        .from("custom_fields")
        .update({ is_required: required })
        .eq("id", id);

      if (error) throw error;

      setFields(fields.map(f => 
        f.id === id ? { ...f, is_required: required } : f
      ));

      toast({
        title: "Success",
        description: "Field updated",
      });
    } catch (error) {
      console.error("Error updating field:", error);
      toast({
        title: "Error",
        description: "Failed to update field",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setFields(fields.filter(f => f.id !== id));

      toast({
        title: "Success",
        description: "Field deleted",
      });
    } catch (error) {
      console.error("Error deleting field:", error);
      toast({
        title: "Error",
        description: "Failed to delete field",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Form Fields Editor</CardTitle>
            <CardDescription>
              Drag to reorder fields, toggle required status, or remove custom fields
            </CardDescription>
          </div>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview Form
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Form Preview</DialogTitle>
                <DialogDescription>
                  This is how your lead form will appear to users
                </DialogDescription>
              </DialogHeader>
              <FormPreview fields={fields} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields
                .sort((a, b) => a.display_order - b.display_order)
                .map((field) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    onToggleRequired={handleToggleRequired}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
};
