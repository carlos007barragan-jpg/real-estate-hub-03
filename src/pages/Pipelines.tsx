import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, DollarSign, Calendar, TrendingUp, Layers, Plus, Filter, Search, MessageSquare, GripVertical, MoreVertical, Trash2, Edit, User, ChevronDown, ChevronRight } from "lucide-react";
import { EditDealDialog } from "@/components/EditDealDialog";
import { OfferMadeValidationDialog } from "@/components/OfferMadeValidationDialog";
import { DealClosedDialog } from "@/components/DealClosedDialog";
import { fireDealWonConfetti } from "@/lib/confetti";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PipelineManager } from "@/components/PipelineManager";
import { DealNotesDialog } from "@/components/DealNotesDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Deal {
  id: string;
  client: string;
  agent: string;
  commission: number;
  closeDate: string;
  priority: "high" | "medium" | "low";
  leadId?: string;
  propertyAddress?: string;
  dealRecordId?: string;
  dealLabel?: string;
  rawCloseDate?: string; // ISO date for filtering
}

interface Stage {
  id: string;
  name: string;
  deals: Deal[];
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

const defaultPipelineTemplate: Pipeline[] = [
  {
    id: "default-1",
    name: "Sales Pipeline",
    stages: [
      { id: "s1", name: "New Lead", deals: [] },
      { id: "s2", name: "Contacted", deals: [] },
      { id: "s3", name: "Qualified", deals: [] },
      { id: "s4", name: "Under Contract", deals: [] },
      { id: "s5", name: "Closed", deals: [] },
    ],
  },
];

const priorityColors = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};

function DraggableDeal({ deal, onOpenNotes, onNavigate, onEdit, onDelete }: { 
  deal: Deal; 
  onOpenNotes: (deal: Deal) => void;
  onNavigate: (leadId: string) => void;
  onEdit: (leadId?: string) => void;
  onDelete: (dealId: string, leadId?: string) => void;
}) {
  const { toast } = useToast();
  const {
    attributes,
    setNodeRef,
    transform,
    transition,
    isDragging,
    listeners,
  } = useSortable({ id: `deal-${deal.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deal.leadId) {
      onNavigate(deal.leadId);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-background rounded-lg border hover:border-primary/50 hover:shadow-md transition-all flex gap-2 overflow-hidden"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-6 bg-gray-800 rounded-l-lg hover:bg-gray-700 transition-colors touch-none"
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLElement).style.cursor = 'grab';
        }}
      >
        <GripVertical className="h-4 w-4 text-white pointer-events-none" />
      </div>

      <div
        onClick={handleCardClick}
        className="flex-1 min-w-0 p-3 cursor-pointer"
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm text-foreground leading-tight">
                {deal.client || 'Unknown Client'}
              </h4>
              {deal.propertyAddress && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="h-2.5 w-2.5 text-primary flex-shrink-0" />
                  <span className="text-[10px] text-primary font-medium truncate">{deal.propertyAddress}</span>
                </div>
              )}
              {deal.dealLabel && (
                <span className="text-[10px] text-muted-foreground">{deal.dealLabel}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Badge 
                className={`${priorityColors[deal.priority]} text-[10px] h-4 px-1.5`} 
                variant="secondary"
              >
                {deal.priority}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button
                    className="p-1 rounded hover:bg-muted transition-colors"
                    aria-label="Deal options"
                  >
                    <MoreVertical className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="z-50 bg-popover">
                  <DropdownMenuItem onClick={() => onEdit(deal.leadId)}>
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(deal.id, deal.leadId)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">Agent: {deal.agent || 'Not assigned'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <DollarSign className="h-3 w-3 flex-shrink-0" />
                <span>${(deal.commission || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>{deal.closeDate || 'TBD'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DroppableStage({ 
  stage, 
  children 
}: { 
  stage: Stage; 
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[60px] rounded-lg transition-colors ${
        isOver ? 'bg-primary/5 border-2 border-primary border-dashed' : ''
      }`}
    >
      {children}
    </div>
  );
}


