import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import CampaignDetail from "./pages/CampaignDetail";
import CreateCampaign from "./pages/CreateCampaign";
import Dashboard from "./pages/Dashboard";
import Campaign from "./pages/Campaign";
import ThankYou from "./pages/ThankYou";
import Profile from "./pages/Profile";
import EmailUnsubscribe from './pages/EmailUnsubscribe';
import AdminFinance from "./pages/AdminFinance";
import Analytics from "./pages/Analytics";
import Discover from "./pages/Discover";
import Embed from "./pages/Embed";
import StripeConnect from "./pages/StripeConnect";
import StripeConnectSuccess from "./pages/StripeConnectSuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={
              <ProtectedRoute requireAuth={false}>
                <Auth />
              </ProtectedRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/create-campaign" element={
              <ProtectedRoute>
                <CreateCampaign />
              </ProtectedRoute>
            } />
            
            {/* Public Routes */}
            <Route path="/discover" element={<Discover />} />
            <Route path="/campaign/:slug" element={<CampaignDetail />} />
            <Route path="/campaigns/:slug" element={<Campaign />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/unsubscribe" element={<EmailUnsubscribe />} />
            <Route path="/embed/:slug" element={<Embed />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/admin/finance" element={<AdminFinance />} />
            <Route path="/stripe-connect" element={<StripeConnect />} />
            <Route path="/stripe-connect/success" element={<StripeConnectSuccess />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
