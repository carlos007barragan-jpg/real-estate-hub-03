import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsManager } from "@/components/CustomFieldsManager";
import { TransactionTypesManager } from "@/components/TransactionTypesManager";
import { AlertCircle } from "lucide-react";

export const LeadFieldsManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Form Customization</CardTitle>
        <CardDescription>
          Customize the fields and options available in your lead creation form
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                About Lead Form Customization
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Custom Fields: Add additional fields to capture specific information needed for your leads</li>
                <li>• Transaction Types: Define the types of transactions your team handles (e.g., Listing, Buyer's, Rental)</li>
                <li>• All team members will see these same fields and options when creating leads</li>
                <li>• Standard fields like Name, Email, Phone, and Assign To are always available</li>
              </ul>
            </div>
          </div>
        </div>

        <Tabs defaultValue="custom-fields" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
            <TabsTrigger value="transaction-types">Transaction Types</TabsTrigger>
          </TabsList>
          
          <TabsContent value="custom-fields">
            <CustomFieldsManager />
          </TabsContent>
          
          <TabsContent value="transaction-types">
            <TransactionTypesManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
