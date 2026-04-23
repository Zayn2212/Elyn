import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/admin/AdminLayout";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark",  label: "Dark",  icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function AdminSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <AdminLayout title="Settings" subtitle="Panel preferences">
      <div className="max-w-sm space-y-6">

        {/* Appearance */}
        <div className="glass-card p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred colour scheme.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all",
                    active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
