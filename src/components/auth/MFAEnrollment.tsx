import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Check, QrCode, Trash2 } from 'lucide-react';

export default function MFAEnrollment() {
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadFactors(); }, []);

  const loadFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp || []);
  };

  const startEnrollment = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ELYN Authenticator' });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setEnrolling(false);
    }
  };

  const verifyEnrollment = async () => {
    if (verifyCode.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: verifyCode });
      if (vErr) throw vErr;
      toast({ title: '2FA Enabled', description: 'Your account is now protected with two-factor authentication.' });
      setEnrolling(false); setQrCode(''); setSecret(''); setVerifyCode('');
      loadFactors();
    } catch (error: any) {
      toast({ title: 'Invalid code', description: 'Please try again with a fresh code.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const unenroll = async (id: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      toast({ title: '2FA Removed', description: 'Two-factor authentication has been disabled.' });
      loadFactors();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const verifiedFactors = factors.filter(f => f.status === 'verified');

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border mt-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Two-Factor Authentication
              {verifiedFactors.length > 0 && <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Enabled</Badge>}
            </CardTitle>
            <CardDescription>HIPAA-required MFA for accessing protected health information</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {verifiedFactors.length > 0 && (
          <div className="space-y-2">
            {verifiedFactors.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-foreground">{f.friendly_name || 'Authenticator'}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => unenroll(f.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {enrolling && qrCode ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Scan this QR code with your authenticator app</p>
              <img src={qrCode} alt="QR Code" className="mx-auto rounded-lg border border-border" />
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">Can't scan? Enter manually</summary>
                <code className="block mt-2 p-2 bg-muted rounded text-xs break-all select-all">{secret}</code>
              </details>
            </div>
            <div className="space-y-2">
              <Label>Enter verification code</Label>
              <Input value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" className="text-center text-lg tracking-widest font-mono" maxLength={6} inputMode="numeric" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEnrolling(false); setQrCode(''); }} className="flex-1">Cancel</Button>
              <Button onClick={verifyEnrollment} disabled={loading || verifyCode.length !== 6} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={startEnrollment} variant={verifiedFactors.length > 0 ? 'outline' : 'default'} className="w-full">
            <QrCode className="mr-2 h-4 w-4" />
            {verifiedFactors.length > 0 ? 'Add Another Device' : 'Enable Two-Factor Authentication'}
          </Button>
        )}

        {verifiedFactors.length === 0 && (
          <p className="text-xs text-warning text-center">⚠️ HIPAA requires MFA for accessing patient data. Please enable 2FA.</p>
        )}
      </CardContent>
    </Card>
  );
}
