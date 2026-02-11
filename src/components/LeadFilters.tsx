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
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onShowMyLeadsOnlyChange(false);
    onStatusFilterChange("all");
    onAssignedToFilterChange("all");
    onTransactionTypeFilterChange("all");
    onDateFilterChange("all");
    onCreatedByFilterChange("all");
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
    </div>
  );
};
