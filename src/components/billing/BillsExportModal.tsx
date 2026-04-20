import React, { useState, useEffect } from "react";
import { X, FileDown, Printer, CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { UnifiedBill } from "@/hooks/useBilling";
import { CPT_CODES } from "@/data/billingCodes";
import { supabase } from "@/integrations/supabase/client";
import ModalBackdrop from "./ModalBackdrop";
import PrintView from "./PrintView";
import ClaimsReadyPrintReport from "./ClaimsReadyPrintReport";

// CSV Export Utility
const generateCSV = (bills: UnifiedBill[]): string => {
  const headers = [
    "Patient Name",
    "MRN",
    "DOB",
    "Date of Service",
    "Facility",
    "CPT Codes",
    "CPT Description",
    "Modifiers",
    "ICD-10 Codes",
    "RVU",
    "Estimated Value ($)",
    "Status",
    "Provider",
    "Specialty",
    "Created Date",
    "Submitted Date",
  ];

  const escapeCSV = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US");
  };

  const rows = bills.map((bill) => {
    const allCptCodes = bill.cpt_codes.join(", ");
    const allIcd10Codes = bill.icd10_codes.join(" | ");
    const cptDescriptions = bill.cpt_codes
      .map((code) => CPT_CODES[code]?.desc || "")
      .filter(Boolean)
      .join("; ");
    return [
      escapeCSV(bill.patient_name),
      escapeCSV(bill.patient_mrn),
      escapeCSV(bill.patient_dob),
      escapeCSV(bill.note_date || bill.created_at),
      escapeCSV(bill.facility),
      escapeCSV(allCptCodes),
      escapeCSV(cptDescriptions || bill.cpt_description),
      escapeCSV(bill.modifiers?.join(", ") || ""),
      escapeCSV(allIcd10Codes),
      escapeCSV(bill.rvu?.toFixed(2) || "0"),
      escapeCSV(`$${((bill.rvu || 0) * 40).toFixed(2)}`),
      escapeCSV(bill.status === "submitted" ? "Submitted" : "Pending"),
      escapeCSV(bill.provider_name || ""),
      escapeCSV(bill.provider_specialty || ""),
      escapeCSV(formatDate(bill.created_at)),
      escapeCSV(formatDate(bill.submitted_at)),
    ].join(",");
  });

  // Add summary rows
  const totalRVU = bills.reduce((sum, b) => sum + (b.rvu || 0), 0);
  const pendingRVU = bills
    .filter((b) => b.status === "pending")
    .reduce((sum, b) => sum + (b.rvu || 0), 0);
  const submittedRVU = bills
    .filter((b) => b.status === "submitted")
    .reduce((sum, b) => sum + (b.rvu || 0), 0);

  rows.push("");
  rows.push(`SUMMARY,,,,,,,,,,,,,,`);
  rows.push(
    `Total Bills,${bills.length},,,,,,,Total RVU,${totalRVU.toFixed(2)},$${(totalRVU * 40).toFixed(2)},,,,,`,
  );
  rows.push(
    `Pending Bills,${bills.filter((b) => b.status === "pending").length},,,,,,,Pending RVU,${pendingRVU.toFixed(2)},$${(pendingRVU * 40).toFixed(2)},,,,,`,
  );
  rows.push(
    `Submitted Bills,${bills.filter((b) => b.status === "submitted").length},,,,,,,Submitted RVU,${submittedRVU.toFixed(2)},$${(submittedRVU * 40).toFixed(2)},,,,,`,
  );

  return [headers.join(","), ...rows].join("\n");
};

