import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  checkBiometricAvailability,
  getBiometryLabel,
  getStoredBiometricEmail,
  tryBiometricUnlock,
} from "@/services/biometric";
import { BiometryType } from "@aparajita/capacitor-biometric-auth";
import elynLogo from "@/assets/elyn-logo.png";

interface Props {
  onUnlocked: () => void;
  onFallbackToPassword: () => void;
}

/**
 * Full-screen overlay shown when the app is locked behind biometrics.
 * - On mount, immediately prompts the biometric sensor.
 * - If user cancels, they can tap the primary button to retry, or tap the
 *   secondary link to sign out and enter their password.
 */
export default function BiometricLockScreen({
  onUnlocked,
  onFallbackToPassword,
}: Props) {
  const [label, setLabel] = useState("biometrics");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // checking: still deciding whether there's anything to unlock against
  // ready:    creds were found, show the unlock UI
  // passthru: no creds — render nothing while onUnlocked resolves the gate
  const [phase, setPhase] = useState<"checking" | "ready" | "passthru">(
    "checking",
  );

  const attemptUnlock = async () => {
    setBusy(true);
    setError(null);
    const result = await tryBiometricUnlock();
    if (result.ok) {
      onUnlocked();
      return;
    }
    setBusy(false);
    if (result.reason === "stale-creds") {
      setError(
        "Biometric sign-in is no longer valid for this account. Please sign in with your password.",
      );
      // Stale creds have already been wiped inside the service — drop to password.
      setTimeout(onFallbackToPassword, 1200);
      return;
    }
    if (result.reason === "no-creds") {
      // Nothing to unlock — just fall through to password.
      onFallbackToPassword();
      return;
    }
    if (result.reason === "unavailable") {
      setError("Biometric authentication is unavailable on this device.");
      setTimeout(onFallbackToPassword, 1200);
      return;
    }
    // cancelled — stay on screen, let user retry or fall back.
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const info = await checkBiometricAvailability();
      if (cancelled) return;
      setLabel(
        info.type === BiometryType.none
          ? "biometrics"
          : getBiometryLabel(info.type),
      );
      // Check whether there's anything to unlock. If no Keychain creds exist,
      // biometric isn't enabled on this device — pass through instantly so the
      // app's normal auth flow (session restore or /auth) takes over.
      const storedEmail = await getStoredBiometricEmail();
      if (cancelled) return;
      if (!storedEmail) {
        setPhase("passthru");
        onUnlocked();
        return;
      }
      setPhase("ready");
      attemptUnlock();
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally run only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While checking Keychain, render an opaque cover so /auth or Index don't
  // flash through. Once we know there's nothing to unlock, render nothing.
  if (phase === "passthru") return null;
  if (phase === "checking") {
    return <div className="fixed inset-0 z-[9999] bg-background" />;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm text-center"
      >
        <img
          src={elynLogo}
          alt="Elyn"
          className="w-56 h-auto mx-auto mb-10 object-contain mix-blend-multiply dark:mix-blend-screen"
        />

        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          {busy ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Fingerprint className="w-9 h-9 text-primary" />
          )}
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Unlock Elyn
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          Use {label} to continue
        </p>

        {error && (
          <p className="text-xs text-destructive mb-4 leading-relaxed">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <Button
            onClick={attemptUnlock}
            disabled={busy}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Unlock with {label}</>
            )}
          </Button>
          <button
            type="button"
            onClick={onFallbackToPassword}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Use password instead
          </button>
        </div>
      </motion.div>
    </div>
  );
}
