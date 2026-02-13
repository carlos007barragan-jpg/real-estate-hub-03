import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";

interface ParsedProperty {
  name: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  property_type: string;
  category: string;
  status: string;
  description: string;
  valid: boolean;
  error?: string;
}

interface BulkPropertyUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function BulkPropertyUpload({ open, onOpenChange, onSuccess }: BulkPropertyUploadProps) {
  const [parsedData, setParsedData] = useState<ParsedProperty[]>([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = "Address,Price,Bedrooms,Bathrooms,SqFt,Property Type,Category,Status,Description";
    const example = '"123 Main St",250000,3,2,1500,"Single Family","Residential","available","Beautiful home"';
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "property_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedProperty[] => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));

    return lines.slice(1).map(line => {
      // Handle quoted CSV values
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const get = (keys: string[]) => {
        const idx = headers.findIndex(h => keys.some(k => h.includes(k)));
        return idx >= 0 ? values[idx]?.replace(/"/g, "").trim() : "";
      };

      const name = get(["address", "name", "property"]);
      const price = parseFloat(get(["price", "cost"]).replace(/[$,]/g, "")) || 0;
      const bedrooms = parseInt(get(["bed", "bedroom"])) || 0;
      const bathrooms = parseFloat(get(["bath", "bathroom"])) || 0;
      const sqft = parseInt(get(["sqft", "sq ft", "square"])) || 0;
      const property_type = get(["property type", "type"]) || "Single Family";
      const category = get(["category", "cat"]) || "Residential";
      const status = get(["status"]) || "available";
      const description = get(["description", "desc", "notes"]);

      const valid = !!name;
      const error = !name ? "Address is required" : undefined;

      return { name, price, bedrooms, bathrooms, sqft, property_type, category, status, description, valid, error };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleUpload = async () => {
    const validItems = parsedData.filter(p => p.valid);
    if (validItems.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rows = validItems.map(p => ({
        name: p.name,
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        sqft: p.sqft,
        property_type: p.property_type,
        category: p.category,
        status: p.status,
        description: p.description || null,
        quantity: 1,
        user_id: user.id,
      }));

      const { error } = await supabase.from("inventory").insert(rows);
      if (error) throw error;

      toast({
        title: "Bulk Upload Complete",
        description: `${validItems.length} properties added successfully`,
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setStep("upload");
    onOpenChange(false);
  };

  const validCount = parsedData.filter(p => p.valid).length;
  const invalidCount = parsedData.filter(p => !p.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Properties</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple properties at once
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-6 py-4">
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Click to upload CSV file</p>
              <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex items-center justify-center">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium">Expected columns:</p>
              <p className="text-muted-foreground">Address, Price, Bedrooms, Bathrooms, SqFt, Property Type, Category, Status, Description</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> {invalidCount} errors
                </Badge>
              )}
            </div>
            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>Baths</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, i) => (
                    <TableRow key={i} className={!row.valid ? "bg-destructive/5" : ""}>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.name || "—"}</TableCell>
                      <TableCell>${row.price.toLocaleString()}</TableCell>
                      <TableCell>{row.bedrooms}</TableCell>
                      <TableCell>{row.bathrooms}</TableCell>
                      <TableCell>{row.property_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleUpload} disabled={uploading || validCount === 0}>
                {uploading ? "Uploading..." : `Upload ${validCount} Properties`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
