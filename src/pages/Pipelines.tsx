import { useState, useMemo, useEffect } from "react";
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
      className="group p-4 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing border-l-4 border-l-primary bg-card hover:scale-[1.02]"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {deal.title}
          </h3>
          <Badge className={priorityColors[deal.priority]} variant="secondary">
            {deal.priority}
          </Badge>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{deal.client}</span>
          </div>
          <div className="flex items-center gap-2 text-primary font-bold">
            <DollarSign className="h-4 w-4 flex-shrink-0" />
            <span>${deal.value.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
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

  const filteredPipeline = searchQuery
    ? {
        ...currentPipeline,
        stages: currentPipeline.stages.map((stage) => ({
          ...stage,
          deals: stage.deals.filter(
            (deal) =>
              deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              deal.client.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        })),
      }
    : currentPipeline;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header Section */}
      <div className="bg-background border-b">
        <div className="container mx-auto p-6 md:p-8 space-y-6">
          {/* Title and Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Sales Pipeline
              </h1>
              <p className="text-muted-foreground">
                Track and manage deals through your sales process
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger className="w-[200px] md:w-[250px]">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide font-medium">
                  Total Pipeline Value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold text-foreground">
                    ${analytics.totalValue.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide font-medium">
                  Active Deals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <span className="text-3xl font-bold text-foreground">
                    {analytics.totalDeals}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-info hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide font-medium">
                  Average Deal Size
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <DollarSign className="h-5 w-5 text-info" />
                  <span className="text-3xl font-bold text-foreground">
                    ${Math.round(analytics.avgDealSize).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals by title or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="container mx-auto p-6 md:p-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {filteredPipeline.stages.map((stage) => {
            const stageValue = stage.deals.reduce((sum, deal) => sum + deal.value, 0);
            
            return (
              <Card key={stage.id} className="flex flex-col border-t-4 border-t-primary/20 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      {stage.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold">
                      {stage.deals.length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="font-semibold text-foreground">
                      ${stageValue.toLocaleString()}
                    </span>
                  </div>
                  <Separator className="mt-3" />
                </CardHeader>

                <CardContent className="flex-1 pt-0">
                  <SortableContext
                    items={stage.deals.map((deal) => deal.id)}
                    strategy={verticalListSortingStrategy}
                    id={stage.id}
                  >
                    <div className="space-y-3 min-h-[300px] p-4 rounded-lg bg-muted/30 border-2 border-dashed border-muted-foreground/20">
                      {stage.deals.map((deal) => (
                        <DraggableDeal key={deal.id} deal={deal} />
                      ))}

                      {stage.deals.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-[200px] text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              No deals yet
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Drag deals here or create new ones
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
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
    </div>
  );
};

export default Pipelines;
