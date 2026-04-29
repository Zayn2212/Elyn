import { useEffect, useState } from "react";
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
import BiometricLockScreen from "@/components/auth/BiometricLockScreen";
import BiometricEnablePrompt from "@/components/auth/BiometricEnablePrompt";
import { disableBiometric } from "@/services/biometric";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BillingAgent from "./pages/BillingAgent";
import PracticeManager from "./pages/PracticeManager";
import AdminDashboardPage from "./pages/AdminDashboard";
import ProfileSettings from "./pages/ProfileSettings";
import ResetPassword from "./pages/ResetPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import AdminHome from "./pages/admin/AdminHome";
import AdminProviders from "./pages/admin/AdminProviders";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminSettings from "./pages/admin/AdminSettings";
import AcceptInvite from "./pages/AcceptInvite";
const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse">
        <span className="text-3xl font-bold text-primary-foreground">E</span>
      </div>
    </div>
  </div>
);

// Protected Route wrapper — redirects admins to /admin automatically
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  // Admin-created accounts must set a new password before accessing the app
  if (user.user_metadata?.must_reset_password) return <Navigate to="/reset-password?forced=true" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

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
        path="/admin"
        element={
          <AdminRoute>
            <AdminHome />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/providers"
        element={
          <AdminRoute>
            <AdminProviders />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <AdminRoute>
            <AdminAuditLog />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <AdminSettings />
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
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
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

// Idle timeout (ms) after which a backgrounded app re-locks.
// 5 min is a common HIPAA-aligned session idle threshold for healthcare apps.
const BIOMETRIC_IDLE_LOCK_MS = 5 * 60 * 1000;

/**
 * Renders a full-screen biometric lock on native platforms. The lock screen
 * itself decides, on mount, whether there are Keychain creds to unlock against:
 *   - Creds found → prompt biometric → on success, restore the Supabase session.
 *   - No creds    → transparently call onUnlocked so the app flows normally
 *                   (fresh install, or user never enabled biometric).
 *
 * This means the gate doesn't need to know about Supabase session state — even
 * if localStorage was wiped and Supabase's persisted session is gone, the lock
 * screen can still restore the session from the Keychain blob. On cold launch
 * the lock covers the app until a decision is made; a brief flash is fine.
 *
 * Re-lock on resume: after >5 min in the background, we set unlocked=false so
 * the lock screen reappears on next foreground.
 */
const BiometricGate = () => {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let pausedAt: number | null = null;
    const pausePromise = CapApp.addListener("pause", () => {
      pausedAt = Date.now();
    });
    const resumePromise = CapApp.addListener("resume", () => {
      const elapsed = pausedAt ? Date.now() - pausedAt : 0;
      pausedAt = null;
      if (elapsed > BIOMETRIC_IDLE_LOCK_MS) {
        setUnlocked(false);
      }
    });

    return () => {
      pausePromise.then((l) => l.remove());
      resumePromise.then((l) => l.remove());
    };
  }, []);

  if (!Capacitor.isNativePlatform()) return null;
  if (unlocked) return null;

  const handleFallback = async () => {
    // Stored creds may already be wiped (stale-creds path), but call again to be safe.
    await disableBiometric().catch(() => {});
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setUnlocked(true);
  };

  return (
    <BiometricLockScreen
      onUnlocked={() => setUnlocked(true)}
      onFallbackToPassword={handleFallback}
    />
  );
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
                <BiometricEnablePrompt />
                <BiometricGate />
              </FacilityProvider>
            </SyncProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