const Pipelines = () => {
  const navigate = useNavigate();
  const [selectedPipeline, setSelectedPipeline] = useState<string>(() => {
    return localStorage.getItem("selectedPipelineId") || "";
  });
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  
  const handleSelectPipeline = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    localStorage.setItem("selectedPipelineId", pipelineId);
  };
  const [pipelinesLoaded, setPipelinesLoaded] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dealFilter, setDealFilter] = useState<string>("all");
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [selectedDealLeadId, setSelectedDealLeadId] = useState<string | undefined>();
  const [pendingStageChange, setPendingStageChange] = useState<{ dealId: string; stage: string } | null>(null);
  const [pipelineManagerOpen, setPipelineManagerOpen] = useState(false);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [commissionLeadId, setCommissionLeadId] = useState("");
  const [commissionLeadName, setCommissionLeadName] = useState("");
  const [commissionStageName, setCommissionStageName] = useState("");
  const [commissionPipelineName, setCommissionPipelineName] = useState("");
  const [isPerformingStageChange, setIsPerformingStageChange] = useState(false);
  const stageChangeGuardRef = useRef(false);
  const [wonStageIdsInitialized, setWonStageIdsInitialized] = useState(false);
  const { toast } = useToast();
  const { role } = useAuth();

  const wonStageNames = ["closed", "sold", "funded", "closed won", "deal won", "won", "done", "completed", "complete"];

  const isWonStageName = (name: string) => wonStageNames.includes(name.toLowerCase().trim());

  const toggleStageCollapse = (stageId: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const temperatureToPipelineMap: Record<string, string> = {
    "buyer's": "Real Estate Sales",
    "listing": "Seller Listings",
    "investor's": "Investor/Buyer Dispositions",
    "owner financed": "Owner Finance Sales",
    "funding": "Hard Money Loans",
    "wholesale": "Wholesale Acquisitions",
    "commercial": "Investor/Buyer Dispositions",
    "multifamily": "Investor/Buyer Dispositions",
    "rental": "Real Estate Sales",
  };

  const populatePipelinesWithLeads = (rawPipelines: Pipeline[], leads: any[], leadDeals: any[] = []): Pipeline[] => {
    const pipelineStageNames = new Map<string, string[]>();
    const pipelineNameToId = new Map<string, string>();
    rawPipelines.forEach(p => {
      pipelineStageNames.set(p.id, p.stages.map(s => s.name));
      pipelineNameToId.set(p.name.toLowerCase().trim(), p.id);
    });

    const pipelineMap = new Map<string, Map<string, Deal[]>>();

    const leadDealsByLeadAndPipeline = new Map<string, Set<string>>();
    leadDeals.forEach(ld => {
      const key = ld.lead_id;
      if (!leadDealsByLeadAndPipeline.has(key)) {
        leadDealsByLeadAndPipeline.set(key, new Set());
      }
      leadDealsByLeadAndPipeline.get(key)!.add(ld.pipeline_id);
    });

    const calculatePriority = (pipelineId: string, stage: string): "high" | "medium" | "low" => {
      const stages = pipelineStageNames.get(pipelineId);
      if (!stages || stages.length <= 1) return "low";
      const idx = stages.indexOf(stage);
      if (idx === -1) return "low";
      const progress = idx / (stages.length - 1);
      if (progress >= 0.7) return "high";
      if (progress >= 0.35) return "medium";
      return "low";
    };

    const addDealToPipeline = (pipelineId: string, stage: string, deal: Deal) => {
      const validStages = pipelineStageNames.get(pipelineId);
      if (!validStages) return;

      if (!validStages.includes(stage)) {
        const normalizedStage = stage?.toLowerCase().trim();
        const fuzzyMatch = validStages.find(s => 
          s.toLowerCase().trim() === normalizedStage ||
          s.toLowerCase().trim().includes(normalizedStage) ||
          normalizedStage?.includes(s.toLowerCase().trim())
        );
        stage = fuzzyMatch || validStages[0] || stage;
      }

      deal.priority = calculatePriority(pipelineId, stage);

      if (!pipelineMap.has(pipelineId)) {
        pipelineMap.set(pipelineId, new Map());
      }
      const stageMap = pipelineMap.get(pipelineId)!;
      if (!stageMap.has(stage)) {
        stageMap.set(stage, []);
      }
      stageMap.get(stage)!.push(deal);
    };

    // Process leads (primary deal) — fix close date and sales price for won leads
    leads.forEach((lead) => {
      let pipelineId = lead.pipeline;
      let stage = lead.pipeline_stage;

      if (!pipelineId && lead.lead_temperature) {
        const tempKey = lead.lead_temperature.toLowerCase().trim();
        const targetPipelineName = temperatureToPipelineMap[tempKey];
        if (targetPipelineName) {
          pipelineId = pipelineNameToId.get(targetPipelineName.toLowerCase().trim());
        }
      }

      if (!pipelineId) return;

      const isWon = lead.status === "won" || isWonStageName(stage || "");
      
      // For close date: prefer close_date (actual date) over timeframe (text like "30 days")
      let closeDate = "TBD";
      let rawCloseDate: string | undefined;
      if (lead.close_date) {
        closeDate = new Date(lead.close_date).toLocaleDateString();
        rawCloseDate = lead.close_date;
      } else if (lead.timeframe && !isWon) {
        closeDate = lead.timeframe;
      }

      // For commission/value: prefer sales_price for won deals
      const commissionValue = parseFloat(lead.sales_price || lead.value?.replace(/[^0-9.-]+/g, "") || "0");

      const deal: Deal = {
        id: lead.id,
        client: lead.name,
        agent: lead.assigned_to || "Not assigned",
        commission: commissionValue,
        closeDate,
        rawCloseDate,
        priority: "low",
        leadId: lead.id,
        propertyAddress: lead.property_of_interest || lead.property_address || undefined,
      };

      addDealToPipeline(pipelineId, stage, deal);
    });

    // Process lead_deals (additional deals)
    const leadsById = new Map(leads.map((l: any) => [l.id, l]));
    leadDeals.forEach((ld) => {
      const lead = leadsById.get(ld.lead_id);
      if (!lead) return;

      const deal: Deal = {
        id: `deal-record-${ld.id}`,
        client: lead.name,
        agent: lead.assigned_to || "Not assigned",
        commission: parseFloat(ld.sales_price || "0"),
        closeDate: ld.close_date ? new Date(ld.close_date).toLocaleDateString() : "TBD",
        rawCloseDate: ld.close_date || undefined,
        priority: "low",
        leadId: lead.id,
        propertyAddress: ld.property_of_interest || undefined,
        dealRecordId: ld.id,
        dealLabel: ld.deal_label || ld.transaction_type || undefined,
      };

      addDealToPipeline(ld.pipeline_id, ld.pipeline_stage, deal);
    });

    return rawPipelines.map((pipeline) => {
      const pipelineDeals = pipelineMap.get(pipeline.id);
      return {
        ...pipeline,
        stages: pipeline.stages.map((stage) => ({
          ...stage,
          deals: pipelineDeals?.get(stage.name) || [],
        })),
      };
    });
  };

  const fetchPipelinesAndLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userProfile?.organization_id) return;

      const [pipelinesResult, leadsResult, leadDealsResult] = await Promise.all([
        supabase
          .from("pipelines")
          .select("*")
          .eq("organization_id", userProfile.organization_id)
          .order("display_order", { ascending: true }),
        supabase
          .from("leads")
          .select("*")
          .eq("is_demo_data", false),
        supabase
          .from("lead_deals")
          .select("*")
          .eq("organization_id", userProfile.organization_id)
          .eq("status", "active"),
      ]);

      if (pipelinesResult.error) throw pipelinesResult.error;

      let rawPipelines: Pipeline[];

      if (!pipelinesResult.data || pipelinesResult.data.length === 0) {
        const defaultPipelines = defaultPipelineTemplate.map((mp, index) => ({
          user_id: user.id,
          organization_id: userProfile.organization_id,
          name: mp.name,
          stages: mp.stages.map(s => ({ id: s.id, name: s.name })),
          display_order: index,
        }));

        const { data: created, error: createError } = await supabase
          .from("pipelines")
          .insert(defaultPipelines)
          .select();

        if (createError) throw createError;

        rawPipelines = (created || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          stages: (p.stages as any[]).map(s => ({ ...s, deals: [] })),
        }));
      } else {
        rawPipelines = pipelinesResult.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          stages: (p.stages as any[]).map(s => ({ ...s, deals: [] })),
        }));
      }

      const populatedPipelines = populatePipelinesWithLeads(rawPipelines, leadsResult.data || [], leadDealsResult.data || []);
      setPipelines(populatedPipelines);

      // Auto-collapse won stages on first load
      if (!wonStageIdsInitialized) {
        const wonIds = new Set<string>();
        populatedPipelines.forEach(p => {
          p.stages.forEach(s => {
            if (isWonStageName(s.name)) {
              wonIds.add(s.id);
            }
          });
        });
        setCollapsedStages(wonIds);
        setWonStageIdsInitialized(true);
      }

      const pipelineIds = populatedPipelines.map(p => p.id);
      if (!selectedPipeline || !pipelineIds.includes(selectedPipeline)) {
        handleSelectPipeline(populatedPipelines[0]?.id || "");
      }

      setPipelinesLoaded(true);
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      toast({
        title: "Error",
        description: "Failed to load pipelines. Please refresh the page.",
        variant: "destructive",
      });
      setPipelinesLoaded(true);
    }
  };

  // Save pipeline changes to database
  const handlePipelinesUpdate = async (updatedPipelines: Pipeline[]) => {
    // Store previous state for rollback
    const previousPipelines = [...pipelines];
    
    // Optimistic update
    setPipelines(updatedPipelines);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPipelines(previousPipelines); // Rollback
        toast({
          title: "Error",
          description: "You must be logged in to save pipelines",
          variant: "destructive",
        });
        return;
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userProfile?.organization_id) {
        setPipelines(previousPipelines); // Rollback
        toast({
          title: "Error",
          description: "Organization not found",
          variant: "destructive",
        });
        return;
      }

      // Get current pipelines from DB to identify new ones
      const { data: existingPipelines, error: fetchError } = await supabase
        .from("pipelines")
        .select("id")
        .eq("organization_id", userProfile.organization_id);

      if (fetchError) {
        console.error("Error fetching existing pipelines:", fetchError);
        throw fetchError;
      }

      const existingIds = new Set((existingPipelines || []).map(p => p.id));
      const savedPipelines: Pipeline[] = [];

      for (let i = 0; i < updatedPipelines.length; i++) {
        const pipeline = updatedPipelines[i];
        const stagesData = pipeline.stages.map(s => ({ id: s.id, name: s.name }));

        if (existingIds.has(pipeline.id)) {
          // Update existing pipeline
          const { error: updateError } = await supabase
            .from("pipelines")
            .update({ name: pipeline.name, stages: stagesData, display_order: i })
            .eq("id", pipeline.id);
          
          if (updateError) {
            console.error("Error updating pipeline:", updateError);
            throw updateError;
          }
          savedPipelines.push(pipeline);
        } else {
          // Insert new pipeline
          const { data: newPipeline, error: insertError } = await supabase
            .from("pipelines")
            .insert({
              user_id: user.id,
              organization_id: userProfile.organization_id,
              name: pipeline.name,
              stages: stagesData,
              display_order: i,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error inserting pipeline:", insertError);
            throw insertError;
          }

          // Use the real DB id
          if (newPipeline) {
            const savedPipeline = { ...pipeline, id: newPipeline.id };
            savedPipelines.push(savedPipeline);
            
            // Update localStorage with new ID if this was the selected pipeline
            const storedPipelineId = localStorage.getItem("selectedPipelineId");
            if (storedPipelineId === pipeline.id) {
              localStorage.setItem("selectedPipelineId", newPipeline.id);
              setSelectedPipeline(newPipeline.id);
            }
          }
        }
      }

      // Delete removed pipelines
      const currentIds = new Set(updatedPipelines.map(p => p.id));
      for (const existingId of existingIds) {
        if (!currentIds.has(existingId)) {
          const { error: deleteError } = await supabase.from("pipelines").delete().eq("id", existingId);
          if (deleteError) {
            console.error("Error deleting pipeline:", deleteError);
          }
        }
      }

      // Update state with real DB IDs
      setPipelines(savedPipelines);

      toast({
        title: "Success",
        description: "Pipeline saved successfully",
      });
    } catch (error) {
      console.error("Error saving pipelines:", error);
      // Rollback to previous state on error
      setPipelines(previousPipelines);
      toast({
        title: "Error",
        description: "Failed to save pipeline changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPipelinesAndLeads();

    // Subscribe to real-time lead updates — just re-fetch everything atomically
    const channel = supabase
      .channel("leads_pipeline_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          if (!stageChangeGuardRef.current) fetchPipelinesAndLeads();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_deals" },
        () => {
          if (!stageChangeGuardRef.current) fetchPipelinesAndLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const currentPipeline = pipelines.find((p) => p.id === selectedPipeline);

  const analytics = useMemo(() => {
    if (!currentPipeline) return { totalValue: 0, totalDeals: 0, avgDealSize: 0, activeDeals: 0, closedDeals: 0 };

    const allDeals = currentPipeline.stages.flatMap((stage) => stage.deals);
    const totalValue = allDeals.reduce((sum, deal) => sum + deal.commission, 0);
    const totalDeals = allDeals.length;
    const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
    
    const closedDeals = currentPipeline.stages
      .filter(s => isWonStageName(s.name))
      .flatMap(s => s.deals).length;
    const activeDeals = totalDeals - closedDeals;

    return { totalValue, totalDeals, avgDealSize, activeDeals, closedDeals };
  }, [currentPipeline]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = String(active.id);
    const dealId = activeId.startsWith('deal-') ? activeId.slice(5) : activeId;
    const deal = currentPipeline?.stages
      .flatMap((stage) => stage.deals)
      .find((d) => d.id === dealId);
    setActiveDeal(deal || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDeal(null);
    
    if (!over || !currentPipeline) return;

    const activeIdStr = String(active.id);
    const draggedDealId = activeIdStr.startsWith('deal-') ? activeIdStr.slice(5) : activeIdStr;

    const overIdStr = String(over.id);

    const activeStage = currentPipeline.stages.find((stage) =>
      stage.deals.some((deal) => deal.id === draggedDealId)
    );

    let overStage: Stage | undefined;
    if (overIdStr.startsWith('stage-')) {
      const targetStageId = overIdStr.slice(6);
      overStage = currentPipeline.stages.find((stage) => stage.id === targetStageId);
    } else if (overIdStr.startsWith('deal-')) {
      const overDealId = overIdStr.slice(5);
      overStage = currentPipeline.stages.find((stage) =>
        stage.deals.some((deal) => deal.id === overDealId)
      );
    }

    if (!activeStage || !overStage) return;
    if (activeStage.id === overStage.id) return;

    if (overStage.name === "Offer Made") {
      const activeDeal = activeStage.deals.find((deal) => deal.id === draggedDealId);
      setPendingStageChange({ dealId: draggedDealId, stage: overStage.name });
      setSelectedDealLeadId(activeDeal?.leadId);
      setValidationDialogOpen(true);
      return;
    }

    await performStageChange(draggedDealId, overStage.name);
  };

  const performStageChange = async (dealId: string, newStageName: string) => {
    if (!currentPipeline) return;
    stageChangeGuardRef.current = true;

    const activeStage = currentPipeline.stages.find((stage) =>
      stage.deals.some((deal) => deal.id === dealId)
    );

    const overStage = currentPipeline.stages.find((stage) => stage.name === newStageName);

    if (!activeStage || !overStage) return;

    const isLastStage = currentPipeline.stages[currentPipeline.stages.length - 1]?.id === overStage.id;
    const isWonStage = wonStageNames.includes(newStageName.toLowerCase().trim());

    const activeDeal = activeStage.deals.find((deal) => deal.id === dealId);
    if (activeDeal?.dealRecordId) {
      await supabase
        .from("lead_deals")
        .update({ pipeline_stage: overStage.name } as any)
        .eq("id", activeDeal.dealRecordId);
    } else if (activeDeal?.leadId) {
      await supabase
        .from("leads")
        .update({ pipeline_stage: overStage.name })
        .eq("id", activeDeal.leadId);
    }

    setPipelines((prevPipelines) =>
      prevPipelines.map((pipeline) => {
        if (pipeline.id !== selectedPipeline) return pipeline;

        const deal = activeStage.deals.find((d) => d.id === dealId);
        if (!deal) return pipeline;

        const newStages = pipeline.stages.map((stage) => {
          if (stage.id === activeStage.id) {
            return {
              ...stage,
              deals: stage.deals.filter((d) => d.id !== dealId),
            };
          }
          if (stage.id === overStage!.id) {
            return {
              ...stage,
              deals: [...stage.deals, deal],
            };
          }
          return stage;
        });

        return { ...pipeline, stages: newStages };
      })
    );

    const wasWonStage = wonStageNames.includes(activeStage.name.toLowerCase().trim()) ||
      currentPipeline.stages[currentPipeline.stages.length - 1]?.id === activeStage.id;
    const isNowWon = isLastStage || isWonStage;

    if (wasWonStage && !isNowWon && activeDeal?.leadId) {
      await Promise.all([
        supabase.from("commission_entries").delete().eq("lead_id", activeDeal.leadId),
        supabase.from("leads").update({
          commission: null,
          sales_price: null,
          close_date: null,
          status: "active",
        } as any).eq("id", activeDeal.leadId),
        supabase.from("tasks").delete().eq("lead_id", activeDeal.leadId).ilike("title", "%Enter commission%payout%"),
      ]);

      toast({
        title: "Deal Reverted",
        description: "Commission data cleared. Move back to a won stage to re-enter.",
      });
    }

    if (isNowWon) {
      fireDealWonConfetti();
      
      if (activeDeal?.leadId) {
        setCommissionLeadId(activeDeal.leadId);
        setCommissionLeadName(activeDeal.client);
        setCommissionStageName(newStageName);
        setCommissionPipelineName(currentPipeline.name);
        setCommissionDialogOpen(true);
      } else {
        stageChangeGuardRef.current = false;
      }
    } else {
      setTimeout(() => {
        stageChangeGuardRef.current = false;
        fetchPipelinesAndLeads();
      }, 500);
    }
  };

  const fetchDeals = () => {
    fetchPipelinesAndLeads();
  };

  const handleOpenNotes = (deal: Deal) => {
    setSelectedDeal(deal);
    setNotesDialogOpen(true);
  };

  const handleNavigateToLead = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };

  const handleDeleteDeal = async (dealId: string, leadId?: string) => {
    try {
      const idToDelete = leadId || dealId;

      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", idToDelete);

      if (error) {
        console.error("Database deletion error:", error);
        throw error;
      }

      setPipelines((prevPipelines) =>
        prevPipelines.map((pipeline) => ({
          ...pipeline,
          stages: pipeline.stages.map((stage) => ({
            ...stage,
            deals: stage.deals.filter((deal) => deal.id !== dealId),
          })),
        }))
      );

      toast({
        title: "Deal Deleted",
        description: "The deal has been permanently removed",
      });
    } catch (error: any) {
      console.error("Error deleting deal:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete the deal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Apply filters: search + deal filter
  const filteredPipeline = useMemo(() => {
    if (!currentPipeline) return currentPipeline;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      ...currentPipeline,
      stages: currentPipeline.stages.map((stage) => {
        const isWon = isWonStageName(stage.name);

        let deals = stage.deals;

        // Apply deal filter
        if (dealFilter === "active" && isWon) {
          deals = [];
        } else if (dealFilter === "closed" && !isWon) {
          deals = [];
        } else if (dealFilter === "this-month") {
          deals = deals.filter(d => {
            if (!d.rawCloseDate) return false;
            const cd = new Date(d.rawCloseDate);
            return cd.getMonth() === currentMonth && cd.getFullYear() === currentYear;
          });
        } else if (dealFilter === "this-year") {
          deals = deals.filter(d => {
            if (!d.rawCloseDate) return false;
            const cd = new Date(d.rawCloseDate);
            return cd.getFullYear() === currentYear;
          });
        }

        // Apply search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          deals = deals.filter(
            (deal) =>
              deal.client.toLowerCase().includes(q) ||
              deal.agent.toLowerCase().includes(q) ||
              (deal.propertyAddress || "").toLowerCase().includes(q)
          );
        }

        return { ...stage, deals };
      }),
    };
  }, [currentPipeline, searchQuery, dealFilter]);

  const displayPipeline = filteredPipeline || currentPipeline || {
    id: "",
    name: "Loading...",
    stages: [],
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {displayPipeline.name}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Select value={dealFilter} onValueChange={setDealFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deals</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="closed">Closed/Won Only</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPipeline} onValueChange={handleSelectPipeline}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PipelineManager
              pipelines={pipelines}
              onUpdate={handlePipelinesUpdate}
              currentPipelineId={selectedPipeline}
              onSelectPipeline={handleSelectPipeline}
            />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap gap-6 p-4 rounded-lg bg-muted/30">
          {role === 'supreme_admin' && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pipeline Value</p>
                  <p className="text-lg font-bold">${analytics.totalValue.toLocaleString()}</p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-12" />
            </>
          )}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-bold">{analytics.activeDeals}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-12" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Closed</p>
              <p className="text-lg font-bold">{analytics.closedDeals}</p>
            </div>
          </div>
          {role === 'supreme_admin' && (
            <>
              <Separator orientation="vertical" className="h-12" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                  <p className="text-lg font-bold">${Math.round(analytics.avgDealSize).toLocaleString()}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pipeline Stages */}
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {displayPipeline.stages.map((stage) => {
            const stageValue = stage.deals.reduce((sum, deal) => sum + deal.commission, 0);
            const isCollapsed = collapsedStages.has(stage.id);
            
            if (isCollapsed) {
              return (
                <div key={stage.id} className="flex-shrink-0 w-[80px]">
                  <DroppableStage stage={stage}>
                    <div 
                      className="bg-muted/40 rounded-lg p-3 cursor-pointer hover:bg-muted/60 transition-colors h-full"
                      onClick={() => toggleStageCollapse(stage.id)}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-xs text-foreground [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                          {stage.name}
                        </h3>
                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                          {stage.deals.length}
                        </Badge>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          ${(stageValue / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                  </DroppableStage>
                </div>
              );
            }

            return (
              <div key={stage.id} className="flex-shrink-0 w-[320px]">
                <DroppableStage stage={stage}>
                  <div className="bg-muted/40 rounded-lg p-3 space-y-3">
                    {/* Stage Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStageCollapse(stage.id)}
                          className="p-0.5 rounded hover:bg-muted transition-colors"
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                          {stage.deals.length}
                        </Badge>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        ${(stageValue / 1000).toFixed(0)}k
                      </span>
                    </div>

                    {/* Deals Container */}
                    <SortableContext
                      id={stage.id}
                      items={stage.deals.map((deal) => `deal-${deal.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 min-h-[500px]">
                        {stage.deals.map((deal) => (
                          <DraggableDeal 
                            key={deal.id} 
                            deal={deal} 
                            onOpenNotes={handleOpenNotes}
                            onNavigate={handleNavigateToLead}
                            onEdit={(leadId) => {
                              setSelectedDealLeadId(leadId);
                              setEditDialogOpen(true);
                            }}
                            onDelete={handleDeleteDeal}
                          />
                        ))}

                        {stage.deals.length === 0 && (
                          <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-background/50">
                            <p className="text-xs text-muted-foreground">Drop deals here</p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                </DroppableStage>
              </div>
            );
            })}
          </div>

          <DragOverlay>
          {activeDeal ? (
            <div className="pointer-events-none bg-background rounded-lg p-3 border-2 border-primary shadow-lg w-[320px]">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-foreground">
                    {activeDeal.client || 'Unknown Client'}
                  </h4>
                  <Badge className={priorityColors[activeDeal.priority]} variant="secondary">
                    {activeDeal.priority}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>Agent: {activeDeal.agent || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <DollarSign className="h-3 w-3" />
                      <span>${(activeDeal.commission || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{activeDeal.closeDate || 'TBD'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          </DragOverlay>
        </DndContext>

        <DealNotesDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          deal={selectedDeal}
        />

        <EditDealDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          leadId={selectedDealLeadId}
          onSave={fetchDeals}
        />

        <OfferMadeValidationDialog
          open={validationDialogOpen}
          onOpenChange={setValidationDialogOpen}
          leadId={selectedDealLeadId}
          onComplete={() => {
            if (pendingStageChange) {
              performStageChange(pendingStageChange.dealId, pendingStageChange.stage);
              setPendingStageChange(null);
            }
          }}
        />

        <DealClosedDialog
          open={commissionDialogOpen}
          onOpenChange={(open) => {
            setCommissionDialogOpen(open);
            if (!open) {
              stageChangeGuardRef.current = false;
              fetchPipelinesAndLeads();
            }
          }}
          leadId={commissionLeadId}
          leadName={commissionLeadName}
          stageName={commissionStageName}
          pipelineName={commissionPipelineName}
          onSuccess={fetchDeals}
        />
      </div>
    </div>
  );
};

export default Pipelines;
