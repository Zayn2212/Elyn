import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  checkBiometricAvailability,
  enableBiometric,
  getBiometryLabel,
  getStoredBiometricEmail,
  isBiometricPlatform,
  isBiometricPromptDismissed,
  markBiometricPromptDismissed,
} from "@/services/biometric";
import { BiometryType } from "@aparajita/capacitor-biometric-auth";
import { useToast } from "@/hooks/use-toast";

const SESSION_FLAG = "elyn_offer_biometric";

/**
 * Mount once at the app root. Reads a sessionStorage flag set by Auth.tsx
 * after a fresh successful login and, if conditions are met, shows a one-shot
 * modal offering to enable biometric sign-in.
 *
 * Conditions:
 *   - native platform
 *   - biometric available on device
 *   - not already enabled for the current signed-in email
 *   - user has not previously tapped "Don't ask again" for this email
 */
export default function BiometricEnablePrompt() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("biometrics");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isBiometricPlatform()) return;
    const flag = sessionStorage.getItem(SESSION_FLAG);
    if (!flag) return;
    const email = user?.email;
    if (!email) return;

    let cancelled = false;
    (async () => {
      if (isBiometricPromptDismissed(email)) {
        sessionStorage.removeItem(SESSION_FLAG);
        return;
      }
      const info = await checkBiometricAvailability();
      if (cancelled || !info.available) {
        sessionStorage.removeItem(SESSION_FLAG);
        return;
      }
      // Already enabled for this same user → nothing to do. Keychain presence
      // is our source of truth; if an entry exists for this email, skip the prompt.
      const storedEmail = await getStoredBiometricEmail();
      if (cancelled) return;
      if (storedEmail && storedEmail.toLowerCase() === email.toLowerCase()) {
        sessionStorage.removeItem(SESSION_FLAG);
        return;
      }
      setLabel(getBiometryLabel(info.type));
      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const clearFlag = () => {
    sessionStorage.removeItem(SESSION_FLAG);
  };

  const handleEnable = async () => {
    if (!session) return;
    setBusy(true);
    const ok = await enableBiometric(session);
    setBusy(false);
    if (ok) {
      toast({
        title: "Biometric sign-in enabled",
        description: `You can now sign in using ${label}.`,
      });
      setOpen(false);
      clearFlag();
    } else {
      toast({
        title: "Couldn't enable biometrics",
        description: "Authentication was cancelled or failed. You can try again later from Settings.",
        variant: "destructive",
      });
    }
  };

  const handleNotNow = () => {
    setOpen(false);
    clearFlag();
  };

  const handleNeverAsk = () => {
    if (user?.email) markBiometricPromptDismissed(user.email);
    setOpen(false);
    clearFlag();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="biometric-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="biometric-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[1001] flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Fingerprint className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Enable {label} sign-in?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sign in faster next time using {label}. Your credentials are
                  stored securely on this device and never leave it.
                </p>
              </div>
              <div className="px-5 pb-5 space-y-2">
                <Button
                  onClick={handleEnable}
                  disabled={busy}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold rounded-xl"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Enable {label}</>
                  )}
                </Button>
                <Button
                  onClick={handleNotNow}
                  variant="outline"
                  disabled={busy}
                  className="w-full h-11 rounded-xl"
                >
                  Not now
                </Button>
                <button
                  type="button"
                  onClick={handleNeverAsk}
                  disabled={busy}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Don't ask again
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { SESSION_FLAG as BIOMETRIC_OFFER_FLAG };
