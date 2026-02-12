import { Mail, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Inbox = () => {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <Badge variant="secondary" className="mb-4">
          <Clock className="h-3 w-3 mr-1" />
          Coming Soon
        </Badge>
        <h1 className="text-2xl font-bold text-foreground mb-2">Inbox</h1>
        <p className="text-muted-foreground">
          Email integration is coming soon. You'll be able to send, receive, and manage conversations directly from your CRM.
        </p>
      </div>
    </div>
  );
};

export default Inbox;
