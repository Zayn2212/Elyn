import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowRight, Loader2, Check, X } from "lucide-react";
import elynLogo from "@/assets/elyn-logo.png";

const passwordRequirements = [
  { id: "length",    label: "At least 8 characters",          test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "One uppercase letter",           test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "One lowercase letter",           test: (p: string) => /[a-z]/.test(p) },
  { id: "number",    label: "One number",                     test: (p: string) => /\d/.test(p) },
  { id: "special",   label: "One special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

type PageState = "loading" | "ready" | "invalid";

const AcceptInvite = () => {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validation = useMemo(
    () => passwordRequirements.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );
  const isValid = useMemo(
    () => validation.every((r) => r.passed) && password === confirmPassword,
    [validation, password, confirmPassword]
  );

  useEffect(() => {
    // Supabase processes the invite token from the URL hash automatically on load.
    // It fires a SIGNED_IN event with the invited user session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserName(
          session.user.user_metadata?.full_name ??
          session.user.email ??
          null
        );
        setPageState("ready");
      }
    });

    // Also check if the URL hash contains type=invite (handles page refresh)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") !== "invite" && pageState === "loading") {
      // Give the auth state change listener 2s to fire before showing invalid
      const timer = setTimeout(() => setPageState("invalid"), 2000);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: "Welcome to elyn!",
        description: "Your password has been set. Taking you to the app…",
      });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-primary-foreground">E</span>
          </div>
          <p className="text-sm text-muted-foreground tracking-widest">VERIFYING INVITE…</p>
        </motion.div>
      </div>
    );
  }

  // ── Invalid / expired ──────────────────────────────────────────────────────
  if (pageState === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm">
          <img src={elynLogo} alt="elyn" className="w-20 h-auto mx-auto mb-6 mix-blend-multiply dark:mix-blend-screen" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Invite Link</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This invite link is invalid or has expired. Ask your administrator to send a new invitation.
          </p>
          <Button variant="outline" onClick={() => navigate("/auth")}>Back to Sign In</Button>
        </motion.div>
      </div>
    );
  }

  // ── Set password form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <img
              src={elynLogo}
              alt="elyn"
              className="w-40 h-auto mx-auto mb-6 mix-blend-multiply dark:mix-blend-screen"
            />
            <h1 className="text-xl font-bold text-foreground">
              {userName ? `Welcome, ${userName.split(" ")[0]}` : "Welcome to elyn"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set a password to activate your account
            </p>
          </div>

          {/* Card */}
          <div className="backdrop-blur-xl bg-card/90 border border-border rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-foreground/80">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-input border-border"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoFocus
                  />
                </div>

                {/* Strength indicators */}
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1 pt-1"
                  >
                    {validation.map((r) => (
                      <div
                        key={r.id}
                        className={`flex items-center gap-2 text-xs ${r.passed ? "text-green-500" : "text-foreground/40"}`}
                      >
                        {r.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{r.label}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm text-foreground/80">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 bg-input border-border"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold shadow-lg shadow-blue-500/25"
                disabled={loading || !isValid}
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <> Activate Account <ArrowRight className="ml-2 h-4 w-4" /> </>
                }
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-foreground/40 mt-6">
            elyn™ · Invitation-only access
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AcceptInvite;
