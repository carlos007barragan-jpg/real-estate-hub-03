import { useState, useEffect } from "react";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentPhoneSetup } from "@/components/AgentPhoneSetup";
import { RoundRobinSettings } from "@/components/RoundRobinSettings";
import { TransactionTypesManager } from "@/components/TransactionTypesManager";
import { ProfileSettings } from "@/components/ProfileSettings";
import { TeamManagement } from "@/components/TeamManagement";
import { LeadFieldsManager } from "@/components/LeadFieldsManager";
import { WorkflowBuilder } from "@/components/WorkflowBuilder";
import { ContactFieldsManager } from "@/components/ContactFieldsManager";
import { ApiKeysSettings } from "@/components/ApiKeysSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const { toast } = useToast();
  const { isAdmin, role, loading } = useUserRole();
  const isSupremeAdmin = role === "supreme_admin";
  // Supreme admins also pass isAdmin check since has_role treats them as admin
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("darkModeChange"));
  }, [darkMode]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your CRM settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" key={isAdmin ? "admin-tabs" : "user-tabs"}>
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="lead-fields">Lead Form</TabsTrigger>}
          {isSupremeAdmin && <TabsTrigger value="workflows">Workflows</TabsTrigger>}
          {isAdmin && <TabsTrigger value="contact-fields">Contact Form</TabsTrigger>}
          {isAdmin && <TabsTrigger value="public-page">Public Page</TabsTrigger>}
          {isAdmin && <TabsTrigger value="api-keys">API Keys</TabsTrigger>}
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
        </TabsList>

        <TabsContent value="general">
          <div className="space-y-6">
            <AgentPhoneSetup />
            <RoundRobinSettings />
            
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">General Settings</h2>
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" defaultValue="RealEstate CRM" />
                </div>

                <div className="flex items-center justify-between py-3 border-y">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Toggle dark mode for the entire app
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <Switch
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                </div>

              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="lead-fields">
            <LeadFieldsManager />
          </TabsContent>
        )}

        {isSupremeAdmin && (
          <TabsContent value="workflows">
            <WorkflowBuilder />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="contact-fields">
            <ContactFieldsManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="public-page">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Public Property Page</h2>
              <p className="text-muted-foreground mb-4">
                Manage your public-facing property listings page for clients and investors.
              </p>
              <Button onClick={() => window.location.href = '/public-page-settings'}>
                Configure Public Page Settings
              </Button>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="api-keys">
            <ApiKeysSettings />
          </TabsContent>
        )}

        <TabsContent value="notifications">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Notification Settings</h2>
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates for important events
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="space-y-0.5">
                  <Label className="text-base">New Lead Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new leads are added
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="space-y-0.5">
                  <Label className="text-base">Task Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders for upcoming tasks
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="space-y-0.5">
                  <Label className="text-base">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get text messages for urgent updates
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
