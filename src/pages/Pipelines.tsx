import { Building2, DollarSign, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Deal {
  id: string;
  title: string;
  client: string;
  value: string;
  date: string;
  priority: "high" | "medium" | "low";
}

interface Stage {
  id: string;
  name: string;
  deals: Deal[];
}

const mockStages: Stage[] = [
  {
    id: "1",
    name: "New Opportunities",
    deals: [
      {
        id: "1",
        title: "Downtown Condo Sale",
        client: "Sarah Johnson",
        value: "$450,000",
        date: "Jan 15",
        priority: "high",
      },
      {
        id: "2",
        title: "Suburban Home",
        client: "David Kim",
        value: "$380,000",
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
        value: "$650,000",
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
        value: "$520,000",
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
];

const priorityColors = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};

const Pipelines = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Pipeline</h1>
        <p className="text-muted-foreground mt-1">Track deals through your sales process</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStages.map((stage) => (
          <div key={stage.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{stage.name}</h2>
              <Badge variant="secondary" className="bg-muted">
                {stage.deals.length}
              </Badge>
            </div>

            <div className="space-y-3">
              {stage.deals.map((deal) => (
                <Card
                  key={deal.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary"
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
                        <span>{deal.value}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{deal.date}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {stage.deals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  No deals in this stage
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pipelines;
