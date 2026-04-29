/**
 * Biometric authentication service.
 *
 * Flow:
 *   - After first successful password login (post-MFA if applicable), we offer to
 *     enable biometric login. On enable we prompt the biometric sensor to confirm
 *     identity, then store the Supabase access + refresh tokens in the OS Keychain
 *     (iOS) / Keystore (Android) via capacitor-secure-storage-plugin.
 *   - On subsequent app launches (cold start, or resume after >5 min background)
 *     we show a lock screen that prompts the biometric sensor. On success we
 *     retrieve the stored tokens and restore the Supabase session.
 *   - The stored tokens are kept fresh: every time Supabase emits a TOKEN_REFRESHED
 *     event we overwrite the stored blob with the new tokens (Supabase rotates the
 *     refresh token by default — stale refresh tokens stop working).
 *
 * Source of truth: the Keychain / Keystore blob. The presence of stored creds IS
 * the "biometric is enabled" signal. We deliberately do NOT rely on a localStorage
 * flag because on iOS the WebView's localStorage can be wiped (Xcode reinstalls,
 * Low Storage eviction, etc.) while the OS Keychain survives — if we relied on a
 * localStorage flag, losing it would force the user back through password login
 * even though the Keychain still has valid tokens. With the Keychain as the only
 * signal, biometric unlock works reliably even when localStorage is nuked.
 *
 * We intentionally do NOT store the user's password. If the refresh token is
 * invalidated (password change elsewhere, revoked session), biometric unlock fails,
 * stored creds are wiped, and the user falls back to the normal password screen.
 *
 * Web platforms: every method is a no-op / returns false. The Settings toggle is
 * hidden on web.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  BiometricAuth,
  BiometryType,
} from "@aparajita/capacitor-biometric-auth";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Tiny native bridge implemented in android/app/src/main/java/.../ThemeModePlugin.java
// Exposes setDarkMode({ dark }) which flips AppCompatDelegate's default night mode
// so subsequent system UI (like BiometricPrompt) renders in the matching theme.
// No-op on iOS (the iOS biometric sheet already follows the system theme).
interface ThemeModePlugin {
  setDarkMode(options: { dark: boolean }): Promise<void>;
}
const ThemeMode = registerPlugin<ThemeModePlugin>("ThemeMode");

const KEY_BIOMETRIC_CREDS = "elyn_biometric_creds";
const LS_DISMISSED_PREFIX = "elyn_biometric_dismissed:";

interface StoredCreds {
  email: string;
  accessToken: string;
  refreshToken: string;
}

export const isBiometricPlatform = (): boolean => Capacitor.isNativePlatform();

export interface BiometryAvailability {
  available: boolean;
  type: BiometryType;
}

export async function checkBiometricAvailability(): Promise<BiometryAvailability> {
  if (!isBiometricPlatform()) {
    return { available: false, type: BiometryType.none };
  }
  try {
    const info = await BiometricAuth.checkBiometry();
    return {
      available: info.isAvailable,
      type: info.biometryType,
    };
  } catch {
    return { available: false, type: BiometryType.none };
  }
}

export function getBiometryLabel(type: BiometryType): string {
  switch (type) {
    case BiometryType.faceId:
      return "Face ID";
    case BiometryType.touchId:
      return "Touch ID";
    case BiometryType.faceAuthentication:
    case BiometryType.fingerprintAuthentication:
    case BiometryType.irisAuthentication:
      return "biometrics";
    default:
      return "biometrics";
  }
}

/**
 * Authoritative async check: is biometric login enabled on this device?
 * Reads the Keychain / Keystore — the single source of truth.
 */
export async function isBiometricEnabled(): Promise<boolean> {
  if (!isBiometricPlatform()) return false;
  const creds = await readCreds();
  return !!creds;
}

export function isBiometricPromptDismissed(email: string): boolean {
  if (!email) return false;
  return (
    localStorage.getItem(LS_DISMISSED_PREFIX + email.toLowerCase()) === "1"
  );
}

export function markBiometricPromptDismissed(email: string): void {
  if (!email) return;
  localStorage.setItem(LS_DISMISSED_PREFIX + email.toLowerCase(), "1");
}

