import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ScrollText, Settings, ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

interface QuickStats {
  totalProviders: number;
  totalNotes: number;
  totalAuditEvents: number;
  recentAuditEvents: number; // last 24h
}

const NAV_CARDS = [
  {
    to: "/admin/providers",
    icon: Users,
    label: "Providers",
    description: "Invite, manage roles, ban, or remove accounts.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    live: true,
  },
  {
    to: "/admin/audit-log",
    icon: ScrollText,
    label: "Audit Log",
    description: "Full HIPAA activity trail across all users.",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    live: true,
  },
  {
    to: "/admin/settings",
    icon: Settings,
    label: "Settings",
    description: "Theme and panel preferences.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    live: true,
  },
];

function StatPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-card px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold font-mono text-foreground">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default function AdminHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString();

      const [providersRes, notesRes, auditTotalRes, auditRecentRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("clinical_notes").select("*", { count: "exact", head: true }),
        supabase.from("audit_logs").select("*", { count: "exact", head: true }),
        supabase.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", yesterday),
      ]);

      setStats({
        totalProviders: providersRes.count ?? 0,
        totalNotes: notesRes.count ?? 0,
        totalAuditEvents: auditTotalRes.count ?? 0,
        recentAuditEvents: auditRecentRes.count ?? 0,
      });
      setLoadingStats(false);
    };

    fetchStats();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const adminName = user?.user_metadata?.full_name?.split(" ")[0] ?? "Admin";

  return (
    <AdminLayout title="Dashboard" subtitle="Administration overview">
      <div className="max-w-3xl space-y-6">

        {/* Greeting */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {greeting()}, {adminName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here's a snapshot of your elyn instance.
          </p>
        </div>

        {/* Quick stats */}
        {loadingStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill label="Providers" value={stats.totalProviders} sub="registered" />
            <StatPill label="Notes" value={stats.totalNotes} sub="all time" />
            <StatPill label="Audit Events" value={stats.totalAuditEvents} sub="all time" />
            <StatPill
              label="Activity"
              value={stats.recentAuditEvents}
              sub="last 24 hours"
            />
          </div>
        )}

        {/* Section nav cards */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-0.5">
            Sections
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {NAV_CARDS.map(({ to, icon: Icon, label, description, color, bg, border }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={cn(
                  "glass-card p-4 flex items-center gap-3 text-left w-full group transition-all hover:border-opacity-50",
                  `border ${border}`
                )}
              >
                <div className={cn("p-2 rounded-xl shrink-0", bg)}>
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary/50" />
          <span>All actions in this panel are logged to the audit trail.</span>
        </div>

      </div>
    </AdminLayout>
  );
}
