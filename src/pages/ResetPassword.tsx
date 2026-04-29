import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, ArrowRight, Loader2, Check, X, ShieldCheck } from 'lucide-react';
import elynLogo from '@/assets/elyn-logo.png';

const passwordRequirements = [
  { id: 'length',    label: 'At least 12 characters',          test: (p: string) => p.length >= 12 },
  { id: 'uppercase', label: 'One uppercase letter',             test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter',             test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number',                       test: (p: string) => /\d/.test(p) },
  { id: 'special',   label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Forced mode: user was created by an admin and must reset their temp password
  const isForced = searchParams.get('forced') === 'true';

  const validation = useMemo(
    () => passwordRequirements.map(r => ({ ...r, passed: r.test(password) })),
    [password],
  );
  const isValid = useMemo(
    () => validation.every(r => r.passed) && password === confirmPassword,
    [validation, password, confirmPassword],
  );

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') setIsRecovery(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        // Clear the forced-reset flag so they won't be redirected again
        data: { must_reset_password: false },
      });
      if (error) throw error;

      toast({
        title: 'Password updated',
        description: 'Your new password has been set. Welcome to Elyn!',
      });

      // Forced resets land back in the app; recovery resets go to sign-in
      navigate(isForced ? '/' : '/auth');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const canShowForm = isForced || isRecovery;

  if (!canShowForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <img src={elynLogo} alt="elyn" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground mb-4">This link is invalid or has expired.</p>
          <Button onClick={() => navigate('/auth')}>Back to Sign In</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={elynLogo} alt="elyn" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">
            {isForced ? 'Set Your Password' : 'Set New Password'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isForced
              ? 'Choose a secure password to complete your account setup'
              : 'Choose a strong password for your account'}
          </p>
        </div>

        {isForced && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-6"
          >
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed">
              Your account was created with a temporary password. You must set a new password before accessing Elyn.
            </p>
          </motion.div>
        )}

        <div className="backdrop-blur-xl bg-card/90 border border-border rounded-2xl p-8">
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  placeholder="••••••••••••"
                  required
                  minLength={12}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12"
                  placeholder="••••••••••••"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {password.length > 0 && (
              <div className="space-y-1.5 rounded-lg bg-muted/60 px-3 py-3">
                {validation.map(r => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 text-xs ${r.passed ? 'text-green-500' : 'text-muted-foreground'}`}
                  >
                    {r.passed ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" className="w-full h-12" disabled={loading || !isValid}>
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <>{isForced ? 'Set Password & Continue' : 'Update Password'} <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
