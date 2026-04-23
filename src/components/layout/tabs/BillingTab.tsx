import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CreditCard, Download, List, BarChart3 } from "lucide-react";
import { PhiExportDialog } from "@/components/ui/phi-export-dialog";
import BillingTable from "@/components/billing/BillingTable";
import BillingAnalyticsDashboard from "@/components/billing/BillingAnalyticsDashboard";
import BillCard from "@/components/billing/BillCard";
import { cn } from "@/lib/utils";
import type { CommandCenterState } from "@/hooks/useCommandCenter";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { BillListSkeleton } from "./TabSkeletons";

const exportBillsToCSV = async (bills: any[]) => {
  const headers = [
    "Patient Name",
    "Date of Service",
    "CPT Codes",
    "ICD-10 Codes",
    "RVU",
    "Status",
    "Facility",
  ];
  const rows = bills.map((b) => [
    b.patientName,
    b.dateOfService,
    b.cptCodes.join(", "),
    b.icd10Codes.join(" | "),
    b.rvu?.toFixed(2) || "0",
    b.status,
    b.facility || "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${c}"`).join(","))
    .join("\n");
  const fileName = `bills-${new Date().toISOString().split("T")[0]}.csv`;

  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: fileName,
      data: csv,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: fileName,
      url: written.uri,
      dialogTitle: "Save bills CSV",
    });
  } else {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export default function BillingTab({ s }: { s: CommandCenterState }) {
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  if (s.billsLoading) return <BillListSkeleton />;

  const statusFilters = [
    { id: "all" as const, label: "All" },
    { id: "pending" as const, label: "Pending" },
    { id: "submitted" as const, label: "Submitted" },
    { id: "approved" as const, label: "Approved" },
  ];

  return (
    <motion.div
      key="bills"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col px-4 pt-4 overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Billing</h2>
          <p className="text-sm text-muted-foreground">
            {s.allBills.length} charges this period
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-0.5 bg-muted/50 rounded-lg">
            <button
              onClick={() => s.setBillingViewMode("list")}
              title="List View"
              className={cn(
                "p-1.5 rounded-md transition-all",
                s.billingViewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => s.setBillingViewMode("analytics")}
              title="Analytics View"
              className={cn(
                "p-1.5 rounded-md transition-all",
                s.billingViewMode === "analytics"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button
            onClick={() => setShowExportConfirm(true)}
            variant="outline"
            size="sm"
            disabled={s.allBills.length === 0}
            className="rounded-lg h-7 px-2 text-xs"
          >
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>

          <PhiExportDialog
            open={showExportConfirm}
            description="This CSV includes patient names, diagnoses, and billing codes. Only download to a HIPAA-compliant, secured device."
            onCancel={() => setShowExportConfirm(false)}
            onConfirm={() => {
              setShowExportConfirm(false);
              exportBillsToCSV(s.allBills).catch((e) => {
                console.error("CSV export failed:", e);
                s.showToast("Export failed: " + (e?.message || e));
              });
            }}
          />
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              ${(s.todayStats.rvu * 35).toFixed(0)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Est. Revenue
            </div>
          </div>
        </div>
      </div>

      {/* Analytics View */}
      {s.billingViewMode === "analytics" &&
        s.isFeatureEnabled("billing_analytics") && (
          <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-4">
            <BillingAnalyticsDashboard
              billingRecords={s.unifiedBills.filter((b) => b.source === "note")}
              manualBills={s.unifiedBills.filter((b) => b.source === "manual")}
            />
          </div>
        )}
      {s.billingViewMode === "analytics" &&
        !s.isFeatureEnabled("billing_analytics") && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Billing analytics has been disabled by your administrator.
            </p>
          </div>
        )}

      {/* List View */}
      {s.billingViewMode === "list" && (
        <>
          {/* Filter Pills */}
          <div className="flex-shrink-0 flex gap-2 mb-4 overflow-x-auto scrollbar-thin pb-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => s.setBillingStatusFilter(filter.id)}
                className={cn(
                  "flex-shrink-0 text-xs sm:text-sm px-2 py-1 rounded-full font-medium transition-all",
                  s.billingStatusFilter === filter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-muted-foreground hover:bg-surface-hover",
                )}
              >
                {filter.label}
                {filter.id !== "all" && (
                  <span className="ml-1.5 text-xs opacity-70">
                    {filter.id === "approved"
                      ? s.facilityFilteredBills.filter((b) => b.outcome === "approved").length
                      : s.facilityFilteredBills.filter((b) => b.status === filter.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block flex-1 overflow-y-auto pb-4">
            <BillingTable
              bills={s.filteredBills}
              onViewClaimReport={(billId) => s.setClaimReportBillId(billId)}
              onStatusChange={async (billId, newStatus, source) => {
                const bill =
                  s.filteredBills.find((b) => b.id === billId) ||
                  s.allBills.find((b) => b.id === billId);
                const componentIds = bill?._componentIds || [
                  { id: billId, source: source || "note" },
                ];

                let allSuccess = true;
                for (const comp of componentIds) {
                  const result = await s.updateBillStatus(
                    comp.id,
                    (comp.source || "note") as any,
                    newStatus as any,
                  );
                  if (!result.success) {
                    allSuccess = false;
                  }
                }

                if (allSuccess) {
                  s.showToast(`Bill marked as ${newStatus}`);
                  s.refetchBills();
                } else s.showToast("Failed to update some bill statuses");
              }}
              onRecordOutcome={async (billId, outcome, denialReason) => {
                const bill = (s.groupedBills.find((b) => b.id === billId) ||
                  s.allBills.find((b) => b.id === billId)) as any;
                if (bill) {
                  const result = await s.recordOutcome(
                    bill,
                    outcome,
                    denialReason,
                  );
                  if (result.success) {
                    s.showToast(`Outcome recorded: ${outcome}`);
                    return true;
                  } else {
                    s.showToast("Failed to record outcome");
                    return false;
                  }
                }
                return false;
              }}
            />
            {s.filteredBills.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {s.billingStatusFilter === "all"
                    ? "No billing records yet"
                    : `No ${s.billingStatusFilter} bills`}
                </p>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex-1 overflow-y-auto space-y-3 pb-20">
            {s.filteredBills.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <BillCard
                  bill={bill}
                  onViewClaimReport={(billId) => s.setClaimReportBillId(billId)}
                  onStatusChange={async (billId, newStatus, source) => {
                    const foundBill =
                      s.filteredBills.find((b) => b.id === billId) ||
                      s.allBills.find((b) => b.id === billId);
                    const componentIds = foundBill?._componentIds || [
                      { id: billId, source: source || "note" },
                    ];

                    let allSuccess = true;
                    for (const comp of componentIds) {
                      const result = await s.updateBillStatus(
                        comp.id,
                        (comp.source || "note") as any,
                        newStatus as any,
                      );
                      if (!result.success) {
                        allSuccess = false;
                      }
                    }

                    if (allSuccess) {
                      s.showToast(`Bill marked as ${newStatus}`);
                      s.refetchBills();
                    } else s.showToast("Failed to update some bill statuses");
                  }}
                />
              </motion.div>
            ))}
            {s.filteredBills.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {s.billingStatusFilter === "all"
                    ? "No billing records yet"
                    : `No ${s.billingStatusFilter} bills`}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
