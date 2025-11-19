import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsManager } from "@/components/CustomFieldsManager";
import { TransactionTypesManager } from "@/components/TransactionTypesManager";
import { FormFieldsEditor } from "@/components/FormFieldsEditor";
import { AlertCircle } from "lucide-react";

export const LeadFieldsManager = () => {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg border">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">
              About Lead Form Customization
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Form Editor: View and customize your entire lead form - reorder fields, toggle required status, and remove custom fields</li>
              <li>• Add Custom Fields: Create additional fields to capture specific information needed for your leads</li>
              <li>• Transaction Types: Define the types of transactions your team handles (e.g., Listing, Buyer's, Rental)</li>
              <li>• All team members will see these same fields and options when creating leads</li>
            </ul>
          </div>
        </div>
      </div>

      <Tabs defaultValue="form-editor" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="form-editor">Form Editor</TabsTrigger>
          <TabsTrigger value="custom-fields">Add Custom Fields</TabsTrigger>
          <TabsTrigger value="transaction-types">Transaction Types</TabsTrigger>
        </TabsList>
        
        <TabsContent value="form-editor">
          <FormFieldsEditor />
        </TabsContent>
        
        <TabsContent value="custom-fields">
          <CustomFieldsManager />
        </TabsContent>
        
        <TabsContent value="transaction-types">
          <TransactionTypesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
