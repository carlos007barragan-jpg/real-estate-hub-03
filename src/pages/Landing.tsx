import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Users, TrendingUp, Shield, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">RealEstate CRM</span>
          </div>
          <Button onClick={() => navigate("/auth")} className="gap-2">
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Manage Your Real Estate Business
            <span className="block text-primary mt-2">All In One Place</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track leads, manage pipelines, and close more deals with our powerful CRM built specifically for real estate professionals.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed for real estate teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Lead Management</h3>
            <p className="text-sm text-muted-foreground">
              Track and nurture leads from first contact to closing
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Pipeline Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Visualize your deals and move them through stages
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-6 w-6 text-info" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Contact Database</h3>
            <p className="text-sm text-muted-foreground">
              Manage all your client relationships in one place
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-warning" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Team Management</h3>
            <p className="text-sm text-muted-foreground">
              Assign leads and track team performance effortlessly
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join hundreds of real estate professionals already using our platform
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/auth")}
            className="gap-2"
          >
            Start Using RealEstate CRM
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 RealEstate CRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
