import { TransactionTypesManager } from "@/components/TransactionTypesManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
              <li>• Define the types of transactions your team handles (e.g., Listing, Buyer&apos;s, Rental)</li>
              <li>• All team members will see these same transaction types when creating leads</li>
            </ul>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Types</CardTitle>
          <CardDescription>
            Manage your transaction types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionTypesManager />
        </CardContent>
      </Card>
    </div>
  );
};
