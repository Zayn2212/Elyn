import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  LogOut,
  User,
  ChevronRight,
  Building2,
  LayoutDashboard,
  Sun,
  Moon,
  FileText,
  Shield,
  Fingerprint,
} from "lucide-react";
import type { CommandCenterState } from "@/hooks/useCommandCenter";
import { SettingsSkeleton } from "./TabSkeletons";
import { useAuth } from "@/hooks/useAuth";
import {
  checkBiometricAvailability,
  disableBiometric,
  enableBiometric,
  getBiometryLabel,
  isBiometricEnabled,
  isBiometricPlatform,
} from "@/services/biometric";

export default function SettingsTab({ s }: { s: CommandCenterState }) {
  const { session } = useAuth();
  const [biometric, setBiometric] = useState<{
    supported: boolean;
    enabled: boolean;
    label: string;
    busy: boolean;
  }>({
    supported: false,
    enabled: false,
    label: "biometrics",
    busy: false,
  });

  useEffect(() => {
    if (!isBiometricPlatform()) return;
    let cancelled = false;
    (async () => {
      const info = await checkBiometricAvailability();
      const enabled = await isBiometricEnabled();
      if (cancelled) return;
      setBiometric({
        supported: info.available,
        enabled,
        label: getBiometryLabel(info.type),
        busy: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBiometricToggle = async () => {
    if (biometric.busy) return;
    if (!biometric.enabled) {
      if (!session) {
        s.showToast("Please sign in first");
        return;
      }
      setBiometric((b) => ({ ...b, busy: true }));
      const ok = await enableBiometric(session);
      setBiometric((b) => ({
        ...b,
        enabled: ok,
        busy: false,
      }));
      s.showToast(
        ok
          ? `${biometric.label.charAt(0).toUpperCase() + biometric.label.slice(1)} sign-in enabled`
          : "Couldn't enable biometrics",
      );
    } else {
      setBiometric((b) => ({ ...b, busy: true }));
      await disableBiometric();
      setBiometric((b) => ({ ...b, enabled: false, busy: false }));
      s.showToast(
        `${biometric.label.charAt(0).toUpperCase() + biometric.label.slice(1)} sign-in disabled`,
      );
    }
  };

  if (s.isLoading) return <SettingsSkeleton />;

  const items = [
    {
      icon: Building2,
      label: "Facilities",
      sub: `${s.facilities.length} hospital${s.facilities.length !== 1 ? "s" : ""} configured`,
      onClick: () => s.setIsManageFacilitiesOpen(true),
    },
    {
      icon: LayoutDashboard,
      label: "Practice Manager",
      sub: "Multi-specialty census & dashboard",
      onClick: () => s.navigate("/practice-manager"),
    },
    {
      icon: User,
      label: "Profile",
      sub: "Name, specialty, NPI",
      onClick: () => s.navigate("/profile"),
    },
    {
      icon: s.theme === "dark" ? Sun : Moon,
      label: "Theme",
      sub: s.theme === "dark" ? "Dark mode" : "Light mode",
      onClick: () => s.setTheme(s.theme === "dark" ? "light" : "dark"),
    },
    {
      icon: FileText,
      label: "Terms of Service",
      sub: "Read our terms and conditions",
      onClick: () => s.navigate("/terms"),
    },
    {
      icon: Shield,
      label: "Privacy Policy",
      sub: "How we handle your data",
      onClick: () => s.navigate("/privacy"),
    },
  ];

  return (
    <>
      <motion.div
        key="settings"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 flex flex-col overflow-hidden"
      >
        <div className="flex-1 px-4 pt-4 pb-4 overflow-y-auto scrollbar-thin">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Profile & Settings
          </h2>
          <div className="space-y-3">
            {items.map((item) => (
              <Button
                key={item.label}
                onClick={item.onClick}
                variant="outline"
                className="w-full justify-between h-14 px-4 rounded-xl border-border hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.sub}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            ))}

            {biometric.supported && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleBiometricToggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleBiometricToggle();
                  }
                }}
                className={`w-full flex items-center justify-between h-14 px-4 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer select-none ${
                  biometric.busy ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium text-foreground">
                      Sign in with {biometric.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {biometric.enabled
                        ? "Enabled on this device"
                        : "Sign in faster with biometrics"}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={biometric.enabled}
                  // No onCheckedChange — the parent row handles the click so a
                  // single tap anywhere on the row toggles the state.
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={handleBiometricToggle}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-4 md:pb-6 border-t border-border bg-background">
          <Button
            onClick={s.signOut}
            variant="outline"
            className="w-full h-12 justify-center text-destructive border-destructive/30 hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <LogOut className="w-5 h-5 mr-2" /> Sign Out
          </Button>
        </div>
      </motion.div>
    </>
  );
}
