import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BillStatus = "pending" | "submitted" | "approved" | "rejected";

export interface Bill {
  id: string;
  patientName: string;
  dateOfService: string;
  cptCodes: string[];
  icd10Codes: string[];
  cptDescription?: string;
  rvu?: number;
  status: BillStatus;
  diagnosis?: string;
  source?: "note" | "manual";
  facility?: string | null;
}

interface BillCardProps {
  bill: Bill;
  onStatusChange?: (
    billId: string,
    newStatus: BillStatus,
    source?: "note" | "manual",
  ) => void;
  onViewClaimReport?: (billId: string) => void;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  submitted: {
    label: "Submitted",
    icon: FileText,
    className: "bg-info/10 text-info border-info/20",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  rejected: {
    label: "Rejected",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export default function BillCard({
  bill,
  onStatusChange,
  onViewClaimReport,
}: BillCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = statusConfig[bill.status];
  const StatusIcon = statusInfo.icon;
  const hasMultipleCpts = bill.cptCodes.length > 1;

  const handleStatusChange = (newStatus: BillStatus) => {
    if (onStatusChange) {
      onStatusChange(bill.id, newStatus, bill.source);
    }
  };

  return (
    <motion.div className="glass-card overflow-hidden">
      {/* Main Card - Clickable Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer hover:bg-muted/30 transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Bill Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-foreground truncate">
                {bill.patientName}
              </h3>
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border",
                  statusInfo.className,
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(bill.dateOfService).toLocaleDateString()}
              </span>
              {hasMultipleCpts && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Layers className="w-3 h-3" />
                  Multiple CPT codes ({bill.cptCodes.length})
                </span>
              )}
            </div>

            {/* CPT Code Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {bill.cptCodes.map((cpt, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-sm font-mono font-medium"
                >
                  {cpt}
                </span>
              ))}
              {bill.cptDescription && bill.cptCodes.length <= 1 && (
                <span className="text-xs text-muted-foreground truncate">
                  {bill.cptDescription}
                </span>
              )}
            </div>

            {/* ICD-10 codes */}
            {bill.icd10Codes.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                {bill.icd10Codes.join(" | ")}
              </p>
            )}
          </div>

          {/* RVU & Expand */}
          <div className="flex flex-col items-end gap-2">
            {bill.rvu !== undefined && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-lg font-bold text-primary">
                  <DollarSign className="w-4 h-4" />
                  {bill.rvu.toFixed(2)}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  RVU
                </span>
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Diagnosis */}
        {bill.diagnosis && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground truncate">
              {bill.diagnosis}
            </p>
          </div>
        )}
      </div>

      {/* Expanded Actions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="p-4 bg-muted/30 space-y-3">
              {/* Claim Report Button */}
              {onViewClaimReport && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewClaimReport(bill.id);
                  }}
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-9 w-full mb-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Claim Report
                </Button>
              )}

              {/* Status Actions */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Change Status:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {bill.status === "pending" && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange("submitted");
                      }}
                      size="sm"
                      className="col-span-2 rounded-xl h-9 bg-gradient-to-r dark:from-primary dark:to-secondary light:from-purple-600 light:to-indigo-600 text-primary-foreground font-medium"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Mark as Submitted
                    </Button>
                  )}

                  {bill.status === "submitted" && (
                    <>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange("approved");
                        }}
                        size="sm"
                        className="rounded-lg h-8 bg-success hover:bg-success/90 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Approved
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange("rejected");
                        }}
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Rejected
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange("pending");
                        }}
                        size="sm"
                        variant="outline"
                        className="col-span-2 rounded-lg h-8"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Back to Pending
                      </Button>
                    </>
                  )}

                  {bill.status === "approved" && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle className="w-4 h-4" />
                      <span>This bill has been approved</span>
                    </div>
                  )}

                  {bill.status === "rejected" && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange("pending");
                      }}
                      size="sm"
                      variant="outline"
                      className="col-span-2 rounded-lg h-8"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Resubmit (Back to Pending)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
