import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Check,
  Clock,
  Send,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { BillingOutcome } from "@/hooks/useBilling";

interface Bill {
  id: string;
  patientName: string;
  dateOfService: string;
  cptCodes: string[];
  icd10Codes: string[];
  cptDescription?: string;
  rvu?: number;
  status: "pending" | "submitted" | "approved" | "rejected";
  diagnosis?: string;
  facility?: string | null;
  source?: string;
  outcome?: BillingOutcome;
}

interface BillingTableProps {
  bills: Bill[];
  onViewClaimReport: (billId: string) => void;
  onStatusChange: (billId: string, newStatus: string, source?: string) => void;
  onRecordOutcome?: (
    billId: string,
    outcome: BillingOutcome,
    denialReason?: string,
  ) => Promise<boolean> | void;
}

const statusConfig: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  submitted: {
    label: "Submitted",
    icon: Send,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  approved: {
    label: "Approved",
    icon: Check,
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    icon: Clock,
    className: "bg-destructive/10 text-destructive",
  },
};

const outcomeConfig: Record<
  string,
  { label: string; icon: typeof Check; className: string }
> = {
  pending: { label: "—", icon: Clock, className: "text-muted-foreground" },
  approved: { label: "Approved", icon: ThumbsUp, className: "text-success" },
  denied: { label: "Denied", icon: ThumbsDown, className: "text-destructive" },
  partial: {
    label: "Partial",
    icon: AlertTriangle,
    className: "text-amber-500",
  },
};

function OutcomeSelector({
  billId,
  currentOutcome,
  onSelect,
}: {
  billId: string;
  currentOutcome?: BillingOutcome;
  onSelect: (billId: string, outcome: BillingOutcome, reason?: string) => Promise<boolean> | void;
}) {
  const [showDenialInput, setShowDenialInput] = useState(false);
  const [denialReason, setDenialReason] = useState("");
  const [localOutcome, setLocalOutcome] = useState<BillingOutcome | undefined>(currentOutcome);
  const [isRecording, setIsRecording] = useState(false);

  // Sync with props when they change (e.g. after a refetch)
  useEffect(() => {
    setLocalOutcome(currentOutcome);
  }, [currentOutcome]);

  const effectiveOutcome = localOutcome || currentOutcome;

  const handleSelect = async (outcome: BillingOutcome, reason?: string) => {
    setIsRecording(true);
    try {
      const result = await onSelect(billId, outcome, reason);
      if (result !== false) {
        setLocalOutcome(outcome);
      }
    } finally {
      setIsRecording(false);
      setShowDenialInput(false);
    }
  };

  if (showDenialInput) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={denialReason}
          onChange={(e) => setDenialReason(e.target.value)}
          placeholder="Denial reason..."
          className="w-28 px-2 py-1 text-xs bg-background border border-border rounded"
          autoFocus
          disabled={isRecording}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSelect("denied", denialReason);
            }
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1"
          disabled={isRecording}
          onClick={() => {
            handleSelect("denied", denialReason);
          }}
        >
          <Check className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1"
          disabled={isRecording}
          onClick={() => setShowDenialInput(false)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  if (effectiveOutcome && effectiveOutcome !== "pending") {
    const config = outcomeConfig[effectiveOutcome];
    const Icon = config.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          config.className,
        )}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-xs text-success hover:text-success hover:bg-success/10"
        title="Mark Approved"
        disabled={isRecording}
        onClick={() => handleSelect("approved")}
      >
        <ThumbsUp className="w-3 h-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Mark Denied"
        disabled={isRecording}
        onClick={() => setShowDenialInput(true)}
      >
        <ThumbsDown className="w-3 h-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-xs text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
        title="Mark Partial"
        disabled={isRecording}
        onClick={() => handleSelect("partial")}
      >
        <AlertTriangle className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default function BillingTable({
  bills,
  onViewClaimReport,
  onStatusChange,
  onRecordOutcome,
}: BillingTableProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Patient</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">CPT</TableHead>
            <TableHead className="font-semibold">Diagnosis</TableHead>
            <TableHead className="font-semibold text-right">RVU</TableHead>
            <TableHead className="font-semibold">Facility</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Outcome</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill) => {
            const status = statusConfig[bill.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <TableRow key={bill.id} className="group">
                <TableCell className="font-medium">
                  {bill.patientName}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {(() => {
                    try {
                      return format(
                        new Date(bill.dateOfService),
                        "MMM d, yyyy",
                      );
                    } catch {
                      return bill.dateOfService;
                    }
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {bill.cptCodes.map((code, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-secondary/20 text-black/60 text-xs font-medium dark:text-white/70"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {bill.diagnosis || "—"}
                </TableCell>
                <TableCell className="text-right font-bold text-success">
                  {bill.rvu?.toFixed(2) || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {bill.facility || "—"}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      status.className,
                    )}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </TableCell>
                <TableCell>
                  {onRecordOutcome && bill.status === "submitted" ? (
                    <OutcomeSelector
                      billId={bill.id}
                      currentOutcome={bill.outcome}
                      onSelect={onRecordOutcome}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="grid grid-cols-2 gap-1 sm:flex sm:items-center sm:justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {bill.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onStatusChange(bill.id, "submitted", bill.source)
                        }
                        className="h-7 w-7 p-0"
                        title="Submit"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {bill.status === "submitted" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStatusChange(bill.id, "approved", bill.source)}
                          className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success/10"
                          title="Mark as Approved"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStatusChange(bill.id, "rejected", bill.source)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Mark as Rejected"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStatusChange(bill.id, "pending", bill.source)}
                          className="h-7 w-7 p-0"
                          title="Back to Pending"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {bill.status === "rejected" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(bill.id, "pending", bill.source)}
                        className="h-7 w-7 p-0"
                        title="Resubmit (Back to Pending)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewClaimReport(bill.id)}
                      className="h-7 w-7 p-0"
                      title="View Report"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
