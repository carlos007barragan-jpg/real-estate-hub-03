import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { GripVertical, Trash2, Settings2 } from "lucide-react";
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
      className="relative group"
    >
      {/* Drag handle and controls overlay */}
      <div className="absolute -left-8 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 bg-card border rounded shadow-sm"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="absolute -right-2 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 bg-card border rounded shadow-sm p-1">
          <span className="text-[10px] text-muted-foreground">Req</span>
          <Switch
            checked={field.is_required}
            onCheckedChange={(checked) => onToggleRequired(field.id, checked)}
            disabled={field.is_standard && (field.field_name === 'name' || field.field_name === 'email' || field.field_name === 'phone' || field.field_name === 'source')}
            className="scale-75"
          />
        </div>
        {field.is_custom && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(field.id)}
            className="text-destructive hover:text-destructive h-7 w-7 p-0 bg-card border shadow-sm"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Actual form field as it appears to users */}
      <div className="space-y-2 p-3 border rounded-lg bg-background group-hover:border-primary/50 transition-colors">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            {field.field_label}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {field.is_standard && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">Std</Badge>
          )}
          {field.is_custom && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">Custom</Badge>
          )}
        </div>
        {field.field_type === 'select' ? (
          <Select disabled>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={`Select ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
          </Select>
        ) : field.field_type === 'textarea' ? (
          <textarea
            disabled
            className="w-full min-h-[80px] p-2 border rounded-md bg-background resize-none text-sm"
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
          />
        ) : (
          <Input
            type={field.field_type}
            disabled
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
            className="bg-background"
          />
        )}
      </div>
    </div>
  );
};

export const FormFieldsEditor = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchFields();
    }
  }, [open]);

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
    if (open) {
      fetchFields();
    }
  }, [open]);

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
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Edit Form Layout
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Edit Form Layout
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[1400px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Lead Form</DialogTitle>
          <DialogDescription>
            Drag fields to reorder, toggle required status, or delete custom fields. See changes in real-time on the right.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-8" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="bg-muted/20 rounded-lg border p-6">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Hover over fields to drag, reorder, toggle required status, or delete custom fields
              </p>
            </div>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
