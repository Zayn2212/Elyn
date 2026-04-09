import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Check,
  X,
  Stethoscope,
} from "lucide-react";
import elynLogo from "@/assets/elyn-logo.png";
import WorkflowDemo from "@/components/auth/WorkflowDemo";
import MFAChallenge from "@/components/auth/MFAChallenge";
import { SPECIALTIES } from "@/data/specialties";

const passwordRequirements = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (p: string) => /[a-z]/.test(p),
  },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
  {
    id: "special",
    label: "One special character (!@#$%^&*)",
    test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
];

const getRedirectUrl = (path: string = "") => {
  if (Capacitor.isNativePlatform()) {
    // Android/iOS: use custom scheme so the OS reopens the app
    return `com.elyn.aiassistant://auth/callback`;
  }
  const base = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${base}${path}`;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string } | null>(
    null,
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordValidation = useMemo(
    () => passwordRequirements.map((r) => ({ ...r, passed: r.test(password) })),
    [password],
  );
  const isPasswordValid = useMemo(
    () => passwordValidation.every((r) => r.passed),
    [passwordValidation],
  );
  const passwordStrength = useMemo(() => {
    const passed = passwordValidation.filter((r) => r.passed).length;
    if (passed === 0) return { label: "", color: "" };
    if (passed <= 2) return { label: "Weak", color: "text-destructive" };
    if (passed <= 4) return { label: "Medium", color: "text-warning" };
    return { label: "Strong", color: "text-green-500" };
  }, [passwordValidation]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) navigate("/");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrl("/reset-password"),
      });
      if (error) throw error;
      toast({
        title: "Check your email",
        description: "A password reset link has been sent to your email.",
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !isPasswordValid) {
      toast({
        title: "Weak Password",
        description: "Please meet all password requirements.",
        variant: "destructive",
      });
      return;
    }
    if (!isLogin && !specialty) {
      toast({
        title: "Specialty Required",
        description: "Please select your specialty.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check for MFA requirement
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors =
          factorsData?.totp?.filter((f) => f.status === "verified") || [];
        if (verifiedFactors.length > 0) {
          // Need MFA verification
          const { data: aal } =
            await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
            setMfaChallenge({ factorId: verifiedFactors[0].id });
            setLoading(false);
            return;
          }
        }
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getRedirectUrl("/"),
            data: { full_name: fullName, specialty },
          },
        });
        if (error) throw error;
        toast({
          title: "Welcome to Elyn!",
          description:
            "Your account has been created successfully. Let's get started!",
        });
      }
    } catch (error: any) {
      let message = error.message;
      if (message?.includes("User already registered"))
        message = "This email is already registered. Please sign in instead.";
      if (message?.includes("Email not confirmed"))
        message =
          "Please verify your email before signing in. Check your inbox for a verification link.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // MFA Challenge Screen
  if (mfaChallenge) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        >
          <source src="/videos/auth-background.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/70" />
        <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
          <MFAChallenge
            factorId={mfaChallenge.factorId}
            onSuccess={() => {
              setMfaChallenge(null);
              navigate("/");
            }}
            onCancel={async () => {
              await supabase.auth.signOut();
              setMfaChallenge(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      >
        <source src="/videos/auth-background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/70" />

      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <motion.div
              className="relative mx-auto mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.img
                src={elynLogo}
                alt="elyn"
                className="w-72 h-auto mx-auto object-contain mix-blend-multiply dark:mix-blend-screen"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
            <motion.p
              className="text-lg text-foreground/80 font-light tracking-[0.12em] mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              From Encounter to Claim. Automatically.
            </motion.p>
            <motion.p
              className="text-sm text-foreground/60 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {isForgotPassword
                ? "Reset your password"
                : isLogin
                  ? "Sign in to your account"
                  : "Create your provider account"}
            </motion.p>
          </div>

          {/* Auth Card */}
          <motion.div
            className="backdrop-blur-xl bg-card/90 border border-border rounded-2xl p-8 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="resetEmail"
                    className="text-foreground/80 text-sm"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="doctor@hospital.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-input border-border text-foreground placeholder:text-foreground/30"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send a password reset link to this email
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send Reset Link <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full text-sm text-foreground/50 hover:text-foreground/80"
                >
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleAuth} className="space-y-5">
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <Label
                        htmlFor="fullName"
                        className="text-foreground/80 text-sm"
                      >
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Dr. John Smith"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10 h-12 bg-input border-border text-foreground placeholder:text-foreground/30"
                          required={!isLogin}
                        />
                      </div>
                    </motion.div>
                  )}
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <Label
                        htmlFor="specialty"
                        className="text-foreground/80 text-sm"
                      >
                        Specialty *
                      </Label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50 z-10" />
                        <Select value={specialty} onValueChange={setSpecialty}>
                          <SelectTrigger className="pl-10 h-12 bg-input border-border text-foreground">
                            <SelectValue placeholder="Select your specialty" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border max-h-60">
                            {SPECIALTIES.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-2">
                                  <s.icon className="h-4 w-4 text-muted-foreground" />
                                  <span>{s.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-foreground/80 text-sm"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="doctor@hospital.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 bg-input border-border text-foreground placeholder:text-foreground/30"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label
                        htmlFor="password"
                        className="text-foreground/80 text-sm"
                      >
                        Password
                      </Label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() =>
                          !isLogin && setShowPasswordRequirements(true)
                        }
                        onBlur={() =>
                          setTimeout(
                            () => setShowPasswordRequirements(false),
                            200,
                          )
                        }
                        className="pl-10 h-12 bg-input border-border text-foreground placeholder:text-foreground/30"
                        required
                        minLength={8}
                      />
                    </div>
                    {!isLogin && password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground/50">
                            Password strength:
                          </span>
                          <span className={passwordStrength.color}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${passwordValidation.filter((r) => r.passed).length <= 2 ? "bg-destructive" : passwordValidation.filter((r) => r.passed).length <= 4 ? "bg-warning" : "bg-green-500"}`}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(passwordValidation.filter((r) => r.passed).length / passwordRequirements.length) * 100}%`,
                            }}
                          />
                        </div>
                        {showPasswordRequirements && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-1 pt-2"
                          >
                            {passwordValidation.map((r) => (
                              <div
                                key={r.id}
                                className={`flex items-center gap-2 text-xs ${r.passed ? "text-green-500" : "text-foreground/40"}`}
                              >
                                {r.passed ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                                <span>{r.label}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold shadow-lg shadow-blue-500/25"
                    disabled={
                      loading ||
                      (!isLogin && !isPasswordValid && password.length > 0)
                    }
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {isLogin ? "Sign In" : "Create Account"}{" "}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setPassword("");
                      setSpecialty("");
                      setShowPasswordRequirements(false);
                    }}
                    className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
                  >
                    {isLogin
                      ? "Don't have an account? "
                      : "Already have an account? "}
                    <span className="text-primary font-medium">
                      {isLogin ? "Sign Up" : "Sign In"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </motion.div>

          <WorkflowDemo />
          <p className="text-center text-xs text-foreground/40 mt-6">
            By continuing, you agree to elyn™'s Terms of Service and Privacy
            Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
