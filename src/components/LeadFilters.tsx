import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const KC_METRO_AREAS = [
  "Kansas City, MO",
  "Kansas City, KS",
  "Independence, MO",
  "Blue Springs, MO",
  "Lee's Summit, MO",
  "Raytown, MO",
  "Grandview, MO",
  "Belton, MO",
  "Pleasant Hill, MO",
  "Pleasant Valley, MO",
  "North Kansas City, MO",
  "Gladstone, MO",
  "Parkville, MO",
  "Liberty, MO",
  "Platte City, MO",
  "Smithville, MO",
  "Kearney, MO",
  "Overland Park, KS",
  "Leawood, KS",
  "Lenexa, KS",
  "Shawnee, KS",
  "Edwardsville, KS",
  "Bonner Springs, KS",
  "Gardner, KS",
];

const DOWN_PAYMENT_RANGES = [
  { label: "Under $5,000", value: "under-5k" },
  { label: "$5,000 - $10,000", value: "5k-10k" },
  { label: "$10,000 - $15,000", value: "10k-15k" },
  { label: "$15,000 - $20,000", value: "15k-20k" },
  { label: "$20,000 - $30,000", value: "20k-30k" },
  { label: "$30,000 - $50,000", value: "30k-50k" },
  { label: "$50,000 - $100,000", value: "50k-100k" },
  { label: "$100,000+", value: "100k-plus" },
];

interface LeadFiltersProps {
  showMyLeadsOnly: boolean;
  onShowMyLeadsOnlyChange: (value: boolean) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  assignedToFilter: string;
  onAssignedToFilterChange: (value: string) => void;
  transactionTypeFilter: string;
  onTransactionTypeFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  createdByFilter: string;
  onCreatedByFilterChange: (value: string) => void;
  areaFilter: string;
  onAreaFilterChange: (value: string) => void;
  downPaymentFilter: string;
  onDownPaymentFilterChange: (value: string) => void;
  archiveFilter: string;
  onArchiveFilterChange: (value: string) => void;
  contactStatusFilter: string;
  onContactStatusFilterChange: (value: string) => void;
  availableUsers: Array<{ id: string; name: string }>;
  transactionTypes: string[];
  createdByOptions: string[];
}

export const LeadFilters = ({
  showMyLeadsOnly,
  onShowMyLeadsOnlyChange,
  statusFilter,
  onStatusFilterChange,
  assignedToFilter,
  onAssignedToFilterChange,
  transactionTypeFilter,
  onTransactionTypeFilterChange,
  dateFilter,
  onDateFilterChange,
  createdByFilter,
  onCreatedByFilterChange,
  areaFilter,
  onAreaFilterChange,
  downPaymentFilter,
  onDownPaymentFilterChange,
  archiveFilter,
  onArchiveFilterChange,
  contactStatusFilter,
  onContactStatusFilterChange,
  availableUsers,
  transactionTypes,
  createdByOptions,
}: LeadFiltersProps) => {
  const activeFilterCount = [
    showMyLeadsOnly,
    statusFilter !== "all",
    assignedToFilter !== "all",
    transactionTypeFilter !== "all",
    dateFilter !== "all",
    createdByFilter !== "all",
    areaFilter !== "all",
    downPaymentFilter !== "all",
    archiveFilter !== "active",
    contactStatusFilter !== "all",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onShowMyLeadsOnlyChange(false);
    onStatusFilterChange("all");
    onAssignedToFilterChange("all");
    onTransactionTypeFilterChange("all");
    onDateFilterChange("all");
    onCreatedByFilterChange("all");
    onAreaFilterChange("all");
    onDownPaymentFilterChange("all");
    onArchiveFilterChange("active");
    onContactStatusFilterChange("all");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Ownership filter */}
      <Select
        value={showMyLeadsOnly ? "my-leads" : "all-leads"}
        onValueChange={(value) => onShowMyLeadsOnlyChange(value === "my-leads")}
      >
        <SelectTrigger className="w-[140px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-leads">All Leads</SelectItem>
          <SelectItem value="my-leads">My Leads</SelectItem>
        </SelectContent>
      </Select>

      {/* Advanced filters popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">Filters</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs gap-1">
                  <X className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned To</label>
              <Select value={assignedToFilter} onValueChange={onAssignedToFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Team Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.name}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction Type</label>
              <Select value={transactionTypeFilter} onValueChange={onTransactionTypeFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
              <Select value={dateFilter} onValueChange={onDateFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="most-recent">Most Recent (7 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Created By */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created By</label>
              <Select value={createdByFilter} onValueChange={onCreatedByFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {createdByOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area of Interest */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Area of Interest</label>
              <Select value={areaFilter} onValueChange={onAreaFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">All Areas</SelectItem>
                  {KC_METRO_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Down Payment Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Down Payment Range</label>
              <Select value={downPaymentFilter} onValueChange={onDownPaymentFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Ranges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ranges</SelectItem>
                  {DOWN_PAYMENT_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Archive Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Archive Status</label>
              <Select value={archiveFilter} onValueChange={onArchiveFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Status</label>
              <Select value={contactStatusFilter} onValueChange={onContactStatusFilterChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="uncontacted">Uncontacted</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {statusFilter !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onStatusFilterChange("all")}>
          Status: {statusFilter} <X className="h-3 w-3" />
        </Badge>
      )}
      {assignedToFilter !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onAssignedToFilterChange("all")}>
          Assigned: {assignedToFilter === "unassigned" ? "Unassigned" : assignedToFilter} <X className="h-3 w-3" />
        </Badge>
      )}
      {transactionTypeFilter !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer capitalize" onClick={() => onTransactionTypeFilterChange("all")}>
          Type: {transactionTypeFilter} <X className="h-3 w-3" />
        </Badge>
      )}
      {dateFilter !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onDateFilterChange("all")}>
          Date: {dateFilter.replace("-", " ")} <X className="h-3 w-3" />
        </Badge>
      )}
      {createdByFilter !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onCreatedByFilterChange("all")}>
          By: {createdByFilter} <X className="h-3 w-3" />
        </Badge>
      )}
      {areaFilter !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onAreaFilterChange("all")}>
          Area: {areaFilter} <X className="h-3 w-3" />
        </Badge>
      )}
      {downPaymentFilter !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onDownPaymentFilterChange("all")}>
          Down Payment: {DOWN_PAYMENT_RANGES.find(r => r.value === downPaymentFilter)?.label} <X className="h-3 w-3" />
        </Badge>
      )}
      {archiveFilter !== "active" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onArchiveFilterChange("active")}>
          {archiveFilter === "archived" ? "Showing: Archived" : "Showing: All"} <X className="h-3 w-3" />
        </Badge>
      )}
      {contactStatusFilter !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onContactStatusFilterChange("all")}>
          {contactStatusFilter === "uncontacted" ? "Uncontacted" : "Contacted"} <X className="h-3 w-3" />
        </Badge>
      )}
    </div>
  );
};
