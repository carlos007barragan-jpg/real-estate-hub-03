import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Trash2, Edit2, Save, X, DollarSign } from "lucide-react";
import { DealClosedDialog } from "@/components/DealClosedDialog";
import { fireDealWonConfetti } from "@/lib/confetti";

interface LeadDeal {
  id: string;
  lead_id: string;
  pipeline_id: string;
  pipeline_stage: string;
  transaction_type: string | null;
  deal_label: string | null;
  status: string;
  display_order: number;
  sales_price: string | null;
  commission: string | null;
  agent_payout: string | null;
  property_of_interest: string | null;
  title_office: string | null;
  close_date: string | null;
}

interface PipelineInfo {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}

interface LeadDealsAccordionProps {
  leadId: string;
  leadName: string;
  deals: LeadDeal[];
  onDealsChange: () => void;
}

const wonStageNames = ["closed", "sold", "funded", "closed won", "deal won", "won", "done", "completed"];

// Stages at which the deal label switches to show the property address
const advancedStageNames = [
  "terms negotiation", "contract signed", "under contract", "in process", 
  "closing", "closed", "sold", "funded", "closed won", "deal won", "won", 
  "done", "completed", "offer accepted", "pending"
];

export function LeadDealsAccordion({ leadId, leadName, deals, onDealsChange }: LeadDealsAccordionProps) {
  const { toast } = useToast();
  const [pipelineCache, setPipelineCache] = useState<Record<string, PipelineInfo>>({});
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<LeadDeal>>({});
  const [dealClosedOpen, setDealClosedOpen] = useState(false);
  const [closedDeal, setClosedDeal] = useState<LeadDeal | null>(null);
  const [closedStageName, setClosedStageName] = useState("");

  // Fetch pipeline info for all unique pipeline_ids
  useEffect(() => {
    const pipelineIds = [...new Set(deals.map(d => d.pipeline_id))];
    const missing = pipelineIds.filter(id => !pipelineCache[id]);
    if (missing.length === 0) return;

    const fetchPipelines = async () => {
      const { data } = await supabase
        .from("pipelines")
        .select("id, name, stages")
        .in("id", missing);

      if (data) {
        const newCache: Record<string, PipelineInfo> = { ...pipelineCache };
        data.forEach((p: any) => {
          newCache[p.id] = { id: p.id, name: p.name, stages: p.stages as { id: string; name: string }[] };
        });
        setPipelineCache(newCache);
      }
    };
    fetchPipelines();
  }, [deals]);

  const handleStageChange = async (deal: LeadDeal, newStage: string) => {
    try {
      const { error } = await supabase
        .from("lead_deals")
        .update({ pipeline_stage: newStage } as any)
        .eq("id", deal.id);
      if (error) throw error;

      // Check for won stage
      const isWon = wonStageNames.includes(newStage.toLowerCase().trim());
      const pipeline = pipelineCache[deal.pipeline_id];
      const isLastStage = pipeline && pipeline.stages.length > 0 && pipeline.stages[pipeline.stages.length - 1]?.name === newStage;

      if (isWon || isLastStage) {
        fireDealWonConfetti();
        setClosedDeal({ ...deal, pipeline_stage: newStage });
        setClosedStageName(newStage);
        setDealClosedOpen(true);
      }

      toast({ title: "Stage Updated", description: `Deal moved to ${newStage}` });
      onDealsChange();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveDeal = async (deal: LeadDeal) => {
    if (!confirm("Remove this transaction? This cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from("lead_deals")
        .delete()
        .eq("id", deal.id);

      if (error) throw error;

      toast({ title: "Transaction Removed" });
      onDealsChange();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const startEdit = (deal: LeadDeal) => {
    setEditingDealId(deal.id);
    setEditFields({
      sales_price: deal.sales_price || "",
      commission: deal.commission || "",
      agent_payout: deal.agent_payout || "",
      property_of_interest: deal.property_of_interest || "",
      title_office: deal.title_office || "",
      close_date: deal.close_date || "",
    });
  };

  const cancelEdit = () => {
    setEditingDealId(null);
    setEditFields({});
  };

  const saveEdit = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from("lead_deals")
        .update(editFields as any)
        .eq("id", dealId);

      if (error) throw error;

      toast({ title: "Deal Updated" });
      setEditingDealId(null);
      onDealsChange();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStageProgress = (deal: LeadDeal) => {
    const pipeline = pipelineCache[deal.pipeline_id];
    if (!pipeline || pipeline.stages.length === 0) return 0;
    const idx = pipeline.stages.findIndex(s => s.name === deal.pipeline_stage);
    if (idx === -1) return 0;
    return ((idx + 1) / pipeline.stages.length) * 100;
  };

  if (deals.length === 0) return null;

  return (
    <>
      <Accordion type="multiple" className="space-y-2">
        {deals.map((deal, dealIndex) => {
          const pipeline = pipelineCache[deal.pipeline_id];
          const stages = pipeline?.stages || [];
          const isEditing = editingDealId === deal.id;

          return (
            <AccordionItem key={deal.id} value={deal.id} className="border rounded-lg bg-card px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <Badge variant="outline" className="text-[10px] shrink-0 px-1.5">
                    {dealIndex + 1}
                  </Badge>
                  <span className="font-medium text-sm truncate">
                    {advancedStageNames.includes(deal.pipeline_stage.toLowerCase().trim()) && deal.property_of_interest
                      ? deal.property_of_interest
                      : deal.deal_label || "Deal"}
                  </span>
                  {pipeline && (
                    <Badge variant="outline" className="text-xs shrink-0">{pipeline.name}</Badge>
                  )}
                  {deal.transaction_type && (
                    <Badge className="bg-primary/10 text-primary text-xs shrink-0">{deal.transaction_type}</Badge>
                  )}
                  <Badge variant={deal.status === "won" ? "default" : "secondary"} className="text-xs shrink-0 ml-auto mr-2">
                    {deal.pipeline_stage}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {/* Pipeline Progress */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{pipeline?.name || "Pipeline"} Progress</span>
                      <span className="text-xs text-muted-foreground">{Math.round(getStageProgress(deal))}%</span>
                    </div>
                    <Progress value={getStageProgress(deal)} className="h-1.5" />
                  </div>
                  <Select value={deal.pipeline_stage} onValueChange={(v) => handleStageChange(deal, v)}>
                    <SelectTrigger className="w-[160px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Financial Fields */}
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Sale Price</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 350000"
                        value={editFields.sales_price || ""}
                        onChange={(e) => setEditFields(prev => ({ ...prev, sales_price: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Commission</Label>
                      <Input
                        placeholder="e.g. 3%"
                        value={editFields.commission || ""}
                        onChange={(e) => setEditFields(prev => ({ ...prev, commission: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Agent Payout</Label>
                      <Input
                        placeholder="e.g. $5000"
                        value={editFields.agent_payout || ""}
                        onChange={(e) => setEditFields(prev => ({ ...prev, agent_payout: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Property</Label>
                      <Input
                        placeholder="Address or description"
                        value={editFields.property_of_interest || ""}
                        onChange={(e) => setEditFields(prev => ({ ...prev, property_of_interest: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Title Office</Label>
                      <Input
                        placeholder="Title office name"
                        value={editFields.title_office || ""}
                        onChange={(e) => setEditFields(prev => ({ ...prev, title_office: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Close Date</Label>
                      <Input
                        type="date"
                        value={editFields.close_date || ""}
                        onChange={(e) => setEditFields(prev => ({ ...prev, close_date: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {deal.sales_price && (
                      <div>
                        <span className="text-muted-foreground">Sale Price:</span>{" "}
                        <span className="font-medium">${Number(deal.sales_price).toLocaleString()}</span>
                      </div>
                    )}
                    {deal.commission && (
                      <div>
                        <span className="text-muted-foreground">Commission:</span>{" "}
                        <span className="font-medium">{deal.commission}</span>
                      </div>
                    )}
                    {deal.agent_payout && (
                      <div>
                        <span className="text-muted-foreground">Agent Payout:</span>{" "}
                        <span className="font-medium">{deal.agent_payout}</span>
                      </div>
                    )}
                    {deal.property_of_interest && (
                      <div>
                        <span className="text-muted-foreground">Property:</span>{" "}
                        <span className="font-medium">{deal.property_of_interest}</span>
                      </div>
                    )}
                    {deal.title_office && (
                      <div>
                        <span className="text-muted-foreground">Title Office:</span>{" "}
                        <span className="font-medium">{deal.title_office}</span>
                      </div>
                    )}
                    {deal.close_date && (
                      <div>
                        <span className="text-muted-foreground">Close Date:</span>{" "}
                        <span className="font-medium">{new Date(deal.close_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {isEditing ? (
                    <>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => saveEdit(deal.id)}>
                        <Save className="h-3 w-3" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={cancelEdit}>
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => startEdit(deal)}>
                        <Edit2 className="h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleRemoveDeal(deal)}>
                        <Trash2 className="h-3 w-3" /> Remove
                      </Button>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {closedDeal && (
        <DealClosedDialog
          open={dealClosedOpen}
          onOpenChange={setDealClosedOpen}
          leadId={leadId}
          leadName={leadName}
          stageName={closedStageName}
          pipelineName={pipelineCache[closedDeal.pipeline_id]?.name}
          propertyOfInterest={closedDeal.property_of_interest || ""}
          dealId={closedDeal.id}
          transactionType={closedDeal.transaction_type || undefined}
          onSuccess={onDealsChange}
        />
      )}
    </>
  );
}
