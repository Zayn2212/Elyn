import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { ArrowLeft, RefreshCw, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import elynLogo from "@/assets/elyn-logo.png";
import {
  useAdminDashboard,
  type DatePreset,
  type ProviderMetrics,
} from "@/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import ComplianceReport from "@/components/admin/ComplianceReport";
import FeatureConfiguration from "@/components/admin/FeatureConfiguration";

// ── Sub-components ────────────────────────────────────────────────────────────
function PilotBadge({
  children,
  variant = "blue",
}: {
  children: React.ReactNode;
  variant?: "blue" | "green" | "yellow" | "red" | "purple";
}) {
  const styles: Record<string, string> = {
    blue: "bg-primary/10 text-primary border-primary/20",
    green: "bg-success/10 text-success border-success/20",
    yellow: "bg-warning/10 text-warning border-warning/20",
    red: "bg-destructive/10 text-destructive border-destructive/20",
    purple: "bg-accent/10 text-accent border-accent/20",
  };
  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-medium border",
        styles[variant],
      )}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  unit = "",
  sub,
  color = "text-primary",
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  color?: string;
  icon: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold font-mono", color)}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground font-mono">
            {typeof p.value === "number" && p.value % 1 !== 0
              ? p.value.toFixed(1)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function ProviderRow({ doc, rank }: { doc: ProviderMetrics; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="glass-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
    >
      <span
        className={cn(
          "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0",
          rank <= 3
            ? "bg-primary/20 text-primary"
            : "bg-muted/50 text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {doc.full_name}
        </p>
        <p className="text-xs text-muted-foreground">{doc.specialty}</p>
        {/* Condensed mobile stats */}
        <p className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
          {doc.total_rvu.toFixed(1)} RVU · {doc.note_count} notes ·{" "}
          {doc.bill_count} bills
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-center">
        <div>
          <p className="text-sm font-bold text-foreground">{doc.note_count}</p>
          <p className="text-[10px] text-muted-foreground">notes</p>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{doc.bill_count}</p>
          <p className="text-[10px] text-muted-foreground">bills</p>
        </div>
        <div>
          <p className="text-sm font-bold text-primary">
            {doc.total_rvu.toFixed(1)}
          </p>
          <p className="text-[10px] text-muted-foreground">RVUs</p>
        </div>
      </div>
      <PilotBadge variant={doc.pending_rvu > 0 ? "yellow" : "green"}>
        {doc.pending_rvu > 0
          ? `${doc.pending_rvu.toFixed(1)} pending`
          : "All submitted"}
      </PilotBadge>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card p-12 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Try selecting a different date range
      </p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  const {
    data,
    loading,
    error,
    dateRange,
    setDatePreset,
    refetch,
    exportToCSV,
  } = useAdminDashboard();

  const [filterSpec, setFilterSpec] = useState("All");
  const [sortBy, setSortBy] = useState<
    "total_rvu" | "note_count" | "bill_count"
  >("total_rvu");

  const dateLabel = `${format(dateRange.from, "MMM d")} — ${format(dateRange.to, "MMM d, yyyy")}`;

  const specialties = data
    ? ["All", ...new Set(data.topProviders.map((p) => p.specialty))]
    : ["All"];

  const filteredProviders = data
    ? data.topProviders
        .filter((p) => filterSpec === "All" || p.specialty === filterSpec)
        .sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]))
    : [];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "physicians", label: "Physicians" },
    { id: "billing", label: "Billing & RVU" },
    { id: "compliance", label: "Compliance" },
    { id: "features", label: "Features" },
  ];

  const datePresets: { id: DatePreset; label: string }[] = [
    { id: "this-week", label: "This Week" },
    { id: "last-week", label: "Last Week" },
    { id: "this-month", label: "This Month" },
    { id: "last-month", label: "Last Month" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="glass-card p-3 sm:p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/billing-agent")}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <img
                src={elynLogo}
                alt="elyn"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl mix-blend-multiply dark:mix-blend-screen"
              />
              <div>
                <h1 className="text-lg sm:text-xl font-bold gradient-text">
                  Admin Dashboard
                </h1>
                <p className="text-[10px] text-muted-foreground tracking-widest">
                  {dateLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex overflow-x-auto scrollbar-hide gap-1.5 flex-1">
                {datePresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDatePreset(p.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0",
                      dateRange.preset === p.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={refetch}
                disabled={loading}
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={exportToCSV}
                className="shrink-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex overflow-x-auto scrollbar-hide gap-1 mt-4 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap shrink-0",
                  tab === t.id
                    ? "text-primary border-primary bg-primary/5"
                    : "text-muted-foreground border-transparent hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="glass-card p-4 mb-6 border-l-4 border-l-destructive">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {!loading && !data && !error && (
          <EmptyState message="No data available" />
        )}

        {/* ── OVERVIEW TAB ── */}
        {!loading && data && tab === "overview" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Notes"
                value={data.noteCount}
                icon="📝"
                color="text-primary"
                sub={`${data.summary.total_bills} bills created`}
              />
              <StatCard
                label="Total RVU"
                value={data.summary.total_rvu.toFixed(1)}
                icon="💰"
                color="text-success"
                sub={`$${data.summary.total_value.toLocaleString()} est. revenue`}
              />
              <StatCard
                label="Pending RVU"
                value={data.summary.pending_rvu.toFixed(1)}
                icon="⏳"
                color="text-warning"
                sub={`${data.summary.submitted_rvu.toFixed(1)} submitted`}
              />
              <StatCard
                label="Active Providers"
                value={data.activeProviderCount}
                unit={`/ ${data.providerCount}`}
                icon="👨‍⚕️"
                color="text-success"
                sub={`${data.providerCount} total registered`}
              />
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Daily activity trend */}
              <div className="glass-card p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Daily Activity
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Notes & bills created per day
                </p>
                {data.dailyActivity.length > 0 ? (
                  <div className="h-44 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.dailyActivity}>
                        <defs>
                          <linearGradient
                            id="gradNotes"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="hsl(210 100% 55%)"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="hsl(210 100% 55%)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="gradBills"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="hsl(152 69% 45%)"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="hsl(152 69% 45%)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="[&>line]:stroke-border"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 10,
                          }}
                          tickFormatter={(v) => format(new Date(v), "M/d")}
                        />
                        <YAxis
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="notes"
                          name="Notes"
                          stroke="hsl(210 100% 55%)"
                          fill="url(#gradNotes)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="bills"
                          name="Bills"
                          stroke="hsl(152 69% 45%)"
                          fill="url(#gradBills)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No activity in this period" />
                )}
              </div>

              {/* Specialty breakdown */}
              <div className="glass-card p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Bills by Specialty
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Distribution across providers
                </p>
                {data.bySpecialty.length > 0 ? (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.bySpecialty.map((s) => ({
                              name: s.specialty,
                              value: s.bill_count,
                              color: s.color,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {data.bySpecialty.map((s, i) => (
                              <Cell key={i} fill={s.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => [v, "Bills"]}
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {data.bySpecialty.map((s) => (
                        <div
                          key={s.specialty}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: s.color }}
                            />
                            <span className="text-muted-foreground">
                              {s.specialty}
                            </span>
                          </div>
                          <span className="font-medium font-mono text-foreground">
                            {s.bill_count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState message="No specialty data" />
                )}
              </div>
            </div>

            {/* RVU trend + Facility breakdown */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="glass-card p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  RVU by Day
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Daily relative value units captured
                </p>
                {data.dailyActivity.length > 0 ? (
                  <div className="h-40 sm:h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.dailyActivity}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 10,
                          }}
                          tickFormatter={(v) => format(new Date(v), "M/d")}
                        />
                        <YAxis
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="rvu"
                          name="RVU"
                          fill="hsl(152 69% 45%)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No RVU data" />
                )}
              </div>

              <div className="glass-card p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Top Facilities
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  By total RVU captured
                </p>
                {data.byFacility.length > 0 ? (
                  <div className="space-y-3">
                    {data.byFacility.slice(0, 6).map((f, i) => (
                      <div key={f.facility} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-4">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs">
                            <span className="text-foreground truncate font-medium">
                              {f.facility}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {f.provider_count} providers
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted/30 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(f.total_rvu / (data.byFacility[0]?.total_rvu || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-success font-mono whitespace-nowrap">
                          {f.total_rvu.toFixed(1)} RVU
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No facility data" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PHYSICIANS TAB ── */}
        {!loading && data && tab === "physicians" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Provider Performance
                </h2>
                <p className="text-xs text-muted-foreground">
                  {data.topProviders.length} providers with activity in this
                  period
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterSpec}
                  onChange={(e) => setFilterSpec(e.target.value)}
                  className="bg-muted border border-border text-foreground text-sm rounded-xl px-3 py-2 outline-none"
                >
                  {specialties.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-muted border border-border text-foreground text-sm rounded-xl px-3 py-2 outline-none"
                >
                  <option value="total_rvu">Sort: RVUs</option>
                  <option value="note_count">Sort: Notes</option>
                  <option value="bill_count">Sort: Bills</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Active Providers"
                value={data.activeProviderCount}
                unit={`/ ${data.providerCount}`}
                icon="✅"
                color="text-success"
              />
              <StatCard
                label="Total Notes"
                value={data.noteCount}
                icon="📝"
                color="text-primary"
              />
              <StatCard
                label="Total Bills"
                value={data.summary.total_bills}
                icon="📋"
                color="text-accent"
              />
              <StatCard
                label="Total RVU"
                value={data.summary.total_rvu.toFixed(1)}
                icon="💰"
                color="text-success"
              />
            </div>

            {filteredProviders.length > 0 ? (
              <div className="space-y-2">
                {filteredProviders.map((doc, i) => (
                  <ProviderRow key={doc.user_id} doc={doc} rank={i + 1} />
                ))}
              </div>
            ) : (
              <EmptyState message="No provider data for this period" />
            )}
          </div>
        )}

        {/* ── BILLING TAB ── */}
        {!loading && data && tab === "billing" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Billing & Revenue Intelligence
              </h2>
              <p className="text-xs text-muted-foreground">
                CPT capture, RVU tracking, and denial risk analysis
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total RVU"
                value={data.summary.total_rvu.toFixed(1)}
                icon="💰"
                color="text-success"
              />
              <StatCard
                label="Avg RVU/Bill"
                value={
                  data.summary.total_bills > 0
                    ? (
                        data.summary.total_rvu / data.summary.total_bills
                      ).toFixed(2)
                    : "0"
                }
                icon="📋"
                color="text-primary"
              />
              <StatCard
                label="Denial Risk"
                value={data.avgDenialRisk > 0 ? `${data.avgDenialRisk}` : "N/A"}
                unit={data.avgDenialRisk > 0 ? "%" : ""}
                icon="⚠️"
                color="text-warning"
              />
              <StatCard
                label="CPT Codes"
                value={data.cptCodes.length}
                icon="🏷️"
                color="text-accent"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              {/* RVU trend */}
              <div className="glass-card p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Daily RVU Capture
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Total relative value units billed per day
                </p>
                {data.dailyActivity.length > 0 ? (
                  <div className="h-40 sm:h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.dailyActivity}>
                        <defs>
                          <linearGradient
                            id="gradRvu"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="hsl(152 69% 45%)"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="hsl(152 69% 45%)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 10,
                          }}
                          tickFormatter={(v) => format(new Date(v), "M/d")}
                        />
                        <YAxis
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="rvu"
                          name="RVU"
                          stroke="hsl(152 69% 45%)"
                          fill="url(#gradRvu)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No RVU data" />
                )}
              </div>

              {/* Top CPT codes */}
              <div className="glass-card p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Top CPT Codes
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Most frequently used across all providers
                </p>
                {data.cptCodes.length > 0 ? (
                  <div className="space-y-3">
                    {data.cptCodes.map((cpt) => (
                      <div key={cpt.code} className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono font-bold">
                          {cpt.code}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate">
                              {cpt.code}
                            </span>
                            <span className="text-foreground font-mono ml-2">
                              {cpt.count}x
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted/30 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(cpt.count / (data.cptCodes[0]?.count || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-success font-mono whitespace-nowrap">
                          {cpt.total_rvu.toFixed(1)} RVU
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No CPT data" />
                )}
              </div>
            </div>

            {/* Denial risk chart */}
            {data.denialRisk.length > 0 && (
              <div className="glass-card p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Denial Risk Over Time
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      AI-scored average denial probability
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-muted-foreground">
                      {data.avgDenialRisk}% average
                    </span>
                  </div>
                </div>
                <div className="h-40 sm:h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.denialRisk}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 10,
                        }}
                        tickFormatter={(v) => format(new Date(v), "M/d")}
                      />
                      <YAxis
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 11,
                        }}
                        domain={[0, "auto"]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="avg_risk"
                        name="Risk %"
                        stroke="hsl(0 72% 51%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(0 72% 51%)", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COMPLIANCE TAB ── */}
        {!loading && data && tab === "compliance" && (
          <ComplianceReport auditLogs={data.auditLogs} />
        )}

        {/* ── FEATURES TAB ── */}
        {tab === "features" && <FeatureConfiguration />}
      </div>
    </div>
  );
}