async function authenticate(reason: string): Promise<boolean> {
  if (!isBiometricPlatform()) return false;

  // On Android, sync the BiometricPrompt's light/dark mode with the app theme
  // *before* showing it. The prompt renders with the Activity's night mode,
  // which is toggled by AppCompatDelegate — our ThemeMode native plugin wraps
  // that. Without this, the prompt would use the device OS theme, not the
  // user's in-app theme choice. iOS already follows the system theme.
  if (Capacitor.getPlatform() === "android") {
    try {
      // next-themes resolves "system" → "dark"|"light" and writes it as the
      // root element's class, so this single check covers all three theme
      // choices (dark / light / system).
      const isDark = document.documentElement.classList.contains("dark");
      await ThemeMode.setDarkMode({ dark: isDark });
    } catch {
      // Plugin missing or failed — fall through and let the prompt use the
      // default theme. Not fatal.
    }
  }

  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancel",
      allowDeviceCredential: false,
      iosFallbackTitle: "",
      // Android auto-shows the app name ("Elyn") above the title, so we must
      // NOT set the title to "Elyn" — that would produce "Elyn / Elyn".
      androidTitle: "Biometric authentication",
      // Don't set androidSubtitle: the description (reason) already carries
      // the same information; setting both produces a duplicate line.
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
}

async function writeCreds(creds: StoredCreds): Promise<void> {
  await SecureStoragePlugin.set({
    key: KEY_BIOMETRIC_CREDS,
    value: JSON.stringify(creds),
  });
}

async function readCreds(): Promise<StoredCreds | null> {
  if (!isBiometricPlatform()) return null;
  try {
    const result = await SecureStoragePlugin.get({ key: KEY_BIOMETRIC_CREDS });
    if (!result.value) return null;
    return JSON.parse(result.value) as StoredCreds;
  } catch {
    return null;
  }
}

async function wipeCreds(): Promise<void> {
  try {
    await SecureStoragePlugin.remove({ key: KEY_BIOMETRIC_CREDS });
  } catch {
    // key may not exist
  }
}

export async function getStoredBiometricEmail(): Promise<string | null> {
  const creds = await readCreds();
  return creds?.email ?? null;
}

/**
 * Prompt biometric to confirm identity, then persist the session tokens.
 * Returns true if enabled, false if user cancelled or the session is missing fields.
 */
export async function enableBiometric(session: Session): Promise<boolean> {
  if (!isBiometricPlatform()) return false;
  if (
    !session.access_token ||
    !session.refresh_token ||
    !session.user?.email
  ) {
    return false;
  }

  const ok = await authenticate(
    "Confirm your identity to enable biometric sign-in",
  );
  if (!ok) return false;

  await writeCreds({
    email: session.user.email,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  });
  return true;
}

/**
 * Wipe stored credentials — which also clears the "enabled" signal, since
 * enablement is defined by Keychain presence. Safe to call even when biometric
 * was never enabled.
 */
export async function disableBiometric(): Promise<void> {
  if (isBiometricPlatform()) {
    await wipeCreds();
  }
}

export type BiometricUnlockResult =
  | { ok: true }
  | {
      ok: false;
      reason: "cancelled" | "no-creds" | "stale-creds" | "unavailable";
    };

/**
 * Prompt biometric and restore the Supabase session from stored tokens.
 * On auth failure (e.g. refresh token revoked after a password change elsewhere),
 * stored creds are wiped and the caller should drop the user on the password screen.
 */
export async function tryBiometricUnlock(): Promise<BiometricUnlockResult> {
  if (!isBiometricPlatform()) return { ok: false, reason: "unavailable" };

  const creds = await readCreds();
  if (!creds) return { ok: false, reason: "no-creds" };

  const authed = await authenticate("Unlock Elyn");
  if (!authed) return { ok: false, reason: "cancelled" };

  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: creds.accessToken,
      refresh_token: creds.refreshToken,
    });
    if (error || !data.session) {
      await disableBiometric();
      return { ok: false, reason: "stale-creds" };
    }
    // Supabase rotated the refresh token — persist the new one.
    await writeCreds({
      email: creds.email,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
    return { ok: true };
  } catch {
    await disableBiometric();
    return { ok: false, reason: "stale-creds" };
  }
}

/**
 * Keep stored creds in sync with the current Supabase session. Call this from
 * onAuthStateChange. No-op if biometric is not enabled. Wipes creds if the
 * session's email no longer matches the stored email (guards against a stale
 * Keychain entry belonging to a different user).
 */
export async function syncStoredCredsWithSession(
  session: Session | null,
): Promise<void> {
  if (!isBiometricPlatform()) return;
  if (
    !session?.access_token ||
    !session.refresh_token ||
    !session.user?.email
  ) {
    return;
  }
  const existing = await readCreds();
  if (!existing) return; // biometric not enabled

  if (existing.email.toLowerCase() !== session.user.email.toLowerCase()) {
    await disableBiometric();
    return;
  }

  if (
    existing.accessToken === session.access_token &&
    existing.refreshToken === session.refresh_token
  ) {
    return;
  }

  await writeCreds({
    email: session.user.email,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  });
}
