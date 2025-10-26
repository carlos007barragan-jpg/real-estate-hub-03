import { useState, useMemo, useEffect } from "react";
import { Building2, DollarSign, Calendar, TrendingUp, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PipelineManager } from "@/components/PipelineManager";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
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
  title: string;
  client: string;
  value: number;
  date: string;
  priority: "high" | "medium" | "low";
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
            title: "Downtown Condo Sale",
            client: "Sarah Johnson",
            value: 450000,
            date: "Jan 15",
            priority: "high",
          },
          {
            id: "2",
            title: "Suburban Home",
            client: "David Kim",
            value: 380000,
            date: "Jan 12",
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
            title: "Luxury Apartment",
            client: "Michael Chen",
            value: 650000,
            date: "Jan 14",
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
            title: "Family House",
            client: "Emily Rodriguez",
            value: 520000,
            date: "Jan 13",
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
            title: "Office Space Downtown",
            client: "Tech Corp Inc",
            value: 1200000,
            date: "Jan 10",
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border-l-4 border-l-primary"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-foreground line-clamp-2">{deal.title}</h3>
          <Badge className={priorityColors[deal.priority]} variant="secondary">
            {deal.priority}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{deal.client}</span>
          </div>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <DollarSign className="h-3 w-3" />
            <span>${deal.value.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{deal.date}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

const Pipelines = () => {
  const [selectedPipeline, setSelectedPipeline] = useState<string>("real-estate");
  const [pipelines, setPipelines] = useState<Pipeline[]>(() => {
    const stored = localStorage.getItem("crm-pipelines");
    return stored ? JSON.parse(stored) : mockPipelines;
  });
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

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
    const totalValue = allDeals.reduce((sum, deal) => sum + deal.value, 0);
    const totalDeals = allDeals.length;
    const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;

    return { totalValue, totalDeals, avgDealSize };
  }, [currentPipeline]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deal = currentPipeline?.stages
      .flatMap((stage) => stage.deals)
      .find((d) => d.id === active.id);
    setActiveDeal(deal || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which stage contains the active deal
    const activeStage = currentPipeline?.stages.find((stage) =>
      stage.deals.some((deal) => deal.id === activeId)
    );

    // Find which stage the deal is being dragged over
    let overStage = currentPipeline?.stages.find((stage) => stage.id === overId);
    if (!overStage) {
      overStage = currentPipeline?.stages.find((stage) =>
        stage.deals.some((deal) => deal.id === overId)
      );
    }

    if (!activeStage || !overStage || activeStage.id === overStage.id) return;

    setPipelines((prevPipelines) =>
      prevPipelines.map((pipeline) => {
        if (pipeline.id !== selectedPipeline) return pipeline;

        const newStages = pipeline.stages.map((stage) => {
          if (stage.id === activeStage.id) {
            return {
              ...stage,
              deals: stage.deals.filter((deal) => deal.id !== activeId),
            };
          }
          if (stage.id === overStage.id) {
            const activeDeal = activeStage.deals.find((deal) => deal.id === activeId);
            if (!activeDeal) return stage;
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

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
  };

  if (!currentPipeline) return null;

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track deals through your sales process</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="w-[250px]">
              <Layers className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select pipeline" />
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

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                ${analytics.totalValue.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                {analytics.totalDeals}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Deal Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                ${Math.round(analytics.avgDealSize).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentPipeline.stages.map((stage) => {
            const stageValue = stage.deals.reduce((sum, deal) => sum + deal.value, 0);
            
            return (
              <div key={stage.id} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">{stage.name}</h2>
                    <Badge variant="secondary" className="bg-muted">
                      {stage.deals.length}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${stageValue.toLocaleString()}
                  </div>
                </div>

                <SortableContext
                  items={stage.deals.map((deal) => deal.id)}
                  strategy={verticalListSortingStrategy}
                  id={stage.id}
                >
                  <div className="space-y-3 min-h-[200px] p-3 rounded-lg bg-muted/20 border-2 border-dashed">
                    {stage.deals.map((deal) => (
                      <DraggableDeal key={deal.id} deal={deal} />
                    ))}

                    {stage.deals.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Drop deals here
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <Card className="p-4 border-l-4 border-l-primary shadow-lg">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground line-clamp-2">
                    {activeDeal.title}
                  </h3>
                  <Badge className={priorityColors[activeDeal.priority]} variant="secondary">
                    {activeDeal.priority}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{activeDeal.client}</span>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <DollarSign className="h-3 w-3" />
                    <span>${activeDeal.value.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{activeDeal.date}</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Pipelines;
