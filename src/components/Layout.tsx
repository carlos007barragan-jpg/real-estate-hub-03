import { Building2, LayoutDashboard, Users, Layers, Phone, Settings, Inbox as InboxIcon, PhoneCall, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Pipelines", url: "/pipelines", icon: Layers },
  { title: "Contacts", url: "/contacts", icon: Phone },
  { title: "Inbox", url: "/inbox", icon: InboxIcon },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Horizontal Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-primary shadow-md">
        <div className="flex h-16 items-center px-4 md:px-6">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 mr-6">
            <Building2 className="h-6 w-6 text-primary-foreground" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-primary-foreground">RealEstate CRM</h1>
            </div>
          </div>

          <Separator orientation="vertical" className="h-8 mr-4 hidden md:block bg-primary-foreground/20" />

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
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
                <span className="hidden sm:inline">{item.title}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="ml-4 gap-2 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
