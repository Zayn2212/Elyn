/**
 * Billing Analytics Dashboard
 *
 * Refactored to use extracted analytics hook and chart components
 * for better maintainability and reusability.
 */

import { useState, useMemo } from "react";
import { TrendingUp, DollarSign, FileCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedBill } from "@/hooks/useBilling";
import useBillingAnalytics, {
  TimeRange,
  Granularity,
  BillingDataPoint,
} from "@/hooks/useBillingAnalytics";
import {
  StatCard,
  RvuTrendChart,
  StatusBarChart,
  DistributionPieChart,
  TopCptCodes,
  FacilityPerformance,
  OutcomeMetrics,
} from "./analytics";

interface BillingAnalyticsDashboardProps {
  billingRecords: UnifiedBill[];
  manualBills: UnifiedBill[];
}

export default function BillingAnalyticsDashboard({
  billingRecords,
  manualBills,
}: BillingAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [granularity, setGranularity] = useState<Granularity>("daily");

  // Transform data into unified format for analytics
  const allBillingData = useMemo((): BillingDataPoint[] => {
    const records = billingRecords.map((r) => ({
      id: r.id,
      date: new Date(r.created_at),
      rvu: r.rvu || 0,
      status: r.status || "pending",
      type: "note" as const,
      cptCodes: r.cpt_codes || [],
      facility: r.facility,
    }));

    const billData = manualBills.map((b) => ({
      id: b.id,
      date: new Date(b.created_at),
      rvu: b.rvu || 0,
      status: b.status || "pending",
      type: "manual" as const,
      cptCodes: b.cpt_codes || [],
      facility: b.facility,
    }));

    return [...records, ...billData].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [billingRecords, manualBills]);

  // Use analytics hook for calculations
  const {
    metrics,
    timeSeriesData,
    statusDistribution,
    sourceDistribution,
    topCptCodes,
    facilityData,
  } = useBillingAnalytics(allBillingData, timeRange, granularity);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          {(["7d", "30d", "90d", "all"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                timeRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
              )}
            >
              {range === "7d"
                ? "7 Days"
                : range === "30d"
                  ? "30 Days"
                  : range === "90d"
                    ? "90 Days"
                    : "All Time"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                granularity === g
                  ? "bg-secondary/40 text-primary border border-secondary/30"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total RVU"
          value={metrics.totalRvu.toFixed(1)}
          icon={TrendingUp}
          trend={metrics.rvuChange}
          color="text-primary"
        />
        <StatCard
          title="Est. Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          subValue="@ $40/RVU"
          icon={DollarSign}
          color="text-success"
        />
        <StatCard
          title="Submission Rate"
          value={`${metrics.submissionRate.toFixed(0)}%`}
          subValue={`${metrics.submittedCount} of ${metrics.totalBills}`}
          icon={FileCheck}
        />
        <StatCard
          title="Avg RVU/Bill"
          value={metrics.avgRvuPerBill.toFixed(2)}
          subValue={`${metrics.totalBills} total bills`}
          icon={Clock}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RvuTrendChart data={timeSeriesData} />
        <StatusBarChart data={timeSeriesData} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DistributionPieChart
          title="Status Distribution"
          data={statusDistribution}
          delay={0.3}
        />
        <DistributionPieChart
          title="Billing Source"
          data={sourceDistribution}
          delay={0.4}
        />
        <TopCptCodes data={topCptCodes} />
      </div>

      {/* Facility Analytics */}
      <FacilityPerformance data={facilityData} />

      {/* Billing Outcomes & AI Training Data */}
      <OutcomeMetrics />
    </div>
  );
}
