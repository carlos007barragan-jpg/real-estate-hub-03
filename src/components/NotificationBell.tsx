import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  user_role?: string;
  event_type?: string;
  entity_type?: string;
}

// Define which event types each role can see
const ROLE_EVENT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'lead_created', 'lead_assigned', 'pipeline_movement', 'task_created', 
    'task_completed', 'deal_closed', 'property_update', 'wholesale_submission',
    'property_inquiry', 'appointment_created', 'appointment_reminder',
    'missed_call', 'inventory_update'
  ],
  agent: [
    'lead_assigned', 'pipeline_movement', 'task_assigned', 'task_reminder',
    'deal_closed', 'appointment_created', 'appointment_reminder', 'missed_call'
  ],
  marketing_manager: [
    'property_update', 'wholesale_submission', 'task_assigned', 'task_reminder',
    'inventory_update'
  ],
  marketing: [
    'property_update', 'wholesale_submission', 'task_assigned', 'task_reminder',
    'inventory_update'
  ],
  owner_user: [
    'property_update', 'property_approved', 'property_rejected'
  ]
};

// Legacy type mapping for backwards compatibility
const LEGACY_TYPE_MAPPING: Record<string, string[]> = {
  admin: ['pipeline', 'task', 'call', 'message', 'property_update', 'wholesale_submission', 'property_inquiry'],
  agent: ['pipeline', 'task', 'call', 'message'],
  marketing_manager: ['property_update', 'wholesale_submission'],
  marketing: ['property_update', 'wholesale_submission'],
  owner_user: ['property_update']
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  const fetchNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', session.user.id)
        .single();

      const userOrgId = profile?.organization_id;

      // Fetch notifications for this user
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Filter by organization
      if (userOrgId) {
        query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter notifications based on user role
      const filteredData = filterNotificationsByRole(data || [], role);

      setNotifications(
        filteredData.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          description: n.description,
          timestamp: new Date(n.created_at),
          read: n.read,
          link: n.link,
          user_role: n.user_role,
          event_type: n.event_type,
          entity_type: n.entity_type,
        }))
      );
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  const filterNotificationsByRole = (notifications: any[], userRole: string | null): any[] => {
    if (!userRole) return [];
    
    // Admin sees everything
    if (userRole === 'admin') return notifications;

    const allowedEventTypes = ROLE_EVENT_PERMISSIONS[userRole] || [];
    const allowedLegacyTypes = LEGACY_TYPE_MAPPING[userRole] || [];

    return notifications.filter(n => {
      // If notification has user_role set, check if it matches or is for this role
      if (n.user_role && n.user_role !== userRole && n.user_role !== 'all') {
        return false;
      }

      // Check event_type if present (new system)
      if (n.event_type) {
        return allowedEventTypes.includes(n.event_type);
      }

      // Fallback to legacy type checking
      return allowedLegacyTypes.includes(n.type);
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error: any) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "pipeline":
      case "pipeline_movement":
        return "📊";
      case "task":
      case "task_created":
      case "task_assigned":
        return "✓";
      case "call":
      case "missed_call":
        return "📞";
      case "message":
        return "💬";
      case "property_update":
      case "wholesale_submission":
      case "inventory_update":
        return "🏠";
      case "property_inquiry":
        return "📝";
      case "appointment_created":
      case "appointment_reminder":
        return "📅";
      case "deal_closed":
        return "🎉";
      default:
        return "🔔";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg mt-0.5">
                    {getNotificationIcon(notification.event_type || notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
