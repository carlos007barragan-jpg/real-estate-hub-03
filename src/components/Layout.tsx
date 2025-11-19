import { Building2, LayoutDashboard, Users, Layers, Phone, Settings, LogOut, PhoneIncoming, CalendarDays, Package, Shield, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GlobalCallManager } from "@/components/GlobalCallManager";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

const baseNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "New Leads", url: "/new-leads", icon: PhoneIncoming },
  { title: "Pipelines", url: "/pipelines", icon: Layers },
  { title: "Contacts", url: "/contacts", icon: Phone },
  { title: "Inventory", url: "/inventory", icon: Package },
];

const adminNavItems = [
  { title: "User Management", url: "/settings/users", icon: Shield, adminOnly: true },
];

const settingsNavItem = { title: "Settings", url: "/settings", icon: Settings };

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? adminNavItems : []),
    settingsNavItem
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-background pb-20 md:pb-0">
      <GlobalCallManager />
      
      {/* Desktop Header Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-primary shadow-md hidden md:block">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center gap-2 mr-6">
            <Building2 className="h-6 w-6 text-primary-foreground" />
            <h1 className="text-lg font-bold text-primary-foreground">RealEstate CRM</h1>
          </div>

          <Separator orientation="vertical" className="h-8 mr-4 bg-primary-foreground/20" />

          <nav className="flex items-center gap-1 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-primary-foreground text-primary"
                      : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>

          <NotificationBell />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className="ml-2 gap-2 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="ml-2 gap-2 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-primary shadow-md md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-base font-bold text-primary-foreground">RE CRM</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="gap-2 text-primary-foreground/80 hover:bg-primary-foreground/10"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-primary-foreground/80 hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-lg md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
