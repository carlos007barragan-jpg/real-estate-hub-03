import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import NewLeads from "./pages/NewLeads";
import LeadProfile from "./pages/LeadProfile";
import Pipelines from "./pages/Pipelines";
import Contacts from "./pages/Contacts";
import ContactProfile from "./pages/ContactProfile";
import Inbox from "./pages/Inbox";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CompleteProfile from "./pages/CompleteProfile";
import CalendarPage from "./pages/CalendarPage";
import Inventory from "./pages/Inventory";
import PropertyDetail from "./pages/PropertyDetail";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import OwnerLogin from "./pages/OwnerLogin";
import OwnerSignup from "./pages/OwnerSignup";
import OwnerPortalDashboard from "./pages/OwnerPortalDashboard";
import DispoSheet from "./pages/DispoSheet";
import OwnerManagement from "./pages/OwnerManagement";
import PublicProperties from "./pages/PublicProperties";
import PublicPropertyDetail from "./pages/PublicPropertyDetail";
import PublicPageSettings from "./pages/PublicPageSettings";

const queryClient = new QueryClient();

// Apply dark mode immediately before React renders to prevent flash
const darkMode = localStorage.getItem("darkMode") === "true";
if (darkMode) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

const App = () => {
  // Listen for dark mode changes from Settings
  useEffect(() => {
    const handleStorageChange = () => {
      const darkMode = localStorage.getItem("darkMode") === "true";
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Custom event for same-page dark mode changes
    window.addEventListener("darkModeChange", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("darkModeChange", handleStorageChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            
            {/* Owner Portal Routes */}
            <Route path="/owner-login" element={<OwnerLogin />} />
            <Route path="/owner-signup" element={<OwnerSignup />} />
            <Route path="/owner-portal" element={<ProtectedRoute><OwnerPortalDashboard /></ProtectedRoute>} />
            <Route path="/dispo-sheet" element={<DispoSheet />} />
            
            {/* Public Property Pages */}
            <Route path="/public-properties" element={<PublicProperties />} />
            <Route path="/public-property/:id" element={<PublicPropertyDetail />} />
            
            {/* CRM Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Layout><Leads /></Layout></ProtectedRoute>} />
            <Route path="/new-leads" element={<ProtectedRoute><Layout><NewLeads /></Layout></ProtectedRoute>} />
            <Route path="/leads/:id" element={<ProtectedRoute><Layout><LeadProfile /></Layout></ProtectedRoute>} />
            <Route path="/pipelines" element={<ProtectedRoute><Layout><Pipelines /></Layout></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><Layout><Contacts /></Layout></ProtectedRoute>} />
            <Route path="/contacts/:id" element={<ProtectedRoute><Layout><ContactProfile /></Layout></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Layout><Inbox /></Layout></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
            <Route path="/inventory/:id" element={<ProtectedRoute><Layout><PropertyDetail /></Layout></ProtectedRoute>} />
            <Route path="/owner-management" element={<ProtectedRoute><Layout><OwnerManagement /></Layout></ProtectedRoute>} />
            <Route path="/public-page-settings" element={<ProtectedRoute><Layout><PublicPageSettings /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
