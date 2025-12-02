import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, DollarSign, Calendar, TrendingUp, Layers, Plus, Filter, Search, MessageSquare, GripVertical, MoreVertical, Trash2, Edit } from "lucide-react";
import { EditDealDialog } from "@/components/EditDealDialog";
import { OfferMadeValidationDialog } from "@/components/OfferMadeValidationDialog";
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

const mockPipelines: Pipeline[] = [
  {
    id: "real-estate",
    name: "Real Estate Sales",
    stages: [
      {
        id: "1",
        name: "New Lead",
        deals: [
          {
            id: "1",
            client: "Sarah Johnson",
            agent: "Mike Davis",
            commission: 13500,
            closeDate: "Jan 30, 2025",
            priority: "high",
          },
          {
            id: "2",
            client: "David Kim",
            agent: "Lisa Chen",
            commission: 11400,
            closeDate: "Feb 5, 2025",
            priority: "medium",
          },
        ],
      },
      {
        id: "2",
        name: "Contacted",
        deals: [],
      },
      {
        id: "3",
        name: "Qualified",
        deals: [],
      },
      {
        id: "4",
        name: "Showing Scheduled",
        deals: [
          {
            id: "3",
            client: "Michael Chen",
            agent: "Mike Davis",
            commission: 19500,
            closeDate: "Jan 28, 2025",
            priority: "high",
          },
        ],
      },
      {
        id: "5",
        name: "Offer Made",
        deals: [
          {
            id: "4",
            client: "Emily Rodriguez",
            agent: "Sarah Park",
            commission: 15600,
            closeDate: "Feb 10, 2025",
            priority: "medium",
          },
        ],
      },
      {
        id: "6",
        name: "Under Contract",
        deals: [],
      },
      {
        id: "7",
        name: "Closed Won",
        deals: [],
      },
      {
        id: "8",
        name: "Closed Lost",
        deals: [],
      },
    ],
  },
  {
    id: "commercial",
    name: "Commercial Properties",
    stages: [
      {
        id: "1",
        name: "New Lead",
        deals: [
          {
            id: "5",
            client: "Tech Corp Inc",
            agent: "James Wilson",
            commission: 36000,
            closeDate: "Feb 15, 2025",
            priority: "high",
          },
        ],
      },
      {
        id: "2",
        name: "Contacted",
        deals: [],
      },
      {
        id: "3",
        name: "Qualified",
        deals: [],
      },
      {
        id: "4",
        name: "Showing Scheduled",
        deals: [],
      },
      {
        id: "5",
        name: "Offer Made",
        deals: [],
      },
      {
        id: "6",
        name: "Under Contract",
        deals: [],
      },
      {
        id: "7",
        name: "Closed Won",
        deals: [],
      },
      {
        id: "8",
        name: "Closed Lost",
        deals: [],
      },
    ],
  },
];

const priorityColors = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};

