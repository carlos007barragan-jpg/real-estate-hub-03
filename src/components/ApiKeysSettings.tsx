import { useState, useEffect } from "react";
import { Key, Copy, Plus, Trash2, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApiKey {
  id: string;
  api_key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export const ApiKeysSettings = () => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Default API Key");
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) return;
      setOrganizationId(profile.organization_id);

      const { data, error } = await supabase
        .from("organization_api_keys")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys((data as ApiKey[]) || []);
    } catch (error: any) {
      console.error("Error loading API keys:", error);
      toast({ title: "Error", description: "Failed to load API keys", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!organizationId) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("organization_api_keys")
        .insert({
          organization_id: organizationId,
          name: newKeyName || "Default API Key",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => [data as ApiKey, ...prev]);
      setVisibleKeys(prev => ({ ...prev, [data.id]: true }));
      setNewKeyName("Default API Key");
      toast({ title: "API Key Created", description: "Your new API key has been generated. Copy it now — it won't be shown again in full." });
    } catch (error: any) {
      console.error("Error creating API key:", error);
      toast({ title: "Error", description: error.message || "Failed to create API key", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from("organization_api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast({ title: "API Key Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete API key", variant: "destructive" });
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const maskKey = (key: string) => `${key.slice(0, 8)}${"•".repeat(24)}${key.slice(-8)}`;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading API keys...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Generate API keys to authenticate requests from your external website to this CRM.
            Include the key as an <code className="bg-muted px-1 rounded text-xs">x-api-key</code> header in your requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create new key */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-sm">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Website Integration"
              />
            </div>
            <Button onClick={createApiKey} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Generate Key
            </Button>
          </div>

          {/* Existing keys */}
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Generate one to get started.</p>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{key.name}</span>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <code className="text-xs font-mono text-muted-foreground break-all">
                      {visibleKeys[key.id] ? key.api_key : maskKey(key.api_key)}
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleKeyVisibility(key.id)}>
                      {visibleKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.api_key)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteApiKey(key.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Fetch Properties</p>
            <code className="block text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre">
{`GET /public-properties?organization_id=${organizationId || "<your-org-id>"}
Headers:
  x-api-key: <your-api-key>`}
            </code>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Submit Lead Inquiry</p>
            <code className="block text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre">
{`POST /handle-property-inquiry
Headers:
  Content-Type: application/json
  x-api-key: <your-api-key>
Body:
  { "organizationId": "${organizationId || "<your-org-id>"}", ... }`}
            </code>
          </div>
          {organizationId && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-1">Your Organization ID</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">{organizationId}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(organizationId)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
