import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Workers from "./pages/Workers";
import Zakazi from "./pages/Zakazi";
import Zadachi from "./pages/Zadachi";
import Analitika from "./pages/Analitika";
import AutomationSettings from "./pages/AutomationSettings";
import Auth from "./pages/Auth";
import WorkerDashboard from "./pages/WorkerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/worker" element={
              <ProtectedRoute>
                <WorkerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute adminOnly>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute adminOnly>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute adminOnly>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/workers" element={
              <ProtectedRoute adminOnly>
                <Workers />
              </ProtectedRoute>
            } />
            <Route path="/zakazi" element={
              <ProtectedRoute adminOnly>
                <Zakazi />
              </ProtectedRoute>
            } />
            <Route path="/zadachi" element={
              <ProtectedRoute adminOnly>
                <Zadachi />
              </ProtectedRoute>
            } />
            <Route path="/analitika" element={
              <ProtectedRoute adminOnly>
                <Analitika />
              </ProtectedRoute>
            } />
            <Route path="/automation" element={
              <ProtectedRoute adminOnly>
                <AutomationSettings />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
