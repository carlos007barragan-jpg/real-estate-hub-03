import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface TeamMember {
  user_id: string;
  name: string;
  phone: string | null;
}

interface MultiAgentSelectProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiAgentSelect({
  selectedIds,
  onSelectionChange,
  placeholder = "Select team members...",
  disabled = false,
}: MultiAgentSelectProps) {
  const [open, setOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) return;

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone_number")
        .eq("organization_id", profile.organization_id);

      if (error) throw error;

      const members = (profiles || []).map((p) => ({
        user_id: p.user_id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown",
        phone: p.phone_number,
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  const removeSelection = (userId: string) => {
    onSelectionChange(selectedIds.filter((id) => id !== userId));
  };

  const selectedMembers = teamMembers.filter((m) => selectedIds.includes(m.user_id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {selectedIds.length === 0
              ? placeholder
              : `${selectedIds.length} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
          <Command>
            <CommandInput placeholder="Search team members..." />
            <CommandList>
              <CommandEmpty>No team members found.</CommandEmpty>
              <CommandGroup>
                {teamMembers.map((member) => (
                  <CommandItem
                    key={member.user_id}
                    value={member.name}
                    onSelect={() => toggleSelection(member.user_id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(member.user_id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{member.name}</span>
                      {member.phone && (
                        <span className="text-xs text-muted-foreground">
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMembers.map((member) => (
            <Badge
              key={member.user_id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {member.name}
              <button
                type="button"
                onClick={() => removeSelection(member.user_id)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}