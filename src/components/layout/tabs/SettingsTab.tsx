import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  User,
  ChevronRight,
  Building2,
  LayoutDashboard,
  Sun,
  Moon,
} from "lucide-react";
import type { CommandCenterState } from "@/hooks/useCommandCenter";
import { SettingsSkeleton } from "./TabSkeletons";

export default function SettingsTab({ s }: { s: CommandCenterState }) {
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
  ];

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col overflow-hidden"
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
        </div>
      </div>

      <div className="px-4 py-4 pb-20 md:pb-6 border-t border-border bg-background">
        <Button
          onClick={s.signOut}
          variant="outline"
          className="w-full h-12 justify-center text-destructive border-destructive/30 hover:text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <LogOut className="w-5 h-5 mr-2" /> Sign Out
        </Button>
      </div>
    </motion.div>
  );
}
