import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import elynLogo from '@/assets/elyn-logo.png';

interface MFAChallengeProps {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MFAChallenge({ factorId, onSuccess, onCancel }: MFAChallengeProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Invalid code', description: 'Please check your authenticator app and try again.', variant: 'destructive' });
      setCode('');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <img src={elynLogo} alt="elyn" className="w-16 h-16 mx-auto mb-4 mix-blend-multiply dark:mix-blend-screen" />
        <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Two-Factor Authentication</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code from your authenticator app</p>
      </div>

      <div className="backdrop-blur-xl bg-card/90 border border-border rounded-2xl p-8">
        <form onSubmit={handleVerify} className="space-y-5">
          <div className="space-y-2">
            <Label>Verification Code</Label>
            <Input
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6} autoFocus inputMode="numeric"
            />
          </div>
          <Button type="submit" className="w-full h-12" disabled={loading || code.length !== 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full text-muted-foreground">
            Use a different account
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