const downloadCSV = (
  bills: UnifiedBill[],
  startDate?: Date,
  endDate?: Date,
) => {
  const csv = generateCSV(bills);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  const dateRange =
    startDate || endDate
      ? `_${startDate ? format(startDate, "yyyy-MM-dd") : "start"}_to_${endDate ? format(endDate, "yyyy-MM-dd") : "end"}`
      : "";
  link.href = url;
  link.download = `ELYN_Billing_Report${dateRange}_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface BillsExportModalProps {
  bills: UnifiedBill[];
  onClose: () => void;
}

export const BillsExportModal = ({ bills, onClose }: BillsExportModalProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "submitted"
  >("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [showPrintView, setShowPrintView] = useState(false);
  const [showClaimsReport, setShowClaimsReport] = useState(false);
  const [providerInfo, setProviderInfo] = useState<{
    name: string;
    npi?: string;
  }>({ name: "" });

  // Fetch provider info for claims report
  useEffect(() => {
    const fetchProvider = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, npi_number")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          setProviderInfo({
            name: profile.full_name || "",
            npi: profile.npi_number || undefined,
          });
        }
      }
    };
    fetchProvider();
  }, []);

  const getFilteredBills = () => {
    let filtered = bills;

    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    if (facilityFilter !== "all") {
      filtered = filtered.filter((b) => b.facility === facilityFilter);
    }

    if (startDate || endDate) {
      filtered = filtered.filter((bill) => {
        const billDate = new Date(bill.created_at);
        if (startDate && billDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (billDate > endOfDay) return false;
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredBills = getFilteredBills();
  const filteredRVU = filteredBills.reduce((sum, b) => sum + (b.rvu || 0), 0);

  const handleExport = () => {
    downloadCSV(filteredBills, startDate, endDate);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("audit_logs").insert({ user_id: user.id, table_name: "bills", action: "SELECT", new_data: { context: "csv_export", bill_count: filteredBills.length } }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });
    });
    onClose();
  };

  const handlePrint = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("audit_logs").insert({ user_id: user.id, table_name: "bills", action: "SELECT", new_data: { context: "print_billing_report", bill_count: filteredBills.length } }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });
    });
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const hasFilters =
    startDate || endDate || statusFilter !== "all" || facilityFilter !== "all";

  const facilities = Array.from(
    new Set(bills.map((b) => b.facility).filter(Boolean)),
  ) as string[];

  if (showClaimsReport) {
    return (
      <ClaimsReadyPrintReport
        bills={filteredBills}
        startDate={startDate}
        endDate={endDate}
        providerName={providerInfo.name}
        providerNPI={providerInfo.npi}
        onClose={() => setShowClaimsReport(false)}
      />
    );
  }

  if (showPrintView) {
    return (
      <PrintView
        bills={filteredBills}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setShowPrintView(false)}
      />
    );
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Export Billing Report
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Status
            </label>
            <div className="flex gap-2">
              {(["all", "pending", "submitted"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm transition-all capitalize",
                    statusFilter === status
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Facility Filter */}
          {facilities.length > 0 && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Facility
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFacilityFilter("all")}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm transition-all",
                    facilityFilter === "all"
                      ? "bg-secondary/20 border-secondary text-secondary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  All Facilities
                </button>
                {facilities.map((facility) => (
                  <button
                    key={facility}
                    onClick={() => setFacilityFilter(facility)}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-sm transition-all",
                      facilityFilter === facility
                        ? "bg-secondary/20 border-secondary text-secondary"
                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {facility}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                End Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setStatusFilter("all");
                setFacilityFilter("all");
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}

          {/* Preview */}
          <div className="glass-surface rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2">
              Export Preview
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {filteredBills.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  bills to export
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-success">
                  {filteredRVU.toFixed(2)} RVU
                </div>
                <div className="text-xs text-muted-foreground">
                  ${(filteredRVU * 40).toFixed(0)} value
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => setShowClaimsReport(true)}
            disabled={filteredBills.length === 0}
            variant="outline"
            className="flex items-center gap-2"
            title="Print claims-ready report with insurance info"
          >
            <FileText className="w-4 h-4" />
            Claims Report
          </Button>
          <Button
            onClick={handlePrint}
            disabled={filteredBills.length === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button
            onClick={handleExport}
            disabled={filteredBills.length === 0}
            className="flex-1 btn-minimal bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </ModalBackdrop>
  );
};

export default BillsExportModal;
