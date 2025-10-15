import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadProfile from "./pages/LeadProfile";
import Pipelines from "./pages/Pipelines";
import Contacts from "./pages/Contacts";
import Communications from "./pages/Communications";
import Inbox from "./pages/Inbox";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Initialize dark mode from localStorage on app start
  useEffect(() => {
    const darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Listen for dark mode changes from Settings
    const handleStorageChange = () => {
      const darkMode = localStorage.getItem("darkMode") === "true";
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><Layout><Leads /></Layout></ProtectedRoute>} />
          <Route path="/leads/:id" element={<ProtectedRoute><Layout><LeadProfile /></Layout></ProtectedRoute>} />
          <Route path="/pipelines" element={<ProtectedRoute><Layout><Pipelines /></Layout></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><Layout><Contacts /></Layout></ProtectedRoute>} />
          <Route path="/communications" element={<ProtectedRoute><Layout><Communications /></Layout></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><Layout><Inbox /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
