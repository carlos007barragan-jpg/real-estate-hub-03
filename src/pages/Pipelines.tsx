import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, DollarSign, Calendar, TrendingUp, Layers, Plus, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PipelineManager } from "@/components/PipelineManager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DndContext,
  DragOverlay,
  rectIntersection,
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
        name: "New Opportunities",
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
        name: "Viewing Scheduled",
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
        id: "3",
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
        id: "4",
        name: "Closing",
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
        name: "Lead",
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
        name: "Negotiation",
        deals: [],
      },
      {
        id: "3",
        name: "Contract",
        deals: [],
      },
      {
        id: "4",
        name: "Closed",
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

function DraggableDeal({ deal }: { deal: Deal }) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `deal-${deal.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (deal.leadId) {
      e.stopPropagation();
      navigate(`/leads/${deal.leadId}`);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="bg-background rounded-lg p-3 border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-foreground leading-tight">
            {deal.client || 'Unknown Client'}
          </h4>
          <Badge 
            className={`${priorityColors[deal.priority]} text-[10px] h-4 px-1.5`} 
            variant="secondary"
          >
            {deal.priority}
          </Badge>
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
  const [selectedPipeline, setSelectedPipeline] = useState<string>("real-estate");
  const [pipelines, setPipelines] = useState<Pipeline[]>(() => {
    // Force clear old data structure
    const stored = localStorage.getItem("crm-pipelines");
    if (stored) {
      try {
        const parsedPipelines = JSON.parse(stored);
        // Check if any deal has the old structure
        const hasOldStructure = parsedPipelines.some((pipeline: any) =>
          pipeline.stages?.some((stage: any) =>
            stage.deals?.some((deal: any) => 
              'title' in deal || 'value' in deal || 'date' in deal || 
              !('commission' in deal) || !('agent' in deal) || !('closeDate' in deal)
            )
          )
        );
        
        if (hasOldStructure) {
          console.log('Old data structure detected, resetting to new structure');
          localStorage.removeItem("crm-pipelines");
          return mockPipelines;
        }
        return parsedPipelines;
      } catch (error) {
        console.error('Error parsing pipelines:', error);
        localStorage.removeItem("crm-pipelines");
        return mockPipelines;
      }
    }
    return mockPipelines;
  });
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Persist pipelines to localStorage
  useEffect(() => {
    localStorage.setItem("crm-pipelines", JSON.stringify(pipelines));
  }, [pipelines]);

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

  const handleDragEnd = (event: DragEndEvent) => {
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

    // Move the deal to the new stage
    setPipelines((prevPipelines) =>
      prevPipelines.map((pipeline) => {
        if (pipeline.id !== selectedPipeline) return pipeline;

        const activeDeal = activeStage.deals.find((deal) => deal.id === draggedDealId);
        if (!activeDeal) return pipeline;

        const newStages = pipeline.stages.map((stage) => {
          if (stage.id === activeStage.id) {
            // Remove from source stage
            return {
              ...stage,
              deals: stage.deals.filter((deal) => deal.id !== draggedDealId),
            };
          }
          if (stage.id === overStage!.id) {
            // Add to target stage
            return {
              ...stage,
              deals: [...stage.deals, activeDeal],
            };
          }
          return stage;
        });

        return { ...pipeline, stages: newStages };
      })
    );
  };

  if (!currentPipeline) return null;

  const filteredPipeline = searchQuery
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
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
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
              onUpdate={setPipelines}
              currentPipelineId={selectedPipeline}
              onSelectPipeline={setSelectedPipeline}
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
          collisionDetection={rectIntersection}
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
                          <DraggableDeal key={deal.id} deal={deal} />
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
      </div>
    </div>
  );
};

export default Pipelines;
