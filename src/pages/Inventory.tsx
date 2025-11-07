import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, RefreshCw, Trash2, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number | null;
  category: string | null;
  sku: string | null;
  photo_url: string | null;
  google_sheet_row_id: string | null;
  payment: number | null;
  interest_rate: number | null;
  market_status: string | null;
  transaction_type: string | null;
  finance_type: string | null;
  is_wholesale: boolean;
  created_at: string;
  updated_at: string;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 0,
    price: 0,
    category: "",
    sku: "",
    payment: 0,
    interest_rate: 0,
    market_status: "",
    transaction_type: "",
    finance_type: "",
    is_wholesale: false,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchInventory();
    loadGoogleSheetUrl();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory'
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadGoogleSheetUrl = () => {
    const savedUrl = localStorage.getItem("googleSheetUrl");
    if (savedUrl) {
      setGoogleSheetUrl(savedUrl);
    }
  };

  const saveGoogleSheetUrl = () => {
    localStorage.setItem("googleSheetUrl", googleSheetUrl);
    toast({
      title: "Google Sheet URL saved",
      description: "You can now sync inventory from this sheet",
    });
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (file: File, itemId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${itemId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("inventory-photos")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("inventory-photos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let photoUrl = editingItem?.photo_url || null;

      if (editingItem) {
        // Update existing item
        if (photoFile) {
          photoUrl = await uploadPhoto(photoFile, editingItem.id);
        }

        const { error } = await supabase
          .from("inventory")
          .update({
            ...formData,
            photo_url: photoUrl,
          })
          .eq("id", editingItem.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Inventory item updated successfully",
        });
      } else {
        // Create new item
        const { data: newItem, error: insertError } = await supabase
          .from("inventory")
          .insert({
            ...formData,
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (photoFile && newItem) {
          photoUrl = await uploadPhoto(photoFile, newItem.id);
          await supabase
            .from("inventory")
            .update({ photo_url: photoUrl })
            .eq("id", newItem.id);
        }

        toast({
          title: "Success",
          description: "Inventory item added successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error("Error saving inventory:", error);
      toast({
        title: "Error",
        description: "Failed to save inventory item",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      price: item.price || 0,
      category: item.category || "",
      sku: item.sku || "",
      payment: item.payment || 0,
      interest_rate: item.interest_rate || 0,
      market_status: item.market_status || "",
      transaction_type: item.transaction_type || "",
      finance_type: item.finance_type || "",
      is_wholesale: item.is_wholesale || false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
      fetchInventory();
    } catch (error) {
      console.error("Error deleting inventory:", error);
      toast({
        title: "Error",
        description: "Failed to delete inventory item",
        variant: "destructive",
      });
    }
  };

  const syncFromGoogleSheets = async () => {
    if (!googleSheetUrl) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheet URL first",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: { sheetUrl: googleSheetUrl },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Synced ${data.count} items from Google Sheets`,
      });
      fetchInventory();
    } catch (error) {
      console.error("Error syncing from Google Sheets:", error);
      toast({
        title: "Error",
        description: "Failed to sync from Google Sheets. Make sure the sheet is publicly accessible.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      quantity: 0,
      price: 0,
      category: "",
      sku: "",
      payment: 0,
      interest_rate: 0,
      market_status: "",
      transaction_type: "",
      finance_type: "",
      is_wholesale: false,
    });
    setPhotoFile(null);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Manage your property inventory with photo uploads and Google Sheets sync</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit" : "Add"} Inventory Item</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update" : "Add"} inventory details and upload a photo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment">Payment ($)</Label>
                  <Input
                    id="payment"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.payment}
                    onChange={(e) => setFormData({ ...formData, payment: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="market_status">Market Status</Label>
                  <Select
                    value={formData.market_status}
                    onValueChange={(value) => setFormData({ ...formData, market_status: value })}
                  >
                    <SelectTrigger id="market_status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_market">On Market</SelectItem>
                      <SelectItem value="off_market">Off Market</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction_type">Transaction Type</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                  >
                    <SelectTrigger id="transaction_type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="lease">Lease</SelectItem>
                      <SelectItem value="rent_to_own">Rent to Own</SelectItem>
                      <SelectItem value="owner_finance">Owner Finance</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finance_type">Finance Type</Label>
                  <Input
                    id="finance_type"
                    value={formData.finance_type}
                    onChange={(e) => setFormData({ ...formData, finance_type: e.target.value })}
                    placeholder="e.g., Cash, Mortgage"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_wholesale"
                  checked={formData.is_wholesale}
                  onChange={(e) => setFormData({ ...formData, is_wholesale: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="is_wholesale" className="cursor-pointer">Wholesale Property</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
                {editingItem?.photo_url && !photoFile && (
                  <img src={editingItem.photo_url} alt="Current" className="mt-2 h-20 w-20 object-cover rounded" />
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? "Update" : "Add"} Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Google Sheets Integration</CardTitle>
          <CardDescription>
            Sync inventory data from a Google Sheet. The sheet must be publicly accessible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Google Sheets URL"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
            />
            <Button onClick={saveGoogleSheetUrl} variant="outline">
              Save URL
            </Button>
            <Button onClick={syncFromGoogleSheets} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Sheet should have columns: Name, Description, Quantity, Price, Category, SKU
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No inventory items yet. Add your first item or sync from Google Sheets.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={item.photo_url || undefined} alt={item.name} />
                        <AvatarFallback>{item.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>${item.price?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}