function DraggableDeal({ deal, onOpenNotes, onPriorityChange, onNavigate, onEdit, onDelete }: { 
  deal: Deal; 
  onOpenNotes: (deal: Deal) => void;
  onPriorityChange: (dealId: string, priority: "high" | "medium" | "low") => void;
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

  const handlePriorityChange = (newPriority: "high" | "medium" | "low") => {
    onPriorityChange(deal.id, newPriority);
    toast({
      title: "Priority Updated",
      description: `Deal priority changed to ${newPriority}`,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-background rounded-lg border hover:border-primary/50 hover:shadow-md transition-all flex gap-2"
    >
      {/* Drag Handle */}
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

      {/* Clickable Card Content */}
      <div
        onClick={handleCardClick}
        className="flex-1 p-3 cursor-pointer"
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-foreground leading-tight">
              {deal.client || 'Unknown Client'}
            </h4>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Badge 
                    className={`${priorityColors[deal.priority]} text-[10px] h-4 px-1.5 cursor-pointer hover:opacity-80 transition-opacity`} 
                    variant="secondary"
                  >
                    {deal.priority}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="z-50 bg-popover">
                  <DropdownMenuItem onClick={() => handlePriorityChange("high")}>
                    <Badge className={`${priorityColors.high} mr-2`} variant="secondary">high</Badge>
                    High Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePriorityChange("medium")}>
                    <Badge className={`${priorityColors.medium} mr-2`} variant="secondary">medium</Badge>
                    Medium Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePriorityChange("low")}>
                    <Badge className={`${priorityColors.low} mr-2`} variant="secondary">low</Badge>
                    Low Priority
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <Building2 className="h-3 w-3 flex-shrink-0" />
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
      className={`space-y-2 min-h-[500px] rounded-lg transition-colors ${
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
    // Restore selected pipeline from localStorage
    return localStorage.getItem("selectedPipelineId") || "";
  });
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  
  // Persist selected pipeline to localStorage
  const handleSelectPipeline = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    localStorage.setItem("selectedPipelineId", pipelineId);
  };
  const [pipelinesLoaded, setPipelinesLoaded] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [selectedDealLeadId, setSelectedDealLeadId] = useState<string | undefined>();
  const [pendingStageChange, setPendingStageChange] = useState<{ dealId: string; stage: string } | null>(null);
  const [pipelineManagerOpen, setPipelineManagerOpen] = useState(false);
  const { toast } = useToast();

  // Fetch pipelines from database
  const fetchPipelines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userProfile?.organization_id) return;

      const { data: dbPipelines, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (!dbPipelines || dbPipelines.length === 0) {
        // Create default pipelines if none exist
        const defaultPipelines = mockPipelines.map((mp, index) => ({
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

        const pipelinesWithDeals = (created || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          stages: (p.stages as any[]).map(s => ({ ...s, deals: [] })),
        }));

        setPipelines(pipelinesWithDeals);
        if (pipelinesWithDeals.length > 0) {
          handleSelectPipeline(pipelinesWithDeals[0].id);
        }
      } else {
        const pipelinesWithDeals = dbPipelines.map((p: any) => ({
          id: p.id,
          name: p.name,
          stages: (p.stages as any[]).map(s => ({ ...s, deals: [] })),
        }));

        setPipelines(pipelinesWithDeals);
        // Always ensure selectedPipeline is valid - check if current selection exists in loaded pipelines
        const pipelineIds = pipelinesWithDeals.map(p => p.id);
        if (!selectedPipeline || !pipelineIds.includes(selectedPipeline)) {
          handleSelectPipeline(pipelinesWithDeals[0].id);
        }
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
    setPipelines(updatedPipelines);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
        toast({
          title: "Error",
          description: "Organization not found",
          variant: "destructive",
        });
        return;
      }

      // Get current pipelines from DB to identify new ones
      const { data: existingPipelines } = await supabase
        .from("pipelines")
        .select("id")
        .eq("organization_id", userProfile.organization_id);

      const existingIds = new Set((existingPipelines || []).map(p => p.id));

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

          // Update local state with real DB id
          if (newPipeline) {
            setPipelines(prev => prev.map(p => 
              p.id === pipeline.id ? { ...p, id: newPipeline.id } : p
            ));
            // Update localStorage with new ID
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
          await supabase.from("pipelines").delete().eq("id", existingId);
        }
      }

      toast({
        title: "Success",
        description: "Pipeline saved successfully",
      });
    } catch (error) {
      console.error("Error saving pipelines:", error);
      toast({
        title: "Error",
        description: "Failed to save pipeline changes. You may not have permission.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  // Fetch leads from database and sync with pipelines
  useEffect(() => {
    if (!pipelinesLoaded || pipelines.length === 0) return;

    const fetchLeads = async () => {
      try {
        const { data: leads, error } = await supabase
          .from("leads")
          .select("*")
          .not("pipeline", "is", null)
          .eq("lead_lifecycle", "Moved to Pipeline");

        if (error) throw error;

        // Transform leads into deals grouped by pipeline and stage
        const pipelineMap = new Map<string, Map<string, Deal[]>>();

        leads?.forEach((lead) => {
          const pipelineId = lead.pipeline;
          const stage = lead.pipeline_stage;

          if (!pipelineMap.has(pipelineId)) {
            pipelineMap.set(pipelineId, new Map());
          }

          const stageMap = pipelineMap.get(pipelineId)!;
          if (!stageMap.has(stage)) {
            stageMap.set(stage, []);
          }

          const deal: Deal = {
            id: lead.id,
            client: lead.name,
            agent: lead.assigned_to || "Not assigned",
            commission: parseFloat(lead.value?.replace(/[^0-9.-]+/g, "") || "0"),
            closeDate: lead.timeframe || "TBD",
            priority: lead.lead_temperature === "hot" ? "high" : lead.lead_temperature === "warm" ? "medium" : "low",
            leadId: lead.id,
          };

          stageMap.get(stage)!.push(deal);
        });

        // Update pipelines with real data
        const updatedPipelines = pipelines.map((pipeline) => {
          const pipelineDeals = pipelineMap.get(pipeline.id);

          const updatedStages = pipeline.stages.map((stage) => ({
            ...stage,
            deals: (pipelineDeals?.get(stage.name) || []),
          }));

          // Filter out locally deleted deals
          const deletedIds: string[] = JSON.parse(localStorage.getItem('deletedDealIds') || '[]');
          const filteredStages = updatedStages.map((stage) => ({
            ...stage,
            deals: stage.deals.filter((d) => !deletedIds.includes(d.id)),
          }));

          return { ...pipeline, stages: filteredStages };
        });

        setPipelines(updatedPipelines);
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    };

    fetchLeads();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("leads_pipeline_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pipelinesLoaded, pipelines.length]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const currentPipeline = pipelines.find((p) => p.id === selectedPipeline);

  const analytics = useMemo(() => {
    if (!currentPipeline) return { totalValue: 0, totalDeals: 0, avgDealSize: 0 };

    const allDeals = currentPipeline.stages.flatMap((stage) => stage.deals);
    const totalValue = allDeals.reduce((sum, deal) => sum + deal.commission, 0);
    const totalDeals = allDeals.length;
    const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;

    return { totalValue, totalDeals, avgDealSize };
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
    // Just for visual feedback during drag
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDeal(null);
    
    if (!over || !currentPipeline) return;

    const activeIdStr = String(active.id);
    const draggedDealId = activeIdStr.startsWith('deal-') ? activeIdStr.slice(5) : activeIdStr;

    const overIdStr = String(over.id);

    // Find which stage contains the active deal
    const activeStage = currentPipeline.stages.find((stage) =>
      stage.deals.some((deal) => deal.id === draggedDealId)
    );

    // Find which stage the deal is being dragged over
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
    if (activeStage.id === overStage.id) return; // Same stage, no need to move

    // If moving to "Offer Made", validate required fields
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

    // Find which stage contains the deal
    const activeStage = currentPipeline.stages.find((stage) =>
      stage.deals.some((deal) => deal.id === dealId)
    );

    // Find the target stage
    const overStage = currentPipeline.stages.find((stage) => stage.name === newStageName);

    if (!activeStage || !overStage) return;

    // Update the database
    const activeDeal = activeStage.deals.find((deal) => deal.id === dealId);
    if (activeDeal?.leadId) {
      await supabase
        .from("leads")
        .update({ pipeline_stage: overStage.name })
        .eq("id", activeDeal.leadId);
    }

    // Move the deal to the new stage
    setPipelines((prevPipelines) =>
      prevPipelines.map((pipeline) => {
        if (pipeline.id !== selectedPipeline) return pipeline;

        const deal = activeStage.deals.find((d) => d.id === dealId);
        if (!deal) return pipeline;

        const newStages = pipeline.stages.map((stage) => {
          if (stage.id === activeStage.id) {
            // Remove from source stage
            return {
              ...stage,
              deals: stage.deals.filter((d) => d.id !== dealId),
            };
          }
          if (stage.id === overStage!.id) {
            // Add to target stage
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
  };

  const fetchDeals = async () => {
    try {
      const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
        .not("pipeline", "is", null)
        .eq("lead_lifecycle", "Moved to Pipeline");

      if (error) throw error;

      // Transform leads into deals grouped by pipeline and stage
      const pipelineMap = new Map<string, Map<string, Deal[]>>();

      leads?.forEach((lead) => {
        const pipelineId = lead.pipeline;
        const stage = lead.pipeline_stage;

        if (!pipelineMap.has(pipelineId)) {
          pipelineMap.set(pipelineId, new Map());
        }

        const stageMap = pipelineMap.get(pipelineId)!;
        if (!stageMap.has(stage)) {
          stageMap.set(stage, []);
        }

        const deal: Deal = {
          id: lead.id,
          client: lead.name,
          agent: lead.assigned_to || "Not assigned",
          commission: parseFloat(lead.value?.replace(/[^0-9.-]+/g, "") || "0"),
          closeDate: lead.timeframe || "TBD",
          priority: lead.lead_temperature === "hot" ? "high" : lead.lead_temperature === "warm" ? "medium" : "low",
          leadId: lead.id,
        };

        stageMap.get(stage)!.push(deal);
      });

      // Update pipelines with real data
      const updatedPipelines = mockPipelines.map((pipeline) => {
        const pipelineDeals = pipelineMap.get(pipeline.id);

        const updatedStages = pipeline.stages.map((stage) => ({
          ...stage,
          deals: (pipelineDeals?.get(stage.name) || []),
        }));

        // Filter out locally deleted deals
        const deletedIds: string[] = JSON.parse(localStorage.getItem('deletedDealIds') || '[]');
        const filteredStages = updatedStages.map((stage) => ({
          ...stage,
          deals: stage.deals.filter((d) => !deletedIds.includes(d.id)),
        }));

        return { ...pipeline, stages: filteredStages };
      });

      setPipelines(updatedPipelines);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  const handleOpenNotes = (deal: Deal) => {
    setSelectedDeal(deal);
    setNotesDialogOpen(true);
  };

  const handleNavigateToLead = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };

  const handlePriorityChange = async (dealId: string, newPriority: "high" | "medium" | "low") => {
    // Find the deal and update in database
    const deal = currentPipeline?.stages
      .flatMap(stage => stage.deals)
      .find(d => d.id === dealId);

    if (deal?.leadId) {
      // Map priority to lead_temperature
      const temperatureMap = {
        high: "hot",
        medium: "warm",
        low: "cold"
      };

      await supabase
        .from("leads")
        .update({ lead_temperature: temperatureMap[newPriority] })
        .eq("id", deal.leadId);
    }

    // Update local state
    setPipelines((prevPipelines) =>
      prevPipelines.map((pipeline) => ({
        ...pipeline,
        stages: pipeline.stages.map((stage) => ({
          ...stage,
          deals: stage.deals.map((d) =>
            d.id === dealId ? { ...d, priority: newPriority } : d
          ),
        })),
      }))
    );
  };

  const handleDeleteDeal = async (dealId: string, leadId?: string) => {
    try {
      // In our UI, some deals may be mock/local-only (no lead in DB)
      const idToDelete = leadId || dealId;

      // Helper to detect UUIDs (leads use UUIDs). Non-UUID => local-only deal
      const isUuid = (v: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

      // If it's not a UUID, treat as a local/mock deal and just remove from UI
      if (!isUuid(idToDelete)) {
        setPipelines((prevPipelines) =>
          prevPipelines.map((pipeline) => ({
            ...pipeline,
            stages: pipeline.stages.map((stage) => ({
              ...stage,
              deals: stage.deals.filter((deal) => deal.id !== dealId),
            })),
          }))
        );

        // Persist local deletion so it doesn't reappear on refresh
        const deletedIds: string[] = JSON.parse(localStorage.getItem("deletedDealIds") || "[]");
        localStorage.setItem(
          "deletedDealIds",
          JSON.stringify(Array.from(new Set([...deletedIds, dealId])))
        );

        toast({
          title: "Deal Deleted",
          description: "The deal has been removed from the pipeline",
        });
        return;
      }

      // UUID => attempt DB deletion (these are real leads moved into pipeline)
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", idToDelete);

      if (error) {
        console.error("Database deletion error:", error);
        throw error;
      }

      // Remove from local state immediately
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

  const filteredPipeline = searchQuery && currentPipeline
    ? {
        ...currentPipeline,
        stages: currentPipeline.stages.map((stage) => ({
          ...stage,
          deals: stage.deals.filter(
            (deal) =>
              deal.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
              deal.agent.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        })),
      }
    : currentPipeline;

  // Show loading state if pipelines haven't loaded yet
  if (!currentPipeline) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading pipelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {currentPipeline.name}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
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
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Deals</p>
              <p className="text-lg font-bold">{analytics.totalDeals}</p>
            </div>
          </div>
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
          {filteredPipeline.stages.map((stage) => {
            const stageValue = stage.deals.reduce((sum, deal) => sum + deal.commission, 0);
            
            return (
              <div key={stage.id} className="flex-shrink-0 w-[320px]">
                <DroppableStage stage={stage}>
                  <div className="bg-muted/40 rounded-lg p-3 space-y-3">
                    {/* Stage Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
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
                            onPriorityChange={handlePriorityChange}
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
      </div>
    </div>
  );
};

export default Pipelines;
