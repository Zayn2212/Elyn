import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { FacilityProvider } from "@/contexts/FacilityContext";
import { SyncProvider } from "@/contexts/SyncContext";
import AdminRoute from "@/components/auth/AdminRoute";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BillingAgent from "./pages/BillingAgent";
import PracticeManager from "./pages/PracticeManager";
import AdminDashboardPage from "./pages/AdminDashboard";
import ProfileSettings from "./pages/ProfileSettings";
import ResetPassword from "./pages/ResetPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse">
            <span className="text-3xl font-bold text-primary-foreground">
              E
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background isolate overflow-x-hidden">
      {children}
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing-agent"
        element={
          <ProtectedRoute>
            <BillingAgent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/practice-manager"
        element={
          <ProtectedRoute>
            <PracticeManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/audit-log" element={<AuditLog />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const DeepLinkHandler = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener("appUrlOpen", async (event) => {
      // event.url = "com.elyn.aiassistant://auth/callback#access_token=...&refresh_token=..."
      const url = new URL(event.url);
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return null;
};

/**
 * SafeAreaSetup — runs once on mount on native platforms.
 * Sets --safe-top = env(safe-area-inset-top) as a CSS custom property on
 * :root. CSS custom properties evaluate lazily at paint time, so the value
 * is always accurate — no need to probe or poll.
 */
const SafeAreaSetup = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      // Enable edge-to-edge so the WebView gets the full screen
      await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

      const platform = Capacitor.getPlatform();
      
      // Point --safe-top directly at env() with a hard minimum using max(). 
      // The browser evaluates this at paint time so it always reflects the real inset.
      if (platform === 'android') {
        document.documentElement.style.setProperty(
          '--safe-top',
          // To adjust how far down the app starts on Android, change the "50px" below.
          // Increase it (e.g., 60px) to push content further down,
          // Decrease it (e.g., 40px) to move content higher up.
          'max(env(safe-area-inset-top), 50px)'
        );
      } else {
        document.documentElement.style.setProperty(
          '--safe-top',
          'env(safe-area-inset-top, 44px)'
        );
      }
    };

    setup();
  }, []);

  return null;
};

// Visual cover for the iOS notch area (drawn on top, matches background)
const NotchCover = () => {
  if (!Capacitor.isNativePlatform()) return null;
  return <div className="ios-notch-cover" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <SafeAreaSetup />
        <NotchCover />
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <DeepLinkHandler />
          <AuthProvider>
            <SyncProvider>
              <FacilityProvider>
                <AppRoutes />
              </FacilityProvider>
            </SyncProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
