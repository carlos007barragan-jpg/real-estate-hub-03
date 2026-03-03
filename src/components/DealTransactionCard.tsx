import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, MapPin, Calendar, DollarSign, Building2 } from "lucide-react";
import { EditDealPropertyDialog } from "@/components/EditDealPropertyDialog";
import { format } from "date-fns";

interface DealTransactionCardProps {
  deal: any;
  index: number;
  onUpdated: () => void;
}

export const DealTransactionCard = ({ deal, index, onUpdated }: DealTransactionCardProps) => {
  const [editOpen, setEditOpen] = useState(false);

  const label = deal.transaction_type || deal.deal_label || "Unassigned";
  const address = deal.property_address || deal.property_of_interest || "No property assigned";
  const hasSpecs = deal.bedrooms || deal.bathrooms || deal.sqft || deal.property_type;
  const hasFinancials = deal.sales_price || deal.commission || deal.agent_payout || deal.points_charged || deal.total_fee || deal.down_payment;
  const hasCloseInfo = deal.close_date || deal.title_office;

  return (
    <>
      <Card className="border">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Transaction {index + 2}</CardTitle>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{label}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditOpen(true)}>
            <Edit className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2 text-xs">
          {/* Property Address */}
          <div className="flex items-start gap-2">
            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="leading-tight">{address}</span>
          </div>

          {/* Property Specs */}
          {hasSpecs && (
            <>
              <Separator className="my-1.5" />
              <div className="grid grid-cols-2 gap-2">
                {(deal.bedrooms || deal.bathrooms) && (
                  <div>
                    <span className="text-muted-foreground">Beds/Baths:</span>{" "}
                    {deal.bedrooms || 0} / {deal.bathrooms || 0}
                  </div>
                )}
                {deal.sqft && (
                  <div><span className="text-muted-foreground">Sqft:</span> {deal.sqft}</div>
                )}
                {deal.property_type && (
                  <div><span className="text-muted-foreground">Type:</span> {deal.property_type}</div>
                )}
              </div>
            </>
          )}

          {/* Financial Details */}
          {hasFinancials && (
            <>
              <Separator className="my-1.5" />
              <div className="grid grid-cols-2 gap-2">
                {deal.sales_price && (
                  <div><span className="text-muted-foreground">Sales Price:</span> {deal.sales_price}</div>
                )}
                {deal.down_payment && (
                  <div><span className="text-muted-foreground">Down Payment:</span> {deal.down_payment}</div>
                )}
                {deal.commission && (
                  <div><span className="text-muted-foreground">Commission:</span> {deal.commission}</div>
                )}
                {deal.agent_payout && (
                  <div><span className="text-muted-foreground">Agent Payout:</span> {deal.agent_payout}</div>
                )}
                {deal.points_charged && (
                  <div><span className="text-muted-foreground">Points:</span> {deal.points_charged}</div>
                )}
                {deal.total_fee && (
                  <div><span className="text-muted-foreground">Total Fee:</span> {deal.total_fee}</div>
                )}
              </div>
            </>
          )}

          {/* Close Date & Title Office */}
          {hasCloseInfo && (
            <>
              <Separator className="my-1.5" />
              <div className="grid grid-cols-2 gap-2">
                {deal.close_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Close:</span>{" "}
                    {format(new Date(deal.close_date), "MM/dd/yyyy")}
                  </div>
                )}
                {deal.title_office && (
                  <div>
                    <span className="text-muted-foreground">Title Office:</span> {deal.title_office}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Empty state */}
          {!hasSpecs && !hasFinancials && !hasCloseInfo && address === "No property assigned" && (
            <p className="text-muted-foreground italic">No details added yet. Click edit to add property and transaction info.</p>
          )}
        </CardContent>
      </Card>

      <EditDealPropertyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        deal={deal}
        onSaved={onUpdated}
        propertyIndex={index + 2}
      />
    </>
  );
};
