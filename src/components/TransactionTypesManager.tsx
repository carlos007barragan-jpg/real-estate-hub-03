import { useState, useEffect } from "react";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TransactionType {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_TYPES = [
  "Unassigned",
  "Funding",
  "Listing",
  "Buyer's",
  "Investor's",
  "Rental",
  "Multifamily",
  "Wholesale",
  "Commercial"
];

const SortableRow = ({ type, onEdit, onToggle, onDelete }: { 
  type: TransactionType;
  onEdit: (type: TransactionType) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: type.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2">
          <GripVertical
            {...attributes}
            {...listeners}
            className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing"
          />
          <span className="font-medium">{type.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={type.is_active}
          onCheckedChange={(checked) => onToggle(type.id, checked)}
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(type)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(type.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const TransactionTypesManager = () => {
  const { toast } = useToast();
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<TransactionType | null>(null);
  const [typeName, setTypeName] = useState("");

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
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
        .from("transaction_types")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // If no types exist, create default ones
      if (!data || data.length === 0) {
        await initializeDefaultTypes(user.id, profile.organization_id);
        await fetchTypes(); // Fetch again after initialization
        return;
      }

      setTypes(data);
    } catch (error: any) {
      console.error("Error fetching transaction types:", error);
      toast({
        title: "Error",
        description: "Failed to load transaction types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultTypes = async (userId: string, organizationId: string) => {
    try {
      const defaultTypes = DEFAULT_TYPES.map((name, index) => ({
        user_id: userId,
        organization_id: organizationId,
        name,
        display_order: index,
        is_active: true,
      }));

      const { error } = await supabase
        .from("transaction_types")
        .insert(defaultTypes);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error initializing default types:", error);
    }
  };

  const handleSave = async () => {
    if (!typeName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a type name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingType) {
        // Update existing type
        const { error } = await supabase
          .from("transaction_types")
          .update({ name: typeName })
          .eq("id", editingType.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Transaction type updated",
        });
      } else {
        // Create new type
        // Get user's organization
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (!profile?.organization_id) {
          throw new Error("Organization not found");
        }

        const maxOrder = Math.max(...types.map(t => t.display_order), -1);
        const { error } = await supabase
          .from("transaction_types")
          .insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            name: typeName,
            display_order: maxOrder + 1,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Transaction type created",
        });
      }

      setDialogOpen(false);
      setTypeName("");
      setEditingType(null);
      fetchTypes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("transaction_types")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      setTypes(types.map(t => t.id === id ? { ...t, is_active: isActive } : t));

      toast({
        title: "Success",
        description: `Transaction type ${isActive ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction type?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("transaction_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction type deleted",
      });

      fetchTypes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (type: TransactionType) => {
    setEditingType(type);
    setTypeName(type.name);
    setDialogOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = types.findIndex((t) => t.id === active.id);
    const newIndex = types.findIndex((t) => t.id === over.id);

    const newTypes = arrayMove(types, oldIndex, newIndex).map((type, index) => ({
      ...type,
      display_order: index,
    }));

    setTypes(newTypes);

    try {
      // Update all display orders in the database
      const updates = newTypes.map((type) =>
        supabase
          .from("transaction_types")
          .update({ display_order: type.display_order })
          .eq("id", type.id)
      );

      await Promise.all(updates);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
      fetchTypes(); // Revert on error
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Transaction Types</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage lead transaction categories
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingType(null);
            setTypeName("");
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Edit Transaction Type" : "Add Transaction Type"}
              </DialogTitle>
              <DialogDescription>
                {editingType ? "Update the transaction type name" : "Create a new transaction type category"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="typeName">Type Name</Label>
                <Input
                  id="typeName"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="e.g., Land Deal"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingType ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type Name</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={types.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {types.map((type) => (
                  <SortableRow
                    key={type.id}
                    type={type}
                    onEdit={handleEdit}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Drag and drop to reorder. Inactive types won't appear in the lead form or filters.
        </p>
      </div>
    </Card>
  );
};
