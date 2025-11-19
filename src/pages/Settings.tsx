import { useState, useEffect } from "react";
import { Moon, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentPhoneSetup } from "@/components/AgentPhoneSetup";
import { RoundRobinSettings } from "@/components/RoundRobinSettings";
import { CustomFieldsManager } from "@/components/CustomFieldsManager";
import { TransactionTypesManager } from "@/components/TransactionTypesManager";
import { ProfileSettings } from "@/components/ProfileSettings";
import { TeamManagement } from "@/components/TeamManagement";
import { LeadFieldsManager } from "@/components/LeadFieldsManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

const Settings = () => {
  const { toast } = useToast();
  const { isAdmin, loading } = useUserRole();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [deletingDemoData, setDeletingDemoData] = useState(false);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Dispatch custom event for same-page dark mode changes
    window.dispatchEvent(new Event("darkModeChange"));
  }, [darkMode]);

  const handleDeleteDemoData = async () => {
    setDeletingDemoData(true);
    try {
      // Delete demo leads
      const { error: leadsError } = await supabase
        .from('leads')
        .delete()
        .eq('is_demo_data', true);

      if (leadsError) throw leadsError;

      // Delete demo call logs
      const { error: callLogsError } = await supabase
        .from('call_logs')
        .delete()
        .eq('is_demo_data', true);

      if (callLogsError) throw callLogsError;

      // Delete demo tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('is_demo_data', true);

      if (tasksError) throw tasksError;

      // Delete demo notes
      const { error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('is_demo_data', true);

      if (notesError) throw notesError;

      // Delete demo documents
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('is_demo_data', true);

      if (documentsError) throw documentsError;

      // Delete demo SMS logs
      const { error: smsError } = await supabase
        .from('sms_logs')
        .delete()
        .eq('is_demo_data', true);

      if (smsError) throw smsError;

      // Delete demo inventory
      const { error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .eq('is_demo_data', true);

      if (inventoryError) throw inventoryError;

      toast({
        title: "Demo data deleted",
        description: "All demo data has been removed from your account.",
      });
    } catch (error: any) {
      console.error('Error deleting demo data:', error);
      toast({
        title: "Error",
        description: "Failed to delete demo data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingDemoData(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your CRM settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="w-full" key={isAdmin ? "admin-tabs" : "user-tabs"}>
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="lead-fields">Lead Form</TabsTrigger>}
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

                <div className="pt-6 mt-6 border-t">
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg mb-4">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Delete Demo Data</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        This will permanently delete all demo leads, calls, tasks, and related data. This action cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteDemoData}
                        disabled={deletingDemoData}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingDemoData ? "Deleting..." : "Delete All Demo Data"}
                      </Button>
                    </div>
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
